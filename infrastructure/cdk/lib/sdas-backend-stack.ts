import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2'; // VPC — shared with the database stack
import * as ecs from 'aws-cdk-lib/aws-ecs'; // ECS cluster + task definitions
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns'; // ApplicationLoadBalancedFargateService
import * as ecr from 'aws-cdk-lib/aws-ecr'; // ECR image repositories
import * as rds from 'aws-cdk-lib/aws-rds'; // RDS instance type (for props)
import * as docdb from 'aws-cdk-lib/aws-docdb'; // DocumentDB cluster type (for props)
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'; // Secrets Manager lookups
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'; // ALB listener rules
import * as iam from 'aws-cdk-lib/aws-iam'; // IAM for SES permissions
import { Construct } from 'constructs';

// Props this stack expects from bin/sdas.ts
interface SdasBackendStackProps extends cdk.StackProps {
    envName: string;                      // 'test' or 'prod'
    db: rds.DatabaseInstance;             // RDS PostgreSQL — Keycloak + TypeORM entities
    docdbCluster: docdb.DatabaseCluster;  // DocumentDB — Mongoose models (products, subscriptions)
    vpc: ec2.Vpc;                         // Shared VPC — all services must live in the same network
}

export class SdasBackendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: SdasBackendStackProps) {
        super(scope, id, props);

        const { envName, db, docdbCluster, vpc } = props;

        // Resolve domain suffix based on environment
        // test → test-api.sawdustandscents.com / test-auth.sawdustandscents.com
        // prod → api.sawdustandscents.com / auth.sawdustandscents.com
        const apiDomain = envName === 'prod' ? 'api.sawdustandscents.com' : 'test-api.sawdustandscents.com';
        const authDomain = envName === 'prod' ? 'auth.sawdustandscents.com' : 'test-auth.sawdustandscents.com';

        // Create a single ECS cluster — hosts both the API and Keycloak services
        // A cluster is a logical grouping of Fargate tasks (no EC2 instances to manage)
        // vpc is the same VPC used by the RDS instance — MUST be shared so ECS tasks can reach the DB
        const cluster = new ecs.Cluster(this, 'Cluster', {
            clusterName: `sdas-${envName}`, // e.g. sdas-test, sdas-prod
            vpc, // shared VPC — without this CDK creates a separate VPC and ECS can't reach RDS
        });

        // -- Secrets Management --
        // Reference existing Secrets Manager secrets by their FULL ARN (not by name).
        //
        // WHY full ARN and not fromSecretNameV2:
        //   fromSecretNameV2 generates a partial ARN with a -?????? wildcard suffix in the
        //   IAM policy resource.  AWS IAM does NOT treat ? as a single-char wildcard in ARNs
        //   for Secrets Manager — only * is supported — so the policy never matches and ECS
        //   tasks fail with AccessDeniedException at startup.
        //   Using fromSecretCompleteArn gives CDK (and IAM) the exact ARN, which always matches.
        //
        // To find these ARNs:
        //   aws secretsmanager list-secrets --filter Key=name,Values="sdas/test/" --query "SecretList[*].[Name,ARN]"
        const secretArns: Record<string, string> = {
            // test environment — update for prod with the prod ARNs
            'test-keycloak-admin':  'arn:aws:secretsmanager:us-east-1:533267110544:secret:sdas/test/keycloak-admin-password-szsR6P',
            'test-keycloak-client': 'arn:aws:secretsmanager:us-east-1:533267110544:secret:sdas/test/keycloak-client-secret-35ZoFT',
        };
        const prefix = envName === 'prod' ? 'prod' : 'test';

        const keycloakAdminSecret = secretsmanager.Secret.fromSecretCompleteArn(
            this, 'KeycloakAdminSecret', secretArns[`${prefix}-keycloak-admin`]
        );

        const keycloakClientSecret = secretsmanager.Secret.fromSecretCompleteArn(
            this, 'KeycloakClientSecret', secretArns[`${prefix}-keycloak-client`]
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
                        // Admin username — not a secret, just a well-known identifier
                        // The password is the actual secret, injected below via Secrets Manager
                        KEYCLOAK_ADMIN: 'admin',
                        // ALB terminates TLS and forwards plain HTTP to Keycloak on port 8080.
                        // KC_PROXY=edge tells Keycloak to trust X-Forwarded-Proto from the ALB
                        // so redirect URIs are built with https:// instead of http://.
                        KC_PROXY: 'edge',
                        KC_HTTP_ENABLED: 'true',
                        // Allow Keycloak to respond to requests at the ALB's internal DNS name
                        // (used by health checks) as well as the public hostname above.
                        KC_HOSTNAME_STRICT: 'false',
                    },
                    secrets: {
                        // Inject DB username/password from Secrets Manager at container startup
                        // ECS fetches these at runtime — they are NEVER baked into the image
                        KC_DB_USERNAME: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
                        KC_DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
                        // Keycloak admin console password only — the username is set above as a
                        // plain env var. Storing both in the same single-value secret and using
                        // it for the username too would set KEYCLOAK_ADMIN to the password string.
                        KEYCLOAK_ADMIN_PASSWORD: ecs.Secret.fromSecretsManager(keycloakAdminSecret),
                    },
                },
                // 1 task in test (cheaper); 2 in prod (no single point of failure)
                desiredCount: envName === 'prod' ? 2 : 1,
                // 256 CPU units = 0.25 vCPU; 512 MB RAM — sufficient for Keycloak under low load
                cpu:    512,
                memoryLimitMiB: 1024,
                // test: plain HTTP on 80 (no cert needed); prod: HTTPS on 443 (requires ACM cert on the ALB)
                listenerPort: envName === 'prod' ? 443 : 80,
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
                        KEYCLOAK_URL:      envName === 'prod' ? `https://${authDomain}` : `http://${authDomain}`,  // URL of the Keycloak service
                        KEYCLOAK_REALM:    'sdas-realm',             // realm name
                        KEYCLOAK_CLIENT_ID: 'api-client',            // Keycloak client identifier
                        NODE_ENV:          'production',             // disables dev-only NestJS features
                        // PostgreSQL
                        POSTGRES_HOST: db.dbInstanceEndpointAddress, // RDS hostname
                        POSTGRES_PORT: db.dbInstanceEndpointPort,    // RDS port (5432)
                        POSTGRES_DB:   'keycloak',                   // initial DB created by the RDS stack (databaseName: 'keycloak')
                        // MongoDB — DocumentDB endpoint (non-sensitive; the credentials are secrets below)
                        // database.module.ts assembles the full URI from these parts, adding the
                        // DocumentDB-required options: replicaSet=rs0, readPreference=secondaryPreferred,
                        // retryWrites=false (DocumentDB does not support retryable writes).
                        MONGO_HOST: docdbCluster.clusterEndpoint.hostname,
                        MONGO_PORT: docdbCluster.clusterEndpoint.portAsString(),
                        MONGO_DB:   'sawdust_scents',
                        // Email — AWS SES is used; no API key needed. The task role has ses:SendEmail.
                        // Both addresses must be verified in SES (or the domain must be verified).
                        // In SES sandbox mode (default) the TO address must also be verified.
                        // Request SES production access to send to any address.
                        CONTACT_TO_EMAIL:   envName === 'prod' ? 'hello@sawdustandscents.com' : 'chris@sawdustandscents.com',
                        CONTACT_FROM_EMAIL: 'no-reply@sawdustandscents.com',
                    },
                    secrets: {
                        // Sensitive values injected at runtime from Secrets Manager
                        POSTGRES_USER:         ecs.Secret.fromSecretsManager(dbSecret,            'username'),
                        POSTGRES_PASSWORD:     ecs.Secret.fromSecretsManager(dbSecret,            'password'),
                        KEYCLOAK_CLIENT_SECRET: ecs.Secret.fromSecretsManager(keycloakClientSecret),
                        // DocumentDB credentials — CDK auto-generates these and stores them in Secrets Manager
                        MONGO_USER:            ecs.Secret.fromSecretsManager(docdbCluster.secret!, 'username'),
                        MONGO_PASSWORD:        ecs.Secret.fromSecretsManager(docdbCluster.secret!, 'password'),
                    },
                },
                    desiredCount: envName === 'prod' ? 2 : 1,
                    cpu:    256,
                    memoryLimitMiB: 512,
                    // test: plain HTTP on 80 (no cert needed); prod: HTTPS on 443 (requires ACM cert on the ALB)
                    listenerPort: envName === 'prod' ? 443 : 80,
                    publicLoadBalancer: true,
                },
            
        );
           
        // -- Health check paths --
        // Default path is "/" but:
        //   • NestJS API has global prefix "api" so GET / returns 404; GET /api returns 200
        //   • Keycloak 26+ moved /health/ready to the management port (9000); on port 8080
        //     GET /realms/master returns 200 JSON when Keycloak is fully started
        keycloakService.targetGroup.configureHealthCheck({
            path: '/realms/master',
            healthyHttpCodes: '200',
        });
        apiService.targetGroup.configureHealthCheck({
            path: '/api',
            healthyHttpCodes: '200',
        });

        // -- Health check grace period --
        // NestJS needs ~3s to start + time for MongoDB/DocumentDB to accept the first connection.
        // Without a grace period the ALB can mark the task unhealthy before the HTTP server is up.
        // 120 seconds gives the app enough runway on cold start without failing legitimate outages.
        const cfnApiService = apiService.service.node.defaultChild as cdk.CfnResource;
        cfnApiService.addPropertyOverride('HealthCheckGracePeriodSeconds', 120);
        const cfnKeycloakService = keycloakService.service.node.defaultChild as cdk.CfnResource;
        cfnKeycloakService.addPropertyOverride('HealthCheckGracePeriodSeconds', 120);

        // -- SES: allow the API task role to send email via AWS SES --
        // The API uses SESv2Client which signs requests using the ECS task role credentials.
        // No API key or secret is needed — IAM handles authentication.
        // The resource ARN targets the verified SES identity (the sawdustandscents.com domain).
        // If only individual addresses are verified, change the resource to the full address ARN.
        apiService.taskDefinition.taskRole.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: ['ses:SendEmail', 'ses:SendRawEmail'],
                // Scope to the verified domain identity for this account/region.
                // Update the account ID portion if deploying to a different account.
                resources: [
                    `arn:aws:ses:us-east-1:533267110544:identity/sawdustandscents.com`,
                    `arn:aws:ses:us-east-1:533267110544:identity/no-reply@sawdustandscents.com`,
                    `arn:aws:ses:us-east-1:533267110544:identity/chris@sawdustandscents.com`,
                    `arn:aws:ses:us-east-1:533267110544:identity/hello@sawdustandscents.com`,
                ],
            })
        );

        // -- Explicit IAM grants for Secrets Manager --
        // fromSecretNameV2() creates an imported ISecret that does NOT auto-wire the
        // secretsmanager:GetSecretValue permission to the task execution role the way a
        // natively-created Secret would.  Without these grants ECS cannot retrieve the
        // secret values at container startup and the task fails with AccessDeniedException.
        keycloakAdminSecret.grantRead(keycloakService.taskDefinition.executionRole!);
        dbSecret.grantRead(keycloakService.taskDefinition.executionRole!);
        keycloakClientSecret.grantRead(apiService.taskDefinition.executionRole!);
        dbSecret.grantRead(apiService.taskDefinition.executionRole!);
        // DocumentDB credentials — must be readable by the API task execution role
        docdbCluster.secret!.grantRead(apiService.taskDefinition.executionRole!);

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