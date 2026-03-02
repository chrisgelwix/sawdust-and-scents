import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// @sendgrid/mail is a CommonJS module whose API lives on the default export.
// Using a default import (or require) avoids the "setApiKey is not a function"
// error that occurs when the bundler wraps the namespace and .setApiKey ends
// up on SendGrid.default instead of SendGrid directly.
import SendGrid from '@sendgrid/mail';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
    private readonly logger = new Logger(ContactService.name);

    constructor(private config: ConfigService) {
        SendGrid.setApiKey(this.config.getOrThrow('SENDGRID_API_KEY'));
    }

    async sendContactEmail(contactDto: ContactDto): Promise<void> {
        const toEmail = this.config.getOrThrow<string>('CONTACT_TO_EMAIL');
        const fromEmail = this.config.getOrThrow<string>('CONTACT_FROM_EMAIL');

        const message = {
            to: toEmail,
            from: fromEmail,
            replyTo: contactDto.email,  // replies go directly to the customer
            subject: `[Contact] ${contactDto.subject}`,
            text: this.buildPlainMessage(contactDto),
            html: this.buildHtmlMessage(contactDto),
        };

        try {
            await SendGrid.send(message);
        } catch (error) {
            this.logger.error('Send Failed: ', error);
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
            `<p>From: ${contactDto.name} <${contactDto.email}></p>`,
            contactDto.orderNumber ? `<p>Order Number: ${contactDto.orderNumber}</p>` : '',
            `<p>Subject: ${contactDto.subject}</p>`,
            `<p>${contactDto.message}</p>`,
        ].join('');
    }
}