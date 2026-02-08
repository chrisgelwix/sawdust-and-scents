# Step 18a: Handling Guest Users and Chatbot Identification

## 1. The "Why" Behind This Step: Eliminating Friction
Currently, our system assumes every user has a Keycloak account. However, forced registration is a major cause of cart abandonment. We need to support **Guest Checkout** where a user is created in our database without a `keycloakId`, and we need the **Chatbot (Rowan)** to be smart enough to find orders for these users using alternative identifiers like email or phone number.

---

## 2. Database Schema Changes

### 2.1 Update User Entity
File: `apps/api/src/modules/users/entities/user.entity.ts`

**Tutorial Action**: Modify the `User` class to allow for guests who haven't registered with Keycloak.

1.  **Open** `user.entity.ts`.
2.  **Find** the `keycloakId` column and add `nullable: true`.
3.  **Add** the `phoneNumber` column with `unique: true` and `nullable: true`.
4.  **Ensure** `email` is marked as `unique: true`.

---

## 3. Orders Service Enhancements

### 3.1 Registering the User Entity in Orders Module
File: `apps/api/src/modules/orders/orders.module.ts`

**CRITICAL STEP**: Before you can use the `User` repository inside the `OrdersService`, the `OrdersModule` must be aware of it.

**Tutorial Action**:
1. Open `orders.module.ts`.
2. Import the `User` entity from `../users/entities/user.entity`.
3. Add `User` to the `TypeOrmModule.forFeature([...])` array.

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, User])], // Add User here!
  controllers: [OrdersController],
  providers: [OrdersService, ShippingService],
  exports: [OrdersService, ShippingService, TypeOrmModule],
})
export class OrdersModule {}
```

### 3.2 Injecting the User Repository
File: `apps/api/src/modules/orders/orders.service.ts`

**Tutorial Action**: Now that the module knows about the User entity, you must **inject** the repository into the constructor so you can actually use it.

1. Open `orders.service.ts`.
2. Import `User` from `../users/entities/user.entity`.
3. Update the constructor to include `@InjectRepository(User) private usersRepository: Repository<User>`.

```typescript
constructor(
  @InjectRepository(Order)
  private ordersRepository: Repository<Order>,
  @InjectRepository(User) // New Injection
  private usersRepository: Repository<User>
) {}
```

### 3.3 Implementing the Lookup Method
**Tutorial Action**: Add the logic to find the user first, then return their orders.

```typescript
/**
 * Find orders for guests or registered users using contact info
 */
async findByContactInfo(contactInfo: string): Promise<Order[]> {
  // 1. Find the user record matching the email or phone
  const user = await this.usersRepository.findOne({
    where: [
      { email: contactInfo },
      { phoneNumber: contactInfo }
    ]
  });

  if (!user) return [];

  // 2. Use the found user's ID to fetch their orders
  return this.ordersRepository.find({
    where: { user: { id: user.id } },
    relations: ['items'],
    order: { createdAt: 'DESC' }
  });
}
```

---

## 4. Chatbot Logic (Rowan) Extension

### 4.1 Identification Flow
File: `apps/api/src/modules/chatbot/chatbot.service.ts`

**Tutorial Action**: Update Rowan's `processMessage` to handle guests by analyzing the message text for contact info using Regex.

```typescript
// Example identification logic inside processMessage
const emailMatch = input.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
const phoneMatch = input.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/);
const contactInfo = emailMatch ? emailMatch[0] : (phoneMatch ? phoneMatch[0] : null);

if (contactInfo) {
    const orders = await this.ordersService.findByContactInfo(contactInfo);
    // ... handle results ...
}
```

---

## 5. Security Note: Protecting Guest Data

### 5.1 Verification Challenge
**Tutorial Pro-Tip**: To prevent unauthorized access, don't show order details based on email alone. Require the user to provide their **Order Number** as a second factor of verification before Rowan reveals the status.

---

## 6. Implementation Checklist

- [ ] **Database**: Update `User` entity fields.
- [ ] **Module**: Register `User` entity in `OrdersModule`.
- [ ] **Service**: Inject `usersRepository` into `OrdersService`.
- [ ] **Service**: Implement `findByContactInfo` logic.
- [ ] **Chatbot**: Update `ChatbotService` to use the new lookup flow.
