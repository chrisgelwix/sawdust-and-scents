// CDK construct libraries - one import per AWS service
import * as cdk from 'aws-cdk-lib'; // core CDK types (Stack, Duration, etc.)
import * as s3 from 'aws-cdk-lib/aws-s3'; // S3 bucket for storing static files
import * as cf from 'aws-cdk-lib/aws-cloudfront'; // CloudFront CDN distribution
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'; // connects CloudFront to S3
import * as r53 from 'aws-cdk-lib/aws-route53'; // DNS records
import * as targets from 'aws-cdk-lib/aws-route53-targets'; // Route53 alias targets (e.g. CloudFrontTarget)
import * as acm from 'aws-cdk-lib/aws-certificatemanager'; // SSL/TLS certificates
import { Construct } from 'constructs'; // base class for all CDK constructs

// Define the props this stack expects — extends StackProps so CDK env (account/region) is included
interface SdasFrontendStackProps extends cdk.StackProps {
    envName: string;               // 'test' or 'prod' — controls domain names and resource names
    hostedZone: r53.IHostedZone;   // Route 53 hosted zone passed in from the DNS stack
}

export class SdasFrontendStack extends cdk.Stack {
    // Construct: the parent scope (the CDK App)
    // id: unique logical name for this stack within the app
    // props: our typed props defined above
    constructor(scope: Construct, id: string, props: SdasFrontendStackProps) {
        super(scope, id, props);

        // Destructure the environment name and hosted zone passed from bin/sdas.ts
        const { envName, hostedZone } = props;

        // Set the domain based on environment
        // prod gets the apex domain; test gets the test subdomain
        const domainName = envName === 'prod'
            ? 'sawdustandscents.com'
            : 'test.sawdustandscents.com';

        // Create a private S3 bucket to store the built React app files
        // blockPublicAccess.BLOCK_ALL means only CloudFront can read it — not the public internet
        const bucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `sdas-${envName}-frontend`, // unique name across all of AWS
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // no direct public access  
            removalPolicy: cdk.RemovalPolicy.DESTROY, // clean up on stack deletion
        });

        // Request an SSL/TLS certificate from ACM (free, auto-renewing)
        // DnsValidatedCertificate automatically adds validation CNAME records to Route 53
        // IMPORTANT: CloudFront certificates MUST be in us-east-1 regardless of main region
        const cert = new acm.DnsValidatedCertificate(this, 'Cert', {
            domainName, // the domain this cert will secure
            hostedZone, // Route 53 hosted zone used to validate ownership automatically
        });

        // Create the CloudFront distribution — the global CDN that serves the React app
        const distribution = new cf.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(bucket), // serve files from our private S3 bucket
                viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // force HTTPS
            },
            domainNames: [domainName], // the custom domain (not the default *.cloudfront.net URL)
            certificate: cert, // 
            defaultRootObject: 'index.html', // serve index.html when the root URL is requested
            // SPA routing fix — React Router handles URLs like /about and /contact client-side
            // Without this, CloudFront returns a 404 for those paths since the files don't exist in S3
            errorResponses: [{
                httpStatus: 404, // when S3 says the file doesn't exist
                responseHttpStatus: 200, // tell the browser it's actually OK
                responsePagePath: '/index.html', // serve index.html so React Router takes over
            }]
        })

        // Create a Route 53 A record pointing the domain to the CloudFront distribution
        // An Alias record is AWS-specific — it's like a CNAME but works at the zone apex
        new r53.ARecord(this, 'AliasRecord', {
            zone: hostedZone, // the Route 53 hosted zone for sawdustandscents.com
            recordName: domainName, // the specific subdomain or apex to point
            target: r53.RecordTarget.fromAlias(
                new targets.CloudFrontTarget(distribution) // route DNS to this CloudFront dist
            )
        });

        // Output the CloudFront URL after deploy — useful for CI/CD to verify the deployment
        new cdk.CfnOutput(this, 'DistributionUrl', {
            value: distribution.distributionDomainName, // i.e. d1234abcd.cloudfront.net
        })

        // Output the S3 bucket name — CI/CD needs this to upload the built React app files
        new cdk.CfnOutput(this, 'BucketName', {
            value: bucket.bucketName, // i.e. sdas-test-frontend
        })
    }
}