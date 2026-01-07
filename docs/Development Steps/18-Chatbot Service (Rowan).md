# Step 18: Chatbot Service (Rowan)

## 1. The "Why" Behind This Step: The Brain of Rowan

The Chatbot Controller (Step 16) is the "Ear" that hears the user. The **Chatbot Service** is the "Brain" that decides what to say. 

**The Goal**: We want Rowan to be more than just a bot—we want her to be an expert on **Sawdust and Scents**.
- **The Concept**: Rowan needs access to the product catalog (MongoDB) and order history (PostgreSQL) to give real answers.

---

## 2. Core Concepts & Definitions

#### 2.1 Intent Recognition

- **Definition**: Figuring out "What is the user actually asking for?" 
- **The Logic**: Instead of complex AI (which we can add later), we'll start with **Keyword Matching**. If the message contains "candle," we assume they want product info. If it contains "status," we assume they want order info.

#### 2.2 Conversational Context

- **The Logic**: If a user says "Tell me more," Rowan needs to know what they were *just* talking about. We store this history in MongoDB.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Chatbot Service

Create `apps/api/src/modules/chatbot/chatbot.service.ts`.

```typescript
import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class ChatbotService {
  constructor(
    private productsService: ProductsService,
    private ordersService: OrdersService
  ) {}

  async processMessage(text: string, userId?: string): Promise<{ reply: string }> {
    const input = text.toLowerCase();

    // 1. Order Status Intent
    if (input.includes('order') || input.includes('status')) {
      if (!userId) return { reply: "I can help with that! Please log in so I can see your orders." };
      const orders = await this.ordersService.findByUser(userId);
      if (orders.length === 0) return { reply: "I don't see any orders for you yet." };
      return { reply: `Your latest order status is: ${orders[0].status}` };
    }

    // 2. Product Inquiry Intent
    if (input.includes('candle') || input.includes('sign')) {
      const products = await this.productsService.findAll();
      return { reply: `We have ${products.length} items in stock. Which are you looking for?` };
    }

    // 3. Default Fallback
    return { reply: "I'm Rowan! I can help you find products or track your orders. How can I help?" };
  }

  async getHistory(userId: string) {
    // Logic to fetch chat logs from MongoDB
    return [];
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 Keyword Matching (`input.includes`)

- **The Logic**: This is the simplest form of NLP (Natural Language Processing). It is 100% reliable for specific technical terms but can be fooled by typos. In Phase 9, we can replace this with OpenAI integration.

#### 4.2 Proactive Help

- **The Logic**: Notice that if Rowan sees an "Order" intent but the user isn't logged in, she doesn't just say "Access Denied." She says "Please log in so I can see your orders." This is good **UX (User Experience)** design.

---

## 5. Verification & Learning Check

### 5.1 The "Rowan" Brain Test

1.  **Input**: "where is my order" (logged out).
    - **Expected**: "Please log in..."
2.  **Input**: "tell me about candles".
    - **Expected**: "We have X items in stock..."
3.  **The Lesson**: This proves Rowan's logic can distinguish between different types of customer needs.

### 6. Checklist for Success

- [ ] **Logic**: Does Rowan handle both order and product intents?
- [ ] **Security**: Does she protect private order info for logged-out users?
- [ ] **Exports**: Is the `ChatbotService` exported in the `ChatbotModule`?

**Congratulations!** You have completed the **Backend Brain** of Sawdust and Scents. Now we begin the visual journey: **Step 19: React Frontend Foundation**.


