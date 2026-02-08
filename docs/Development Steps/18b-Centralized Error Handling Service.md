# Step 18b: Explicit Error Translation Service

## 1. The "Why" Behind This Step: Centralized Error Mapping
Instead of guessing which error to throw in every service, we want a single **`ErrorService`** that knows how to handle every "type" of failure. When an error happens, we simply pass it to `this.errorService.handleError(err)` and let it decide the outcome.

---

## 2. Step-by-Step Implementation

### Step 2.1: Define the Error Service
This service will contain a large `switch` or `if/else` block that maps raw error codes (from PostgreSQL, MongoDB, or external APIs) into clean, actionable responses.

**Tutorial Action**:
1. Create `apps/api/src/modules/common/errors/error-handler.service.ts`.

```typescript
import { 
  Injectable, 
  Logger, 
  ConflictException, 
  NotFoundException, 
  BadRequestException, 
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger('ErrorHandler');

  /**
   * The "Magic" Method: Call this in your catch blocks
   * @param error The raw error caught
   * @param context Where the error happened (e.g., 'OrdersService.create')
   */
  handleError(error: any, context?: string): never {
    const errorSource = context ? `[${context}] ` : '';
    
    // 1. Handle PostgreSQL Errors (via code)
    if (error.code === '23505') {
      this.logger.warn(`${errorSource}Duplicate key violation: ${error.detail}`);
      throw new ConflictException('A record with this information already exists.');
    }

    if (error.code === '23503') {
      this.logger.warn(`${errorSource}Foreign key violation: ${error.detail}`);
      throw new BadRequestException('The referenced record does not exist.');
    }

    // 2. Handle MongoDB Errors
    if (error.name === 'ValidationError') {
      this.logger.warn(`${errorSource}Mongoose Validation Error: ${error.message}`);
      throw new BadRequestException('Invalid data format for product attributes.');
    }

    // 3. Handle External API Failures (e.g., Shippo/ADP)
    if (error.response?.status === 401) {
      this.logger.error(`${errorSource}External API Authentication Failure`);
      throw new UnauthorizedException('Service is temporarily unavailable.');
    }

    // 4. Handle known NestJS Exceptions (just re-throw them)
    if (error.status && error.message) {
      throw error;
    }

    // 5. Fallback: Unexpected System Error
    this.logger.error(`${errorSource}Unexpected Error: ${error.message}`, error.stack);
    throw new InternalServerErrorException('An internal server error occurred. Our team has been notified.');
  }
}
```

---

## 3. How to use it in your Services

**Tutorial Action**: 
Inject the `ErrorHandlerService` and wrap your logic in a `try-catch`.

File: `apps/api/src/modules/orders/orders.service.ts`

```typescript
async createOrder(data: any) {
  try {
    // ... your logic ...
    return await this.ordersRepo.save(data);
  } catch (err) {
    // One call to handle it all!
    this.errorService.handleError(err, 'OrdersService.createOrder');
  }
}
```

---

## 4. Why this is better than the "Before" state

| Feature | Old Way | New Way (ErrorService) |
| :--- | :--- | :--- |
| **Logic Location** | Every single `.ts` file | One single `error-handler.service.ts` |
| **Log Format** | Inconsistent | Standardized with context `[OrdersService.create]` |
| **Database Codes** | You had to remember '23505' everywhere | You write it once in the service |
| **Response Format** | Varies | Always returns a clean NestJS Exception |

---

## 5. Security Note: Hidden vs. Visible Errors
The `handleError` method is your **security gate**. 

*   **DON'T** pass `error.message` directly to `InternalServerErrorException` in production. It might contain your database table names or raw SQL.
*   **DO** use the `Logger` to record the scary details for you to see, but return a "polite" message like *"An internal error occurred"* to the user.

---

## 6. Implementation Checklist

- [ ] **Service**: Create `ErrorHandlerService` with the `handleError` method.
- [ ] **Module**: Register it in a `SharedModule` or `AppModule` so it can be injected.
- [ ] **Refactor**: Open `OrdersService` or `ProductsService` and replace custom catch logic with `this.errorHandler.handleError(err, 'Context')`.
- [ ] **Verification**: Try to create a user with a duplicate email and ensure you get a clean 409 Conflict response instead of a raw 500 error.
