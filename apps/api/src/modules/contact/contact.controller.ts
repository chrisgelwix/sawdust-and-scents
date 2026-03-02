import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post
} from '@nestjs/common';
import {
    ApiOperation,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ContactDto } from './dto/contact.dto';
import { ContactService } from './contact.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) {}

    @Post()
    @Public()                                                        // no JWT required
    @Throttle({ default: { limit: 3, ttl: 60_000 } })               // 3 submissions per minute per IP
    @HttpCode(HttpStatus.NO_CONTENT)                                 // 204 — no body on success
    @ApiOperation({ summary: 'Submit contact form'})
    @ApiResponse({ status: 204, description: 'Message sent successfully' })
    @ApiResponse({ status: 400, description: 'Validation Error' })
    @ApiResponse({ status: 500, description: 'Email send failed' })
    async submit(@Body() contactDto: ContactDto): Promise<void> {
        await this.contactService.sendContactEmail(contactDto);
    }
}