import * as cdk from 'aws-cdk-lib';
import { SdasFrontendStack } from '../lib/sdas-frontend-stack';
import { SdasBackendStack } from '../lib/sdas-backend-stack';
import { SdasDatabaseStack } from '../lib/sdas-database-stack';
import { SdasDnsStack } from '../lib/sdas-dns-stack';

// Create the root CDK App - this is the container that holds all stacks
const app = new cdk.App();

// Read the target environment from CDK context flags
// Usage: cdk deploy -c env=test  OR  cdk deploy -c env=prod
// Defaults to 'test' if no env flag is provided - prevents accidental prod deploys
const envName = app.node.tryGetContext('env') ?? 'test';

// Resolve the AWS account ID and region from environment variables
// CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION are set automatically by `cdk bootstrap`
const awsEnv = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
};

// Instantiate stacks - order matters: backend needs the DB, frontend needs the DNS zone
// Each stack name includes envName so test and prod stacks never collide (e.g. Sdas-test-Database)
const dbStack = new SdasDatabaseStack(app, `Sdas-${envName}-Database`, { env: awsEnv, envName})
const dnsStack = new SdasDnsStack(app, `Sdas-${envName}-Dns`, { env: awsEnv, envName })

// beStack receives dbStack.cluster (PostgreSQL endpoint), dbStack.docdbCluster (MongoDB endpoint),
// and dbStack.vpc (shared network).  All three must share the same VPC so ECS tasks can reach
// both databases without any internet routing.
const beStack = new SdasBackendStack(app, `Sdas-${envName}-Backend`, {
    env: awsEnv,
    envName,
    db:          dbStack.cluster,
    docdbCluster: dbStack.docdbCluster,
    vpc:         dbStack.vpc,
});

// Frontend receives dnsStack.hostedZone to create Route 53 A records and validate the SSL cert
new SdasFrontendStack(app, `Sdas-${envName}-FrontEnd`, { env: awsEnv, envName, hostedZone: dnsStack.hostedZone });
