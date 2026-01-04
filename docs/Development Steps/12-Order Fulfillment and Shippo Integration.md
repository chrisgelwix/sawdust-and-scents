# Step 12: Order Fulfillment and Shippo Integration

## 1. The "Why" Behind This Step: The Physical Handshake

Your e-commerce site is a digital bridge. The customer pays online (Digital), but they expect a package at their door (Physical). 

**The Problem**: Calculating shipping rates, printing labels, and tracking packages is incredibly complex. Every carrier (UPS, FedEx, USPS) has a different system.

**The Solution**: We integrate with **Shippo**.
- **The Analogy**: Imagine Shippo as a "Universal Shipping Desk." 
    - Instead of you driving to 5 different post offices to compare prices, you bring your package to one desk (the Shippo API). 
    - You say "Here is where it's going." 
    - They give you the best rates from every carrier and print the label for you instantly.

---

## 2. Core Concepts & Definitions

#### 2.1 Webhooks

- **Definition**: A "Phone Call" from an external server to your server.
- **The Logic**: When a package is delivered, Shippo doesn't wait for you to ask. It "Calls" your API (via a Webhook) to say: "Hey, the package was delivered!" Your system then updates the order status automatically.

#### 2.2 Shipping Labels (The Passport)

- **Definition**: A digital file (PDF or image) that contains the barcode and address for the carrier.
- **The Logic**: Shippo returns a URL to a label. We save this URL in our PostgreSQL database so the worker can print it from the Admin Page.

---

## 3. Step-by-Step Implementation

### Step 3.1: Install the Shippo Library

```bash
npm install shippo
```

### Step 3.2: Create the Shipping Service

Create `apps/api/src/modules/orders/shipping.service.ts`. This service will act as our "Post Office Clerk."

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const shippo = require('shippo');

@Injectable()
export class ShippingService {
  private shippoClient;

  constructor(private config: ConfigService) {
    // Initialize the Shippo client with your private API key
    this.shippoClient = shippo(this.config.get('SHIPPO_API_KEY'));
  }

  async createShipment(orderData: any) {
    // 1. Send order details to Shippo
    const shipment = await this.shippoClient.shipment.create({
      address_from: { /* Your Warehouse Address */ },
      address_to: orderData.shippingAddress,
      parcels: [{ length: 10, width: 10, height: 10, distance_unit: 'in', weight: 2, mass_unit: 'lb' }],
      async: false,
    });

    // 2. Return the rates found for this shipment
    return shipment.rates;
  }

  async purchaseLabel(rateId: string) {
    // 3. Buy the shipping label for the chosen rate
    return this.shippoClient.transaction.create({
      rate: rateId,
      label_file_type: 'PDF',
      async: false,
    });
  }

  async getTrackingStatus(carrier: string, trackingNumber: string) {
    // 4. Ask Shippo for the current location of the package
    return this.shippoClient.track.get_status(carrier, trackingNumber);
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `address_from` / `address_to`

- **The Logic**: Shippo requires exact addresses to calculate taxes and distance. We pull the `address_to` from the Order record we created in Step 07.

#### 4.2 `parcels`

- **The Logic**: In e-commerce, size matters! Shipping cost is determined by weight and volume. For "Sawdust and Scents," we'll need to calculate if we are shipping a small candle or a heavy wooden sign.

#### 4.3 `track.get_status` (The Customer Experience)

- **The Logic**: This is how we give users "Peace of Mind." Shippo acts as a translator for every carrier. Whether the package is with UPS or USPS, this one method returns a consistent "Current Status" (e.g., "In Transit", "Delivered") that we can show the user.

#### 4.4 `transaction.create`

- **The Logic**: In Shippo language, a "Transaction" is the act of actually buying the label. This will charge your Shippo account and generate the barcode.

---

## 5. Verification & Learning Check

### 5.1 The Rate Test

1.  **Trigger Shipping**: Use the Admin Page to click "Calculate Shipping" on an order.
2.  **Verify**: You should see a list of prices (e.g., USPS: $5.00, UPS: $12.00). This proves your API key is correct and the "Handshake" with Shippo is working.

### 6. Checklist for Success

- [ ] **API Key**: Is your `SHIPPO_API_KEY` in your `.env.local` file?
- [ ] **Service**: Did you create the `ShippingService`?
- [ ] **Logic**: Does the service separate "Calculating Rates" from "Buying the Label"?

**Moving Forward**: We can now ship products! But a business is more than just shipping—it's about people. We'll integrate **ADP** for HR and Payroll functions next.

