import * as cdk from 'aws-cdk-lib'; // core CDK types (Stack, Duration, etc.)\
import * as rds from 'aws-cdk-lib/aws-rds'; // RDS managed database service
import * as ec2 from 'aws-cdk-lib/aws-ec2'; // VPC and networking
import { Construct } from 'constructs';

// Define the props this stack expects — extends StackProps so CDK env (account/region) is included
interface SdasDatabaseStackProps extends cdk.StackProps {
    envName: string; // 'test' or 'prod' — controls resource names and instance size
}

export class SdasDatabaseStack extends cdk.Stack {
    // Expose the RDS instance publicly so the backend stack can reference its endpoint
    public readonly cluster: rds.DatabaseInstance; 

    constructor(scope: Construct, id: string, props: SdasDatabaseStackProps) {
        super(scope, id, props);

        // Destructure the environment name from props passed in bin/sdas.ts
        const { envName } = props;

        // Create a VPC (Virtual Private Cloud) — an isolated network for our resources
        // maxAzs: 2 spans two availability zones for redundancy (two data centres in the region)
        // The VPC contains public subnets (ALB), private subnets (ECS, RDS), and NAT Gateways
        const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

        // Create a managed PostgreSQL RDS instance
        // CDK stores the generated admin password in Secrets Manager automatically
        this.cluster = new rds.DatabaseInstance(this, 'Postgres', {
            instanceIdentifier: `sdas-${envName}-postgres`, // unique name in your AWS account
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16, // PostgreSQL version 16
            }),
            // Use a larger instance in prod for performance; micro is enough for test
            instanceType: envName === 'prod'
                ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL) // ~$35/mo
                : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO), // ~$15/mo
            vpc, // place the database inside our VPC (not publicly accessible)
            multiAz: envName === 'prod', // automatic failover in prod only
            deletionProtection: envName === 'prod', // prevent accidental deletion in prod only
            databaseName: 'keycloak', // initial database created on first boot
            // fromGeneratedSecret auto-generates a strong password and stores it in Secrets Manager
            // The username 'keycloak' becomes the DB master user
            credentials: rds.Credentials.fromGeneratedSecret('keycloak'),
        });
    }
}