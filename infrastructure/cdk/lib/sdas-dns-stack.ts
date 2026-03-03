import * as cdk from 'aws-cdk-lib';
import * as r53 from 'aws-cdk-lib/aws-route53'; // Route 53 hosted zone and DNS records
import { Construct } from 'constructs';

// Props for the DNS stack — only needs the environment name
interface SdasDnsStackProps extends cdk.StackProps {
    envName: string; // 'test' or 'prod'
}

export class SdasDnsStack extends cdk.Stack {
    // Expose the hosted zone so the frontend and backend stacks can create DNS records in it
    public readonly hostedZone: r53.IHostedZone;

    constructor(scope: Construct, id: string, props: SdasDnsStackProps) {
        super(scope, id, props);

        // Look up the existing Route 53 hosted zone for sawdustandscents.com
        // fromLookup does NOT create a new zone — it finds the one already in your AWS account
        // The hosted zone must already exist (created when you registered the domain or manually)
        this.hostedZone = r53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: 'sawdustandscents.com', // the apex domain — same for both test and prod
        });
    }
}
