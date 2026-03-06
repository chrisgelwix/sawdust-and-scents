import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as docdb from 'aws-cdk-lib/aws-docdb';
import { Construct } from 'constructs';

// Define the props this stack expects — extends StackProps so CDK env (account/region) is included
interface SdasDatabaseStackProps extends cdk.StackProps {
    envName: string; // 'test' or 'prod' — controls resource names and instance size
}

export class SdasDatabaseStack extends cdk.Stack {
    // PostgreSQL (RDS) — used by Keycloak and the API's TypeORM entities
    public readonly cluster: rds.DatabaseInstance;
    // DocumentDB — used by the API's Mongoose models (products, subscription plans)
    public readonly docdbCluster: docdb.DatabaseCluster;
    // VPC shared between all resources in this environment
    public readonly vpc: ec2.Vpc;

    constructor(scope: Construct, id: string, props: SdasDatabaseStackProps) {
        super(scope, id, props);

        const { envName } = props;

        // -- VPC --
        // maxAzs: 2 spans two availability zones for redundancy.
        // CDK creates public subnets (for ALBs), private subnets (for ECS + databases),
        // and NAT Gateways so private resources can reach the internet for image pulls etc.
        this.vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

        // ================================================================
        // PostgreSQL — Amazon RDS
        // ================================================================
        // Security group: allow inbound port 5432 from any resource within the VPC.
        // Using a VPC CIDR rule avoids a cyclic cross-stack dependency (the backend stack
        // depends on the database stack, so the database stack must not reference resources
        // that only exist once the backend stack is deployed).
        const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
            vpc: this.vpc,
            description: 'Allow Postgres access from within the VPC',
            allowAllOutbound: true,
        });
        dbSecurityGroup.addIngressRule(
            ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
            ec2.Port.tcp(5432),
            'Allow all VPC resources to connect to Postgres',
        );

        this.cluster = new rds.DatabaseInstance(this, 'Postgres', {
            instanceIdentifier: `sdas-${envName}-postgres`,
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16,
            }),
            instanceType: envName === 'prod'
                ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL)  // ~$35/mo
                : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO), // ~$15/mo
            vpc: this.vpc,
            securityGroups: [dbSecurityGroup],
            multiAz: envName === 'prod',
            deletionProtection: envName === 'prod',
            databaseName: 'keycloak', // initial DB; Keycloak owns this database
            credentials: rds.Credentials.fromGeneratedSecret('keycloak'),
        });

        // ================================================================
        // MongoDB — Amazon DocumentDB
        // ================================================================
        // DocumentDB is MongoDB-compatible (protocol 5.0) and lives inside the same VPC,
        // so the API reaches it with no internet hops and no extra NAT traffic.
        //
        // COST: db.t3.medium = ~$55/month per instance.  One instance is used for test;
        //       two instances (with automatic failover) are used for prod.
        //
        // TLS: disabled in test to keep the Mongoose connection URI simple (no CA cert needed).
        //      Enabled in prod — the API Dockerfile should bundle the Amazon root CA cert
        //      and the MONGO_URI should include ?tls=true&tlsCAFile=/path/to/cert.pem
        //
        // retryWrites: DocumentDB does not support MongoDB's retryable writes — the connection
        //      URI must include retryWrites=false (set in database.module.ts).
        // replicaSet: DocumentDB exposes a MongoDB replica set named 'rs0' — required in URI.

        // Security group: allow inbound port 27017 from within the VPC only.
        const mongoSecurityGroup = new ec2.SecurityGroup(this, 'MongoSecurityGroup', {
            vpc: this.vpc,
            description: 'Allow DocumentDB access from within the VPC',
            allowAllOutbound: true,
        });
        mongoSecurityGroup.addIngressRule(
            ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
            ec2.Port.tcp(27017),
            'Allow all VPC resources to connect to DocumentDB',
        );

        // Cluster parameter group — controls engine-level settings.
        // tls=disabled: the connection string does not need a TLS CA bundle in test.
        // In prod, remove this parameter group (TLS is enabled by default).
        const mongoParamGroup = new docdb.ClusterParameterGroup(this, 'MongoParamGroup', {
            family: 'docdb5.0',
            description: `SDAS ${envName} DocumentDB cluster parameter group`,
            parameters: {
                tls: envName === 'prod' ? 'enabled' : 'disabled',
            },
        });

        this.docdbCluster = new docdb.DatabaseCluster(this, 'MongoDB', {
            dbClusterName:  `sdas-${envName}-mongodb`,
            masterUser: {
                username:          'sdas',
                // Exclude characters that need URL-encoding in a MongoDB connection string.
                // If these appear in the password, the URI would need to be percent-encoded.
                excludeCharacters: '/@"\'\\',
            },
            // db.t3.medium is the smallest available DocumentDB instance type (~$55/mo).
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
            // 1 instance in test (cost); 2 in prod (failover without downtime)
            instances: envName === 'prod' ? 2 : 1,
            vpc: this.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroup: mongoSecurityGroup,
            parameterGroup: mongoParamGroup,
            storageEncrypted: true,
            deletionProtection: envName === 'prod',
            // DESTROY lets `cdk destroy` clean up the cluster in test without manual deletion.
            // RETAIN keeps data safe in prod even if the stack is accidentally deleted.
            removalPolicy: envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
    }
}
