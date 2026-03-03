import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs'; // ECS cluster + task definitions
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns'; // ApplicationLoadBalancedFargateService
import * as ecr from 'aws-cdk-lib/aws-ecr'; // ECR image repositories
import * as rds from 'aws-cdk-lib/aws-rds'; // RDS instance type (for props)
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'; // Secrets Manager lookups
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'; // ALB listener rules
import { Construct } from 'constructs';

// Props this stack expects from bin/sdas.ts
interface SdasBackendStackProps extends cdk.StackProps {
    envName: string;                  // 'test' or 'prod'
    db: rds.DatabaseInstance;         // RDS instance passed in from the database stack
}

export class SdasBackendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: SdasBackendStackProps) {
        super(scope, id, props);

        const {envName, db } = props;

        // Resolve domain suffix based on environment
        // test → test-api.sawdustandscents.com / test-auth.sawdustandscents.com
        // prod → api.sawdustandscents.com / auth.sawdustandscents.com
        const apiDomain = envName === 'prod' ? 'api.sawdustandscents.com' : 'test-api.sawdustandscents.com';
        const authDomain = envName === 'prod' ? 'auth.sawdustandscents.com' : 'test-auth.sawdustandscents.com';

        // Create a single ECS cluster — hosts both the API and Keycloak services
        // A cluster is a logical grouping of Fargate tasks (no EC2 instances to manage)
        const cluster = new ecs.Cluster(this, 'Cluster', {
            clusterName: `sdas-${envName}`, // e.g. sdas-test, sdas-prod
        });

        // -- Secrets Management --
        // Look up the existing secrets stored in AWS Secrets Manager by name
        // fromSecretNameV2 references an EXISTING secret — does NOT create it, just references it
        const keycloakAdminSecret = secretsmanager.Secret.fromSecretNameV2(
            this, 'KeycloakAdminSecret', `sdas/${envName}/keycloak-admin-password`
        );

        const keycloakClientSecret = secretsmanager.Secret.fromSecretNameV2(
            this, 'KeycloakClientSecret', `sdas/${envName}/keycloak-client-secret`
        );

        // The RDS DB credentials — CDK auto-stored these in Secrets Manager when creating the DB
        // secret! is non-null assertion — the secret always exists when CDK generates it
        const dbSecret = db.secret!;

        // -- ECR repositories --
        // Look up the EXISTING ECR repositories 
        // fromRepositoryName references EXISTING repos — does NOT create them
        const apiRepo = ecr.Repository.fromRepositoryName(this, 'ApiRepo', 'sdas/api');
        const keycloakRepo = ecr.Repository.fromRepositoryName(this, 'KeycloakRepo', 'sdas/keycloak');

        // -- Keycloak Fargate service --
        // ApplicationLoadBalancedFargateService creates the task definition, ECS service,
        // and ALB in one construct — it wires everything together automatically
        const keycloakService = new ecsPatterns.ApplicationLoadBalancedFargateService(
            this, 'KeycloakService', {
                cluster,
                // Use the image tag that matches the current environment
                // 'latest' is fine for test; use a pinned SHA tag for prod (more predictable)
                taskImageOptions: {
                    image: ecs.ContainerImage.fromEcrRepository(keycloakRepo, 'latest'),
                    containerPort: 8080, // Keycloak's default HTTP port
                    environment: {
                        // Tell Keycloak to use PostgreSQL (not the embedded H2 dev database)
                        KC_DB: 'postgres',
                        // JDBC connection string using the RDS endpoint CDK resolved for us
                        KC_DB_URL: `jdbc:postgresql://${db.dbInstanceEndpointAddress}/keycloak`,
                        // The public hostname Keycloak uses when building redirect URIs
                        KC_HOSTNAME: authDomain,
                    },
                    secrets: {
                        // Inject DB username/password from Secrets Manager at container startup
                        // ECS fetches these at runtime — they are NEVER baked into the image
                        KC_DB_USERNAME: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
                        KC_DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
                        // Keycloak admin console credentials
                        KEYCLOAK_ADMIN: ecs.Secret.fromSecretsManager(keycloakAdminSecret),
                        KEYCLOAK_ADMIN_PASSWORD: ecs.Secret.fromSecretsManager(keycloakAdminSecret),
                    },
                },
                // 1 task in test (cheaper); 2 in prod (no single point of failure)
                desiredCount: envName === 'prod' ? 2 : 1,
                // 256 CPU units = 0.25 vCPU; 512 MB RAM — sufficient for Keycloak under low load
                cpu:    512,
                memoryLimitMiB: 1024,
                listenerPort: 443,  // ALB listens on HTTPS
                publicLoadBalancer: true,
            }
        );

        // -- API Fargate service --
        // ApplicationLoadBalancedFargateService creates the task definition, ECS service,
        // and ALB in one construct — it wires everything together automatically
        const apiService = new ecsPatterns.ApplicationLoadBalancedFargateService(
            this, 'ApiService', {
                cluster,
                taskImageOptions: {
                    image: ecs.ContainerImage.fromEcrRepository(apiRepo, 'latest'),
                    containerPort: 3000, // NestJS default port
                    environment: {
                        // Non-sensitive config is fine in environment (visible in task definition)
                        KEYCLOAK_URL:   `https://${authDomain}`,  // URL of the Keycloak service
                        KEYCLOAK_REALM: 'sdas-realm',              // realm name
                        NODE_ENV:       'production',              // disables dev-only NestJS features
                        POSTGRES_HOST:  db.dbInstanceEndpointAddress, // RDS hostname
                        POSTGRES_PORT:  db.dbInstanceEndpointPort,
                    },
                    secrets: {
                        // Sensitive values injected at runtime from Secrets Manager
                        POSTGRES_USER:            ecs.Secret.fromSecretsManager(dbSecret, 'username'),
                        POSTGRES_PASSWORD:         ecs.Secret.fromSecretsManager(dbSecret, 'password'),
                        KEYCLOAK_CLIENT_SECRET:    ecs.Secret.fromSecretsManager(keycloakClientSecret),
                    },
                },
                    desiredCount: envName === 'prod' ? 2 : 1,
                    cpu:    256,
                    memoryLimitMiB: 512,
                    listenerPort: 443,
                    publicLoadBalancer: true,
                },
            
        );
           
        // -- ALB path based routing --
        // By default both services get their own ALB. For a shared ALB you would add
        // listener rules here to route /auth/* to Keycloak and everything else to the API.
        // For simplicity each service has its own ALB — the domain names (api.* vs auth.*)
        // handle the routing at the DNS level instead.

        // -- CloudFormation outputs --
        // These values are printed after `cdk deploy` — useful for configuring GitHub Secrets
        
        // The DNS name of the Keycloak ALB — point auth.* CNAME here in Route 53
        new cdk.CfnOutput(this, 'KeycloakAlbDns', {
            value: keycloakService.loadBalancer.loadBalancerDnsName,
        });

        // The DNS name of the API ALB — point api.* CNAME here in Route 53
        new cdk.CfnOutput(this, 'ApiAlbDns', {
            value: apiService.loadBalancer.loadBalancerDnsName,
        });
    }
}