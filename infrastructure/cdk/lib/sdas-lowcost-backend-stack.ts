import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface SdasLowCostBackendStackProps extends cdk.StackProps {
  envName: string; // 'test' or 'prod'
  hostedZone: r53.IHostedZone;
}

/**
 * Low-cost backend: single EC2 instance running the API + S3 bucket for uploads.
 * TLS for the API domain is terminated at CloudFront (no ALB required).
 *
 * Intended for low-traffic early-stage environments to avoid:
 * - NAT Gateway
 * - ALB
 * - ECS/Fargate (always-on)
 * - DocumentDB
 */
export class SdasLowCostBackendStack extends cdk.Stack {
  public readonly uploadsBucket: s3.Bucket;
  public readonly instance: ec2.Instance;
  public readonly apiDistribution: cf.Distribution;
  public readonly authDistribution: cf.Distribution;

  constructor(scope: Construct, id: string, props: SdasLowCostBackendStackProps) {
    super(scope, id, props);

    const { envName, hostedZone } = props;

    const apiDomain =
      envName === 'prod' ? 'api.sawdustandscents.com' : 'test-api.sawdustandscents.com';
    const authDomain =
      envName === 'prod' ? 'auth.sawdustandscents.com' : 'test-auth.sawdustandscents.com';

    // Single-AZ, public-only VPC (no NAT)
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // S3 bucket for product images/uploads
    this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: `sdas-${envName}-uploads`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: envName !== 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Secrets (stored in Secrets Manager; instance reads them at boot)
    const postgresSecret = new secretsmanager.Secret(this, 'PostgresSecret', {
      secretName: `sdas/${envName}/postgres`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'sdas' }),
        generateStringKey: 'password',
        excludeCharacters: '/@"\'\\',
      },
    });
    const mongoSecret = new secretsmanager.Secret(this, 'MongoSecret', {
      secretName: `sdas/${envName}/mongo`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'sdas' }),
        generateStringKey: 'password',
        excludeCharacters: '/@"\'\\',
      },
    });
    const keycloakAdminSecret = new secretsmanager.Secret(this, 'KeycloakAdminSecret', {
      secretName: `sdas/${envName}/keycloak-admin`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '/@"\'\\',
      },
    });
    const keycloakClientSecret = new secretsmanager.Secret(this, 'KeycloakClientSecret', {
      secretName: `sdas/${envName}/keycloak-client`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ clientId: 'sdas-web' }),
        generateStringKey: 'clientSecret',
        excludeCharacters: '/@"\'\\',
      },
    });

    const sg = new ec2.SecurityGroup(this, 'ApiInstanceSg', {
      vpc,
      allowAllOutbound: true,
      description: 'EC2 instance running the SDAS API',
    });
    // CloudFront origin fetches over HTTP (viewer is HTTPS). Keep it simple + cheap.
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP (CloudFront origin)');
    // Optional: SSH - locked down by default (no ingress rule); access via SSM recommended.

    const role = new iam.Role(this, 'ApiInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Allow the instance to read ECR images and write to the uploads bucket.
    // NOTE: ECR auth/token calls are account-level; this policy keeps it explicit.
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        resources: ['*'],
      }),
    );
    this.uploadsBucket.grantReadWrite(role);
    postgresSecret.grantRead(role);
    mongoSecret.grantRead(role);
    keycloakAdminSecret.grantRead(role);
    keycloakClientSecret.grantRead(role);

    // Existing ECR repository that holds the API image
    const apiRepo = ecr.Repository.fromRepositoryName(this, 'ApiRepo', 'sdas/api');
    const keycloakRepo = ecr.Repository.fromRepositoryName(this, 'KeycloakRepo', 'sdas/keycloak');

    const machineImage = ec2.MachineImage.latestAmazonLinux2023();

    this.instance = new ec2.Instance(this, 'ApiInstance', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: sg,
      role,
      // t3.micro is the safest default (x86_64). You can switch to t4g.micro later (ARM) if your image supports it.
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage,
    });

    // User-data runs a full low-cost stack on ONE instance:
    // - Postgres (Keycloak + future app relational)
    // - Mongo (products)
    // - Keycloak
    // - API (from ECR)
    // - Nginx reverse proxy (host-based routing: api.* vs auth.*)
    // CloudFront terminates TLS and forwards to nginx over HTTP:80.
    const userData = this.instance.userData;
    userData.addCommands(
      'set -euxo pipefail',
      'dnf update -y',
      'dnf install -y docker nginx awscli docker-compose-plugin',
      'systemctl enable --now docker',
      'systemctl enable --now nginx',
      'mkdir -p /opt/sdas',
      // Nginx: route by Host header to API or Keycloak
      `cat > /etc/nginx/conf.d/sdas.conf <<'EOF'
server {
  listen 80;
  server_name ${apiDomain};

  location / {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_pass http://127.0.0.1:3000;
  }
}

server {
  listen 80;
  server_name ${authDomain};

  location / {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_pass http://127.0.0.1:8080;
  }
}
EOF`,
      'nginx -t',
      'systemctl restart nginx',
      // Fetch secrets once at boot
      `AWS_REGION="${cdk.Stack.of(this).region}"`,
      `ACCOUNT_ID="${cdk.Stack.of(this).account}"`,
      `POSTGRES_SECRET_ID="${postgresSecret.secretArn}"`,
      `MONGO_SECRET_ID="${mongoSecret.secretArn}"`,
      `KC_ADMIN_SECRET_ID="${keycloakAdminSecret.secretArn}"`,
      `KC_CLIENT_SECRET_ID="${keycloakClientSecret.secretArn}"`,
      'POSTGRES_USER=$(aws secretsmanager get-secret-value --secret-id "$POSTGRES_SECRET_ID" --region "$AWS_REGION" --query SecretString --output text | python3 -c "import json,sys; print(json.load(sys.stdin)[\'username\'])")',
      'POSTGRES_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "$POSTGRES_SECRET_ID" --region "$AWS_REGION" --query SecretString --output text | python3 -c "import json,sys; print(json.load(sys.stdin)[\'password\'])")',
      'MONGO_USER=$(aws secretsmanager get-secret-value --secret-id "$MONGO_SECRET_ID" --region "$AWS_REGION" --query SecretString --output text | python3 -c "import json,sys; print(json.load(sys.stdin)[\'username\'])")',
      'MONGO_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "$MONGO_SECRET_ID" --region "$AWS_REGION" --query SecretString --output text | python3 -c "import json,sys; print(json.load(sys.stdin)[\'password\'])")',
      'KC_ADMIN_USER=$(aws secretsmanager get-secret-value --secret-id "$KC_ADMIN_SECRET_ID" --region "$AWS_REGION" --query SecretString --output text | python3 -c "import json,sys; print(json.load(sys.stdin)[\'username\'])")',
      'KC_ADMIN_PASSWORD=$(aws secretsmanager get-secret-value --secret-id "$KC_ADMIN_SECRET_ID" --region "$AWS_REGION" --query SecretString --output text | python3 -c "import json,sys; print(json.load(sys.stdin)[\'password\'])")',
      'KC_CLIENT_ID=$(aws secretsmanager get-secret-value --secret-id "$KC_CLIENT_SECRET_ID" --region "$AWS_REGION" --query SecretString --output text | python3 -c "import json,sys; print(json.load(sys.stdin)[\'clientId\'])")',
      'KC_CLIENT_SECRET=$(aws secretsmanager get-secret-value --secret-id "$KC_CLIENT_SECRET_ID" --region "$AWS_REGION" --query SecretString --output text | python3 -c "import json,sys; print(json.load(sys.stdin)[\'clientSecret\'])")',
      // ECR login and pull images
      'aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"',
      // Pull latest and run (restart always)
      `IMAGE="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${apiRepo.repositoryName}:latest"`,
      `KEYCLOAK_IMAGE="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${keycloakRepo.repositoryName}:latest"`,
      'docker pull "$IMAGE"',
      'docker pull "$KEYCLOAK_IMAGE"',
      // Docker compose file (local DBs + keycloak + api)
      `cat > /opt/sdas/docker-compose.yml <<'EOF'
services:
  postgres:
    image: postgres:16
    container_name: sdas-postgres
    restart: always
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  mongo:
    image: mongo:7
    container_name: sdas-mongo
    restart: always
    environment:
      MONGO_INITDB_DATABASE: sawdust_scents
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_PASSWORD}
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  keycloak:
    image: \${KEYCLOAK_IMAGE}
    container_name: sdas-keycloak
    restart: always
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: \${POSTGRES_USER}
      KC_DB_PASSWORD: \${POSTGRES_PASSWORD}
      KC_HOSTNAME: https://\${AUTH_DOMAIN}
      KC_PROXY_HEADERS: xforwarded
      KC_HTTP_ENABLED: "true"
      KC_HOSTNAME_STRICT: "false"
      KEYCLOAK_ADMIN: \${KC_ADMIN_USER}
      KEYCLOAK_ADMIN_PASSWORD: \${KC_ADMIN_PASSWORD}
    depends_on:
      - postgres
    ports:
      - "8080:8080"

  api:
    image: \${API_IMAGE}
    container_name: sdas-api
    restart: always
    environment:
      NODE_ENV: production
      PORT: "3000"
      # Keycloak
      KEYCLOAK_URL: https://\${AUTH_DOMAIN}
      KEYCLOAK_REALM: sdas-realm
      KEYCLOAK_CLIENT_ID: sdas-api
      KEYCLOAK_CLIENT_SECRET: \${KC_CLIENT_SECRET}
      KEYCLOAK_ADMIN: \${KC_ADMIN_USER}
      KEYCLOAK_ADMIN_PASSWORD: \${KC_ADMIN_PASSWORD}
      # Postgres (local)
      POSTGRES_HOST: postgres
      POSTGRES_PORT: "5432"
      POSTGRES_DB: keycloak
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      # Mongo (local)
      MONGO_HOST: mongo
      MONGO_PORT: "27017"
      MONGO_DB: sawdust_scents
      MONGO_USER: \${MONGO_USER}
      MONGO_PASSWORD: \${MONGO_PASSWORD}
      # Uploads
      UPLOADS_BUCKET: \${UPLOADS_BUCKET}
    depends_on:
      - mongo
      - keycloak
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  mongo_data:
EOF`,
      // env file for compose interpolation
      `cat > /opt/sdas/.env <<'EOF'
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
MONGO_USER=$MONGO_USER
MONGO_PASSWORD=$MONGO_PASSWORD
KC_ADMIN_USER=$KC_ADMIN_USER
KC_ADMIN_PASSWORD=$KC_ADMIN_PASSWORD
KC_CLIENT_SECRET=$KC_CLIENT_SECRET
API_IMAGE=$IMAGE
KEYCLOAK_IMAGE=$KEYCLOAK_IMAGE
UPLOADS_BUCKET=${this.uploadsBucket.bucketName}
AUTH_DOMAIN=${authDomain}
EOF`,
      'cd /opt/sdas',
      'docker compose --env-file ./.env up -d',
    );

    // ACM cert for CloudFront must be us-east-1.
    const apiCert = new acm.DnsValidatedCertificate(this, 'ApiCert', {
      domainName: apiDomain,
      hostedZone,
      region: 'us-east-1',
    });
    const authCert = new acm.DnsValidatedCertificate(this, 'AuthCert', {
      domainName: authDomain,
      hostedZone,
      region: 'us-east-1',
    });

    // CloudFront in front of the EC2 instance provides HTTPS and a stable domain without an ALB.
    this.apiDistribution = new cf.Distribution(this, 'ApiDistribution', {
      domainNames: [apiDomain],
      certificate: apiCert,
      defaultBehavior: {
        origin: new origins.HttpOrigin(this.instance.instancePublicDnsName, {
          protocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY,
        }),
        allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        cachePolicy: cf.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER,
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    this.authDistribution = new cf.Distribution(this, 'AuthDistribution', {
      domainNames: [authDomain],
      certificate: authCert,
      defaultBehavior: {
        origin: new origins.HttpOrigin(this.instance.instancePublicDnsName, {
          protocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY,
        }),
        allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        cachePolicy: cf.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER,
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new r53.ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: apiDomain,
      target: r53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.apiDistribution)),
    });
    new r53.ARecord(this, 'AuthAliasRecord', {
      zone: hostedZone,
      recordName: authDomain,
      target: r53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.authDistribution)),
    });

    new cdk.CfnOutput(this, 'ApiDomain', { value: apiDomain });
    new cdk.CfnOutput(this, 'AuthDomain', { value: authDomain });
    new cdk.CfnOutput(this, 'UploadsBucketName', { value: this.uploadsBucket.bucketName });
    new cdk.CfnOutput(this, 'ApiInstanceId', { value: this.instance.instanceId });
  }
}

