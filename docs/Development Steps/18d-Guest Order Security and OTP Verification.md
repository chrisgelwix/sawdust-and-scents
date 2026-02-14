# Step 18d: Guest Order Security and OTP Verification

## 1. The Problem: An Open Data Leak

In our current chatbot flow, **anyone** can type an email or phone number into the chat and immediately see order history for that person — with zero verification. This creates two critical security holes:

1. **Impersonation of registered users** — A guest types `chris@example.com` and sees a registered user's full order history without ever logging in.
2. **Impersonation of other guests** — A guest types someone else's email and sees their orders. There is no proof of ownership.

This step addresses both problems in two layers:
- **Layer 1 (Quick Win)**: Block guest lookups for emails/phones that belong to registered users.
- **Layer 2 (OTP Verification)**: Require guests to prove ownership of their email/phone via a one-time passcode before any order data is returned.

---

## 2. Layer 1: Registered User Protection (Quick Win)

### 2.1 The Logic

In `OrdersService.findByContactInfo`, after finding the user, check if they have a `keycloakId`. If they do, they're a registered user — deny the guest lookup and tell them to sign in instead.

### 2.2 Update OrdersService
File: `apps/api/src/modules/orders/orders.service.ts`

**Tutorial Action**:
1. Import `ForbiddenException` from `@nestjs/common`.
2. After finding the user but **before** returning their orders, add the `keycloakId` check.
3. Re-throw `ForbiddenException` in the catch block so it isn't swallowed by `ErrorHandlerService`.

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';

// ... inside OrdersService ...

async findByContactInfo(contactInfo: string): Promise<Order[]> {
  try {
    const user = await this.usersRepository.findOne({
      where: [{ email: contactInfo }, { phoneNumber: contactInfo }],
    });

    if (!user) return [];

    // Security: If this user has a Keycloak account, they must sign in
    // to view their orders — don't expose registered users' data to guests
    if (user.keycloakId) {
      throw new ForbiddenException(
        'This email or phone number is associated with an existing account. Please sign in to view your orders.'
      );
    }

    return this.findByUser(user.id);
  } catch (error) {
    // Re-throw ForbiddenException so it reaches the chatbot/controller
    if (error instanceof ForbiddenException) {
      throw error;
    }
    this.errorService.handleError(error, 'OrdersService.findByContactInfo');
  }
}
```

**Why the re-throw?** Our `ErrorHandlerService.handleError` converts all errors into generic HTTP exceptions. If we don't re-throw the `ForbiddenException` before it hits the catch block, it would get swallowed and turned into an `InternalServerErrorException`. The re-throw ensures our specific, intentional error flows through cleanly.

### 2.3 Update ChatbotService to Handle the Denial
File: `apps/api/src/modules/chatbot/chatbot.service.ts`

**Tutorial Action**:
1. Import `ForbiddenException` from `@nestjs/common`.
2. Wrap the `findByContactInfo` call in a try-catch.
3. If a `ForbiddenException` is caught, return a friendly "please sign in" message.
4. For any other error, return a generic retry message.

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';

// ... inside processMessage, where contactInfo is found ...

if (contactInfo) {
  try {
    const orders = await this.ordersService.findByContactInfo(contactInfo);
    if (orders.length > 0) {
      return { reply: `I found ${orders.length} orders for your account.` };
    } else {
      return { reply: "I couldn't find any orders for that contact information." };
    }
  } catch (error) {
    if (error instanceof ForbiddenException) {
      return {
        reply: 'It looks like that email or phone number is associated with an existing account. ' +
          'Please sign in to view your order history — I can help you once you\'re logged in!'
      };
    }
    return { reply: "Sorry, I wasn't able to look up orders right now. Please try again later." };
  }
}
```

**Key Design Decision**: Notice that we return a chatbot-friendly message instead of throwing the `ForbiddenException` up to the controller. The chatbot should always return a `200 OK` with a `reply` — the user is having a conversation, not triggering an error page.

### 2.4 Test It
Add these tests to `apps/e2e/src/tests/API/chatbot.api.spec.ts`:

```typescript
test('should deny guest order lookup for registered user email', async ({ request }) => {
  const response = await request.post('chatbot/message', {
    data: {
      text: 'Can I check my order status? My email is chrisgelwix@gmail.com'
    }
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  // Should tell the guest to sign in instead of exposing order data
  expect(data.reply.toLowerCase()).toContain('sign in');
});

test('should allow guest order lookup for non-registered contact', async ({ request }) => {
  const response = await request.post('chatbot/message', {
    data: {
      text: 'What is my order status? My email is guest-shopper@example.com'
    }
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  // Should NOT tell them to sign in — just report no orders found
  expect(data.reply.toLowerCase()).not.toContain('sign in');
});
```

---

## 3. Layer 2: OTP Verification for Guest Order Lookups

Layer 1 prevents guests from snooping on registered users. But what about guest-on-guest? Right now, if Alice (a guest) types Bob's email (also a guest), she can see Bob's orders. We need **proof of ownership** before showing any order data.

### 3.1 How the OTP Flow Works

Here's the conversation flow with Rowan:

```
Guest:  "I'd like to check my order. My email is alice@example.com"
Rowan:  "For your security, I've sent a 6-digit verification code to a***@example.com.
         Please share the code to continue."
         [System generates OTP, sends email]
Guest:  "The code is 482917"
Rowan:  "Verified! I found 2 orders for your account. Your most recent order
         (#ORD-1234) is currently shipped."
```

### 3.2 Create the Verification Entity
File: `apps/api/src/modules/verification/entities/verification-code.entity.ts`

**Tutorial Action**: Create a new entity to store OTP codes.

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('verification_codes')
export class VerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  contactInfo!: string; // Email or phone number

  @Column()
  code!: string; // 6-digit code

  @Column()
  expiresAt!: Date;

  @Column({ default: 0 })
  attempts!: number; // Track failed attempts

  @Column({ default: false })
  used!: boolean; // Mark as used after successful verification

  @CreateDateColumn()
  createdAt!: Date;
}
```

### 3.3 Create the Verification Service
File: `apps/api/src/modules/verification/verification.service.ts`

**Tutorial Action**: This service handles the full OTP lifecycle — generation, storage, rate limiting, and validation.

```typescript
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { VerificationCode } from './entities/verification-code.entity';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  // Configuration constants
  private readonly CODE_LENGTH = 6;
  private readonly CODE_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;
  private readonly MAX_CODES_PER_HOUR = 5;

  constructor(
    @InjectRepository(VerificationCode)
    private verificationRepository: Repository<VerificationCode>
  ) {}

  /**
   * Generate and store a new OTP code for the given contact info.
   * Enforces rate limiting: max 5 codes per email per hour.
   */
  async generateCode(contactInfo: string): Promise<string> {
    // Rate limiting: check how many codes were generated in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCodes = await this.verificationRepository.count({
      where: {
        contactInfo,
        createdAt: MoreThan(oneHourAgo),
      },
    });

    if (recentCodes >= this.MAX_CODES_PER_HOUR) {
      throw new BadRequestException(
        'Too many verification attempts. Please try again later.'
      );
    }

    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiration
    const expiresAt = new Date(
      Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000
    );

    // Store it
    const verification = this.verificationRepository.create({
      contactInfo,
      code,
      expiresAt,
    });
    await this.verificationRepository.save(verification);

    this.logger.log(
      `Verification code generated for ${this.maskContact(contactInfo)}`
    );
    return code;
  }

  /**
   * Validate a code provided by the user.
   * Returns true if valid, throws on failure.
   */
  async validateCode(contactInfo: string, code: string): Promise<boolean> {
    const verification = await this.verificationRepository.findOne({
      where: {
        contactInfo,
        used: false,
      },
      order: { createdAt: 'DESC' }, // Most recent code
    });

    if (!verification) {
      throw new BadRequestException(
        'No verification code found. Please request a new one.'
      );
    }

    // Check expiration
    if (new Date() > verification.expiresAt) {
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.'
      );
    }

    // Check max attempts
    if (verification.attempts >= this.MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Too many incorrect attempts. Please request a new code.'
      );
    }

    // Check the code
    if (verification.code !== code) {
      // Increment attempts
      verification.attempts += 1;
      await this.verificationRepository.save(verification);

      const remaining = this.MAX_ATTEMPTS - verification.attempts;
      throw new BadRequestException(
        `Incorrect code. ${remaining} attempt(s) remaining.`
      );
    }

    // Mark as used
    verification.used = true;
    await this.verificationRepository.save(verification);

    this.logger.log(
      `Verification successful for ${this.maskContact(contactInfo)}`
    );
    return true;
  }

  /**
   * Mask contact info for display:
   * "alice@example.com" -> "a***@example.com"
   * "9195550123" -> "***-***-0123"
   */
  maskContact(contactInfo: string): string {
    if (contactInfo.includes('@')) {
      const [local, domain] = contactInfo.split('@');
      return `${local[0]}***@${domain}`;
    }
    // Phone number — show last 4
    return `***-***-${contactInfo.slice(-4)}`;
  }
}
```

### 3.4 Create the Verification Module
File: `apps/api/src/modules/verification/verification.module.ts`

**Tutorial Action**: Create the module and export the service so other modules (like Chatbot) can use it.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationCode } from './entities/verification-code.entity';
import { VerificationService } from './verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationCode])],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
```

### 3.5 Register the Module
File: `apps/api/src/app/app.module.ts`

**Tutorial Action**: Import `VerificationModule` in `AppModule`.

```typescript
import { VerificationModule } from '../modules/verification/verification.module';

@Module({
  imports: [
    // ... existing modules ...
    VerificationModule,
  ],
})
export class AppModule {}
```

---

## 4. Email Notification Service

### 4.1 Install Nodemailer
From the workspace root, install the email dependency:

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

### 4.2 Create the Email Service
File: `apps/api/src/modules/notification/email.service.ts`

**Tutorial Action**: Create a service to send OTP codes via email. For development, we'll use [Ethereal](https://ethereal.email/) — a fake SMTP service that captures emails without actually sending them.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'smtp.ethereal.email'),
      port: this.config.get<number>('SMTP_PORT', 587),
      auth: {
        user: this.config.get('SMTP_USER', ''),
        pass: this.config.get('SMTP_PASS', ''),
      },
    });
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const mailOptions = {
      from: '"Sawdust & Scents" <noreply@sawdustandscents.com>',
      to: email,
      subject: 'Your Verification Code',
      html: `
        <h2>Sawdust & Scents — Verification Code</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size: 36px; letter-spacing: 8px; color: #4A3728;">${code}</h1>
        <p>This code expires in 5 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent: ${info.messageId}`);

      // In development, log the Ethereal URL to view the email
      if (info.messageId) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          this.logger.log(`📧 Preview email at: ${previewUrl}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
      throw error;
    }
  }
}
```

### 4.3 Create the Notification Module
File: `apps/api/src/modules/notification/notification.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationModule {}
```

### 4.4 Environment Variables
Add to `.env.local`:
```
# SMTP Configuration (use Ethereal for development)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-user@ethereal.email
SMTP_PASS=your-ethereal-password
```

**Dev Tip**: Create a free account at https://ethereal.email/ to get test SMTP credentials. Ethereal captures emails so you can preview them in a web UI without actually sending them.

---

## 5. Chatbot Conversation State

### 5.1 The Challenge: Stateless to Stateful

Currently, each chatbot message is independent — Rowan has no memory between messages. For the OTP flow, Rowan needs to remember: *"I asked this person for a code and I'm waiting for their response."*

### 5.2 Create a Conversation State Tracker
File: `apps/api/src/modules/chatbot/chatbot-state.service.ts`

**Tutorial Action**: Create an in-memory state tracker (can be upgraded to Redis later for multi-instance deployments).

```typescript
import { Injectable } from '@nestjs/common';

export interface ConversationState {
  awaitingVerification: boolean;
  pendingContactInfo?: string;
  sessionStartedAt: Date;
}

@Injectable()
export class ChatbotStateService {
  // Key: sessionId (or IP/fingerprint for guests), Value: state
  private sessions = new Map<string, ConversationState>();

  // Auto-expire sessions after 10 minutes
  private readonly SESSION_TTL_MS = 10 * 60 * 1000;

  getState(sessionId: string): ConversationState | null {
    const state = this.sessions.get(sessionId);
    if (!state) return null;

    // Check if session has expired
    if (Date.now() - state.sessionStartedAt.getTime() > this.SESSION_TTL_MS) {
      this.sessions.delete(sessionId);
      return null;
    }
    return state;
  }

  setState(sessionId: string, state: Partial<ConversationState>): void {
    const existing = this.sessions.get(sessionId) || {
      awaitingVerification: false,
      sessionStartedAt: new Date(),
    };
    this.sessions.set(sessionId, { ...existing, ...state } as ConversationState);
  }

  clearState(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
```

### 5.3 Update ChatbotModule
File: `apps/api/src/modules/chatbot/chatbot.module.ts`

**Tutorial Action**: Import the new dependencies.

```typescript
import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotStateService } from './chatbot-state.service';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { VerificationModule } from '../verification/verification.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ProductsModule, OrdersModule, VerificationModule, NotificationModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, ChatbotStateService],
})
export class ChatbotModule {}
```

---

## 6. Integrating OTP into the Chatbot Flow

### 6.1 Updated Chatbot Controller
File: `apps/api/src/modules/chatbot/chatbot.controller.ts`

**Tutorial Action**: Add a `sessionId` to track conversation state. For guests, derive it from the request (IP or a client-sent session header). For logged-in users, use their Keycloak ID.

```typescript
@Public()
@Post('message')
async handleMessage(
  @Body() chatMessageDto: ChatMessageDto,
  @AuthenticatedUser() user?: any,
  @Headers('x-session-id') sessionId?: string
) {
  // Session ID: use Keycloak ID for logged-in users, header for guests
  const resolvedSessionId = user?.sub || sessionId || 'anonymous';
  return this.chatbotService.processMessage(
    chatMessageDto.text,
    user?.sub,
    resolvedSessionId
  );
}
```

**Note**: You'll need to import `Headers` from `@nestjs/common`.

### 6.2 Updated Chatbot Service — Full OTP Flow
File: `apps/api/src/modules/chatbot/chatbot.service.ts`

**Tutorial Action**: This is the big update. The `processMessage` method now checks conversation state and handles the OTP verification loop.

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { VerificationService } from '../verification/verification.service';
import { EmailService } from '../notification/email.service';
import { ChatbotStateService } from './chatbot-state.service';

@Injectable()
export class ChatbotService {
  constructor(
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private verificationService: VerificationService,
    private emailService: EmailService,
    private stateService: ChatbotStateService
  ) {}

  async processMessage(
    text: string,
    userId: string | undefined,
    sessionId: string
  ): Promise<{ reply: string }> {
    const input = text.toLowerCase();

    // ─── Step 1: Check if we're waiting for a verification code ───
    const state = this.stateService.getState(sessionId);
    if (state?.awaitingVerification && state.pendingContactInfo) {
      return this.handleVerificationResponse(input, sessionId, state.pendingContactInfo);
    }

    // ─── Step 2: Order/delivery/status intent ───
    if (
      input.includes('order') ||
      input.includes('delivery') ||
      input.includes('status')
    ) {
      // If logged in, use their Keycloak ID directly (no verification needed)
      if (userId) {
        return this.handleAuthenticatedOrderLookup(userId);
      }

      // Guest path: look for contact info in the message
      const contactInfo = this.extractContactInfo(input);
      if (contactInfo) {
        return this.initiateGuestVerification(contactInfo, sessionId);
      }

      // No contact info provided — ask for it
      return {
        reply: 'I can help you check your order! Could you please provide ' +
          'the email address or phone number you used when placing your order?'
      };
    }

    // ─── Step 3: Product questions (unchanged) ───
    // ... existing candle/scent logic ...
  }

  /**
   * Initiate the OTP verification flow for a guest
   */
  private async initiateGuestVerification(
    contactInfo: string,
    sessionId: string
  ): Promise<{ reply: string }> {
    try {
      // First check: is this a registered user? If so, block immediately
      // (The ordersService.findByContactInfo already handles this,
      //  but we check early to avoid sending an OTP unnecessarily)
      const orders = await this.ordersService.findByContactInfo(contactInfo);

      // If we got here, it's a valid guest — now require OTP
      const code = await this.verificationService.generateCode(contactInfo);
      const maskedContact = this.verificationService.maskContact(contactInfo);

      // Send the code
      if (contactInfo.includes('@')) {
        await this.emailService.sendVerificationCode(contactInfo, code);
      }
      // TODO: Add SMS sending for phone numbers

      // Set conversation state: we're now waiting for the code
      this.stateService.setState(sessionId, {
        awaitingVerification: true,
        pendingContactInfo: contactInfo,
      });

      return {
        reply: `For your security, I've sent a 6-digit verification code to ${maskedContact}. ` +
          'Please share the code so I can pull up your order information.'
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return {
          reply: 'It looks like that email or phone number is associated with an existing account. ' +
            'Please sign in to view your order history — I can help you once you\'re logged in!'
        };
      }
      return { reply: "Sorry, I wasn't able to process that request. Please try again later." };
    }
  }

  /**
   * Handle the user's response when we're expecting a verification code
   */
  private async handleVerificationResponse(
    input: string,
    sessionId: string,
    contactInfo: string
  ): Promise<{ reply: string }> {
    // Extract a 6-digit code from the message
    const codeMatch = input.match(/\b\d{6}\b/);
    if (!codeMatch) {
      return {
        reply: 'I\'m waiting for your 6-digit verification code. ' +
          'Please check your email and share the code here.'
      };
    }

    try {
      await this.verificationService.validateCode(contactInfo, codeMatch[0]);

      // Code is valid! Clear the state and fetch orders
      this.stateService.clearState(sessionId);

      const orders = await this.ordersService.findByContactInfo(contactInfo);
      if (orders.length > 0) {
        return { reply: `Verified! I found ${orders.length} order(s) for your account.` };
      }
      return { reply: "Verified! However, I couldn't find any orders for that contact information." };
    } catch (error) {
      // BadRequestException from validation (wrong code, expired, etc.)
      return { reply: error.message || 'Verification failed. Please try again.' };
    }
  }

  /**
   * Handle order lookup for a logged-in user (no verification needed)
   */
  private async handleAuthenticatedOrderLookup(
    userId: string
  ): Promise<{ reply: string }> {
    const orders = await this.ordersService.findByUser(userId);
    if (orders.length === 0) {
      return { reply: "I couldn't find any orders for your account." };
    }

    const latestOrder = orders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    let statusMessage = `Your most recent order (#${latestOrder.orderNumber}) is currently ${latestOrder.status}.`;
    if (latestOrder.trackingNumber) {
      statusMessage += ` Your tracking number is ${latestOrder.trackingNumber}.`;
    }
    return { reply: statusMessage };
  }

  /**
   * Extract email or phone from user input
   */
  private extractContactInfo(input: string): string | null {
    const emailMatch = input.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
    const phoneMatch = input.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/);
    return emailMatch ? emailMatch[0] : phoneMatch ? phoneMatch[0] : null;
  }
}
```

---

## 7. Security Considerations

### 7.1 Rate Limiting
The `VerificationService` enforces two limits:
- **3 attempts** per code (prevents brute-forcing a single code)
- **5 codes per hour** per contact (prevents spamming someone's inbox)

### 7.2 Code Expiration
Codes expire after **5 minutes**. Expired codes cannot be used even if the user provides the correct digits.

### 7.3 Single Use
Once a code is validated, it's marked `used: true` and cannot be reused.

### 7.4 Contact Masking
Never display the full email/phone back to the user. Always use the masked version (`a***@example.com`, `***-***-0123`) to prevent information leakage if someone is watching the screen.

### 7.5 Future Enhancements
- **Redis storage**: Replace the PostgreSQL table with Redis for ephemeral OTP data (natural TTL support).
- **SMS support**: Integrate Twilio or AWS SNS for phone-based OTP.
- **CAPTCHA**: Add CAPTCHA before OTP generation to prevent automated abuse.
- **IP-based rate limiting**: Limit OTP requests per IP address, not just per contact.

---

## 8. Implementation Checklist

### Layer 1 (Quick Win) — Already Done ✅
- [x] **OrdersService**: Add `keycloakId` check in `findByContactInfo`
- [x] **ChatbotService**: Catch `ForbiddenException` and return "please sign in" message
- [x] **Tests**: Add chatbot tests for registered-user denial

### Layer 2 (OTP Verification) — To Implement
- [ ] **Entity**: Create `VerificationCode` entity
- [ ] **Service**: Create `VerificationService` with generate/validate/rate-limit logic
- [ ] **Module**: Create `VerificationModule`
- [ ] **Email**: Create `EmailService` with Nodemailer
- [ ] **Module**: Create `NotificationModule`
- [ ] **State**: Create `ChatbotStateService` for conversation memory
- [ ] **Controller**: Add `sessionId` support to chatbot controller
- [ ] **Service**: Refactor `ChatbotService` to use OTP flow
- [ ] **Module**: Update `ChatbotModule` imports
- [ ] **Module**: Register `VerificationModule` and `NotificationModule` in `AppModule`
- [ ] **Config**: Add SMTP env variables to `.env.local`
- [ ] **Tests**: Add Playwright tests for OTP flow (happy path + expired code + max attempts)
