import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
    private readonly logger = new Logger(ContactService.name);
    private readonly ses: SESv2Client;
    private readonly toEmail: string;
    private readonly fromEmail: string;

    constructor(private config: ConfigService) {
        // SESv2Client uses the ECS task role credentials automatically — no API key needed.
        // The task role in CDK must have ses:SendEmail permission on the verified SES identity.
        this.ses = new SESv2Client({ region: process.env.AWS_REGION ?? 'us-east-1' });

        // These are plain addresses, not secrets — stored as env vars in the CDK task definition.
        // CONTACT_FROM_EMAIL must be a verified SES identity (domain or individual address).
        this.toEmail   = this.config.getOrThrow<string>('CONTACT_TO_EMAIL');
        this.fromEmail = this.config.getOrThrow<string>('CONTACT_FROM_EMAIL');
    }

    async sendContactEmail(contactDto: ContactDto): Promise<void> {
        const command = new SendEmailCommand({
            FromEmailAddress: this.fromEmail,
            Destination: { ToAddresses: [this.toEmail] },
            ReplyToAddresses: [contactDto.email],
            Content: {
                Simple: {
                    Subject: {
                        Data: `[Contact] ${contactDto.subject}`,
                        Charset: 'UTF-8',
                    },
                    Body: {
                        Text: {
                            Data: this.buildPlainMessage(contactDto),
                            Charset: 'UTF-8',
                        },
                        Html: {
                            Data: this.buildHtmlMessage(contactDto),
                            Charset: 'UTF-8',
                        },
                    },
                },
            },
        });

        try {
            await this.ses.send(command);
        } catch (error) {
            this.logger.error('SES send failed:', error);
            throw new InternalServerErrorException('Failed to send contact email');
        }
    }

    private buildPlainMessage(contactDto: ContactDto): string {
        return [
            `From: ${contactDto.name} <${contactDto.email}>`,
            contactDto.orderNumber ? `Order Number: ${contactDto.orderNumber}` : '',
            `Subject: ${contactDto.subject}`,
            '',
            contactDto.message,
        ].filter(Boolean).join('\n');
    }

    private buildHtmlMessage(contactDto: ContactDto): string {
        return [
            `<p><strong>From:</strong> ${contactDto.name} &lt;${contactDto.email}&gt;</p>`,
            contactDto.orderNumber ? `<p><strong>Order Number:</strong> ${contactDto.orderNumber}</p>` : '',
            `<p><strong>Subject:</strong> ${contactDto.subject}</p>`,
            `<p>${contactDto.message}</p>`,
        ].join('');
    }
}
