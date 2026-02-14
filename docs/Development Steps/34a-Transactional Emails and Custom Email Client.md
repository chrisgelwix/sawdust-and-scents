# Step 31a: Transactional Emails and Custom Email Client

## 1. The "Why" Behind This Step: The Digital Receipt

A customer's journey doesn't end when they click "Buy"—it ends when they receive their package. Between those two points, **Transactional Emails** (Order Confirmations, Shipping Updates) are the primary way you maintain trust.

**The Strategy**: We build a **Custom Email Client** in NestJS.
- **The Analogy**: Imagine your store has its own Post Office. Instead of just throwing letters in a box, this office has a "Manager" (The Service) and "Pre-printed Stationary" (The Templates).
- **The Client**: We'll create a manageable client that wraps **Nodemailer**. This allows you to start with simple SMTP and later switch to professional services like SendGrid or AWS SES without changing your business logic.

---

## 2. Core Concepts & Definitions

### 2.1 Transactional Email
- **Definition**: Automated emails sent to an individual based on an action (e.g., "Welcome," "Order Shipped"). These are different from "Marketing" emails (newsletters).

### 2.2 Template Engine
- **Definition**: A tool that takes a "Template" (HTML with placeholders) and injects real data (e.g., `{{customerName}}`). We'll use **Handlebars (HBS)**.

### 2.3 Provider Abstraction
- **The Logic**: By creating a "Custom Client," we hide the messy details of the email provider. The rest of your app just says `emailService.sendOrderConfirmation(order)`, and the client handles the rest.

---

## 3. Step-by-Step Implementation

### Step 3.1: Install Dependencies

```bash
npm install nodemailer handlebars @nestjs-modules/mailer
npm install --save-dev @types/nodemailer
```

### Step 3.2: Create the Email Templates

Create a directory: `apps/api/src/modules/notification/templates/`

**File**: `order-confirmation.hbs`
```html
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h1 style="color: #5d4037;">Thank You for Your Order!</h1>
    <p>Hi {{customerName}},</p>
    <p>We've received your order <strong>#{{orderId}}</strong> and we're getting it ready for shipment.</p>
    <hr />
    <h3>Order Summary:</h3>
    <ul>
      {{#each items}}
        <li>{{this.name}} x {{this.quantity}} - ${{this.price}}</li>
      {{/each}}
    </ul>
    <p><strong>Total: ${{total}}</strong></p>
    <p>We'll notify you as soon as it ships!</p>
    <p>— The Sawdust & Scents Team</p>
  </body>
</html>
```

### Step 3.3: Build the Custom Email Client

**File**: `apps/api/src/modules/notification/email.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as hbs from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    // 1. Configure the "Postal Service" (Nodemailer)
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Internal method to compile and send any template
   */
  private async sendTemplate(to: string, subject: string, templateName: string, context: any) {
    try {
      const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const compiledTemplate = hbs.compile(templateSource);
      const html = compiledTemplate(context);

      await this.transporter.sendMail({
        from: '"Sawdust & Scents" <no-reply@sawdustandscents.com>',
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully: ${templateName} to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
      throw error;
    }
  }

  /**
   * Public Managed Method: Order Confirmation
   */
  async sendOrderConfirmation(order: any) {
    await this.sendTemplate(
      order.user.email,
      `Order Confirmation: #${order.id.slice(0, 8)}`,
      'order-confirmation',
      {
        customerName: order.user.firstName,
        orderId: order.id.slice(0, 8),
        items: order.items,
        total: order.total.toFixed(2),
      }
    );
  }

  /**
   * Public Managed Method: Welcome Email
   */
  async sendWelcomeEmail(user: any) {
    await this.sendTemplate(user.email, 'Welcome to Sawdust & Scents!', 'welcome', {
      name: user.firstName,
    });
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

### 4.1 `hbs.compile()`
- **The Logic**: It reads your HTML file and prepares it to receive data. It's like taking a Mad Libs sheet and getting a pen ready.

### 4.2 `transporter.sendMail()`
- **The Logic**: This is the actual handoff to the internet. It takes the "Letter" (HTML) and the "Address" (To) and sends it via SMTP.

---

## 5. Checklist for Success
- [ ] **Templates**: Are the `.hbs` files in the correct directory?
- [ ] **Environment**: Are `EMAIL_HOST` and `EMAIL_USER` set in your `.env`?
- [ ] **Test Run**: Does a test email appear in a service like **Mailtrap** (highly recommended for development)?

---

**Moving Forward**: We have a voice. Now we need a place to store images of our beautiful products. Next is **Media Management (Step 31b)**.
