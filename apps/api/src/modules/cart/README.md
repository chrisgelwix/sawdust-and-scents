# Cart Module

Shopping cart and checkout functionality.

## Overview

Manages user shopping carts and handles the checkout process to convert carts into orders.

## Responsibilities

- Maintain user shopping cart state
- Add/remove/update cart items
- Calculate cart totals and taxes
- Handle checkout process
- Validate inventory availability
- Create orders from cart contents

## Key Components

### CartService (`cart.service.ts`)
Core shopping cart logic:
- Add items to cart
- Update item quantities
- Remove items from cart
- Calculate subtotals and totals
- Clear cart after checkout

### CheckoutService (`checkout.service.ts`)
Checkout process orchestration:
- Validate cart contents
- Check inventory availability
- Calculate shipping costs
- Process payment
- Create order from cart
- Clear cart on successful checkout

## Dependencies

This module depends on:
- **ProductsModule**: Product validation and inventory checks
- **OrdersModule**: Order creation

## Data Flow

```
User adds item to cart
    ↓
CartService validates product exists
    ↓
CartService adds to user's cart
    ↓
User proceeds to checkout
    ↓
CheckoutService validates inventory
    ↓
CheckoutService calculates totals + shipping
    ↓
CheckoutService processes payment
    ↓
CheckoutService creates order
    ↓
CartService clears cart
```

## Cart Storage

Currently implemented as in-memory storage (session-based).

**Future Enhancement**: Persist carts to database for:
- Saved carts across sessions
- Abandoned cart recovery
- Multi-device synchronization

## Usage Examples

### Add Item to Cart
```typescript
const cartItem = await cartService.addItem(userId, {
  productId: 'prod-123',
  quantity: 2,
  selectedOptions: { scent: 'lavender' }
});
```

### Update Quantity
```typescript
await cartService.updateQuantity(userId, itemId, 5);
```

### Checkout
```typescript
const order = await checkoutService.processCheckout(userId, {
  shippingAddress: {...},
  paymentMethod: 'card',
  paymentToken: 'tok_xxx'
});
```

## Business Rules

1. **Inventory Validation**: Items added must be in stock
2. **Quantity Limits**: Max quantity per item (configurable)
3. **Price Lock**: Prices locked at time of checkout
4. **Cart Expiration**: Carts expire after 7 days of inactivity
5. **Shipping Calculation**: Based on weight and destination

## Error Handling

Common errors:
- `PRODUCT_NOT_FOUND`: Invalid product ID
- `INSUFFICIENT_INVENTORY`: Not enough stock
- `CART_EMPTY`: Checkout attempted with empty cart
- `PAYMENT_FAILED`: Payment processing error
- `INVALID_ADDRESS`: Shipping address validation failed

## Testing Considerations

- Mock ProductsService for inventory checks
- Mock OrdersService for order creation
- Test edge cases: empty cart, out-of-stock items
- Test concurrent cart updates
- Test checkout failure rollback

## Future Enhancements

- [ ] Persistent cart storage (database)
- [ ] Guest checkout support
- [ ] Cart sharing/wishlist features
- [ ] Promo code/discount support
- [ ] Save for later functionality
- [ ] Cart abandonment emails
- [ ] Multi-currency support

## Related Documentation

- `/docs/Development Steps/` - Checkout flow documentation
- OrdersModule README - Order creation process
- ProductsModule README - Inventory management


