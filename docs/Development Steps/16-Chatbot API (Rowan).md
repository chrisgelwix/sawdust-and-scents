# Step 16: Chatbot API (Rowan)

## 1. The "Why" Behind This Step: The Digital Concierge

Modern e-commerce isn't just about buttons and carts; it's about **Customer Service**. Many users have quick questions like "Where is my order?" or "Do you have blue candles in stock?"

**The Solution**: We build an AI-powered Chatbot named **Rowan**.
- **The Analogy**: Imagine a friendly clerk standing by the front door. They know where everything is, they know your order status, and they are always ready to help.
- **The Logic**: The chatbot acts as an "Intent Recognizer." It takes a user's typed sentence and tries to figure out what they want.

---

## 2. Core Concepts & Definitions

#### 2.1 Message Processing

- **Definition**: The act of taking a string of text, analyzing it, and generating a response.
- **The Process**: 
    1. **Receive**: "Where is order #123?"
    2. **Analyze**: Recognizes the keyword "order" and the number "123".
    3. **Query**: Asks the `OrdersService` for status.
    4. **Respond**: "Your order is currently in transit!"

#### 2.2 Intent (User Goal)

- **The Logic**: We categorize user messages into "Intents" like `ORDER_STATUS`, `PRODUCT_INQUIRY`, or `GENERAL_SUPPORT`.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Chatbot Controller

Create `apps/api/src/modules/chatbot/chatbot.controller.ts`.

```typescript
import { Controller, Post, Body, Get } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';

@Controller('chatbot')
export class ChatbotController {
  constructor(private chatbotService: ChatbotService) {}

  @Public() // Anyone can ask general product questions
  @Post('message')
  async handleMessage(@Body('text') text: string, @AuthenticatedUser() user?: any) {
    // If user is logged in, we can provide personalized order info
    return this.chatbotService.processMessage(text, user?.sub);
  }

  @Get('history')
  async getHistory(@AuthenticatedUser() user: any) {
    // Only logged in users can see their conversation history
    return this.chatbotService.getHistory(user.sub);
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `@Body('text') text: string`

- **The Logic**: Instead of grabbing the whole JSON body, we can tell NestJS to specifically extract one field named `text`. This keeps our function code clean.

#### 4.2 Optional Authentication (`user?: any`)

- **The Logic**: Notice the `?`. 
- **The Lesson**: We want Rowan to be helpful to everyone! 
    - If a guest asks "What do you sell?", Rowan says "We sell candles and signs." 
    - If a logged-in user asks "Where is my stuff?", Rowan can look up their specific orders using their `user.sub` ID.

---

## 5. Verification & Learning Check

### 5.1 The "Rowan" Test

1.  **POST to `/chatbot/message`**: Send `{"text": "Hello Rowan"}`.
2.  **Verify**: You should receive a response object like `{"reply": "Hello! How can I help you today?"}`.
3.  **The Lesson**: This proves the controller is receiving text and the service is generating a reply.

### 6. Checklist for Success

- [ ] **Public access**: Can guests talk to Rowan?
- [ ] **History**: Is the history route protected?
- [ ] **Personalization**: Does the controller pass the `user.sub` to the service?

**Moving Forward**: The API is powerful, but it's currently just text on a screen. Now we begin **Phase 6**—building the beautiful **React Frontend** that our customers will actually see!

