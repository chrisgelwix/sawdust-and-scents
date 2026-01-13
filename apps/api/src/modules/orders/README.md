# Orders Module

Order processing and shipping management.

## Overview

Handles the complete order lifecycle from creation through fulfillment and shipping.

## Responsibilities

- Order creation and storage
- Order status management
- Order history and retrieval
- Shipping label generation (Shippo integration)
- Shipment tracking
- Order fulfillment workflow

## Key Components

### Order Entity (`entities/order.entity.ts`)
PostgreSQL entity representing customer orders:
- Order metadata (date, status, total)
- Customer information
- Shipping address
- Payment details
- Timestamps (created, updated, shipped)

### OrderItem Entity (`entities/order-item.entity.ts`)
Individual items within an order:
- Product reference
- Quantity ordered
- Price at time of order (price lock)
- Selected options/variants

### OrdersService (`orders.service.ts`)
Core order management logic:
- Create orders from checkout
- Update order status
- Retrieve order history
- Calculate order totals
- Order validation

**Key Methods:**
- `createOrder(orderData)`: Create new order
- `findByUser(userId)`: Get user's order history
- `updateStatus(orderId, status)`: Update order state
- `findById(orderId)`: Retrieve specific order

### ShippingService (`shipping.service.ts`)
Shippo integration for shipping:
- Create shipments
- Generate shipping labels
- Calculate shipping rates
- Track packages
- Handle returns

**Key Methods:**
- `createShipment(order)`: Generate shipping label
- `getRates(order)`: Get available shipping options
- `trackShipment(trackingNumber)`: Track package status
- `cancelShipment(shipmentId)`: Cancel/refund shipment

### OrdersController (`orders.controller.ts`)
REST API endpoints for orders:
- Place orders
- View order history
- Get order details
- Track shipments

## Database Schema

### Orders Table (PostgreSQL)
```sql
orders
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── order_number (string, unique)
├── status (enum: pending, processing, shipped, delivered, cancelled)
├── subtotal (decimal)
├── tax (decimal)
├── shipping_cost (decimal)
├── total (decimal)
├── shipping_address (jsonb)
├── tracking_number (string, nullable)
├── created_at (timestamp)
├── updated_at (timestamp)
└── shipped_at (timestamp, nullable)
```

### Order Items Table (PostgreSQL)
```sql
order_items
├── id (UUID, PK)
├── order_id (UUID, FK → orders)
├── product_id (string, reference to MongoDB)
├── product_name (string, snapshot)
├── quantity (integer)
├── unit_price (decimal, price at time of order)
├── total_price (decimal)
└── options (jsonb, selected variants)
```

## Order Status Workflow

```
pending → processing → shipped → delivered
   ↓
cancelled (anytime before shipped)
```

**Status Definitions:**
- `pending`: Order placed, payment not confirmed
- `processing`: Payment confirmed, preparing shipment
- `shipped`: Shipment created, tracking available
- `delivered`: Package delivered to customer
- `cancelled`: Order cancelled by user or admin

## Shippo Integration

### Creating a Shipment

```typescript
const shipment = await shippingService.createShipment({
  orderId: order.id,
  toAddress: order.shippingAddress,
  parcels: [{
    length: 10,
    width: 8,
    height: 4,
    weight: 2,
    distance_unit: 'in',
    mass_unit: 'lb'
  }]
});
```

### Getting Shipping Rates

```typescript
const rates = await shippingService.getRates(orderData);
// Returns: [
//   { provider: 'USPS', service: 'Priority', cost: 8.99, days: 2 },
//   { provider: 'UPS', service: 'Ground', cost: 12.50, days: 5 }
// ]
```

## Environment Variables

```bash
# Shippo API
SHIPPO_API_KEY=shippo_test_xxx

# Shipping Origin Address
SHIPPING_FROM_NAME=Sawdust and Scents
SHIPPING_FROM_STREET=123 Main St
SHIPPING_FROM_CITY=Springfield
SHIPPING_FROM_STATE=IL
SHIPPING_FROM_ZIP=62701
SHIPPING_FROM_COUNTRY=US
```

## API Endpoints

### Create Order
```http
POST /orders
Authorization: Bearer <token>

{
  "items": [...],
  "shippingAddress": {...},
  "paymentToken": "tok_xxx"
}
```

### Get Order History
```http
GET /orders
Authorization: Bearer <token>
```

### Get Order Details
```http
GET /orders/:id
Authorization: Bearer <token>
```

### Track Shipment
```http
GET /orders/:id/tracking
Authorization: Bearer <token>
```

## Business Rules

1. **Price Lock**: Item prices frozen at time of order
2. **Inventory Reserve**: Inventory decremented on order creation
3. **Payment First**: Payment must succeed before order creation
4. **Cancel Window**: Orders can be cancelled before shipping
5. **Auto-fulfill**: Orders auto-mark "delivered" after tracking confirms

## Error Handling

Common errors:
- `ORDER_NOT_FOUND`: Invalid order ID
- `UNAUTHORIZED`: User doesn't own order
- `CANNOT_CANCEL`: Order already shipped
- `SHIPMENT_FAILED`: Shippo API error
- `INVALID_ADDRESS`: Shipping address validation failed

## Testing

Mock Shippo in tests:

```typescript
const mockShippingService = {
  createShipment: jest.fn().mockResolvedValue({
    trackingNumber: 'TRACK123',
    labelUrl: 'https://...'
  }),
  getRates: jest.fn().mockResolvedValue([
    { provider: 'USPS', cost: 8.99 }
  ])
};
```

## Dependencies

- **TypeORM**: Database persistence
- **Shippo SDK**: Shipping integration
- Used by: CartModule (checkout creates orders)

## Future Enhancements

- [ ] Order cancellation workflow
- [ ] Partial shipments (split orders)
- [ ] Return/refund processing
- [ ] Order notes/comments
- [ ] Gift wrapping options
- [ ] Subscription orders
- [ ] Bulk order import (wholesale)
- [ ] International shipping

## Related Documentation

- `/docs/Development Steps/12-Order Fulfillment and Shippo Integration.md`
- [Shippo API Documentation](https://goshippo.com/docs)
- CartModule README - Order creation from checkout


