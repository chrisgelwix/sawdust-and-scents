# Products Module

Product catalog and inventory management.

## Overview

Manages the product catalog, inventory tracking, and product-related operations. Uses MongoDB for flexible product schema.

## Responsibilities

- Product CRUD operations
- Product search and filtering
- Category management
- Product variants (scents, sizes, etc.)
- Inventory tracking and alerts
- Stock availability checks

## Key Components

### Product Schema (`schemas/product.schema.ts`)
MongoDB schema defining product structure:
- Basic info (name, description, price)
- Categories and tags
- Product variants/options
- Images and media
- SEO metadata

### ProductsService (`products.service.ts`)
Core product management:
- Create, read, update, delete products
- Search and filter products
- Category operations
- Product availability checks

**Key Methods:**
- `findAll(filters?)`: Get all products with optional filtering
- `findById(id)`: Get specific product
- `create(productData)`: Add new product
- `update(id, updates)`: Modify product
- `search(query)`: Search products by name/description
- `findByCategory(category)`: Filter by category

### InventoryService (`inventory.service.ts`)
Inventory and stock management:
- Track stock levels
- Reserve inventory for orders
- Release reserved inventory (cancelled orders)
- Low stock alerts
- Inventory adjustments

**Key Methods:**
- `checkAvailability(productId, quantity)`: Check if in stock
- `reserveStock(productId, quantity)`: Hold for pending order
- `deductStock(productId, quantity)`: Finalize inventory reduction
- `releaseStock(productId, quantity)`: Return to available stock
- `getLowStockItems()`: Get products below threshold

### ProductsController (`products.controller.ts`)
REST API endpoints:
- Public product browsing
- Admin product management
- Inventory operations

## Database Schema

### Products Collection (MongoDB)

```typescript
{
  _id: ObjectId,
  sku: string,              // Unique product SKU
  name: string,
  description: string,
  price: number,
  images: string[],         // URLs to product images
  categories: string[],     // Product categories
  tags: string[],           // Search tags
  variants: [               // Product options (scent, size, etc.)
    {
      type: string,         // e.g., 'scent'
      options: string[]     // e.g., ['lavender', 'vanilla']
    }
  ],
  inventory: {
    quantity: number,       // Current stock
    reserved: number,       // Held for pending orders
    lowStockThreshold: number,
    trackInventory: boolean
  },
  metadata: {
    weight: number,         // For shipping calculations
    dimensions: {
      length: number,
      width: number,
      height: number,
      unit: string          // 'in' or 'cm'
    }
  },
  seo: {
    title: string,
    metaDescription: string,
    keywords: string[]
  },
  active: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Public Endpoints (No Auth Required)

#### Get All Products
```http
GET /products
Query params:
  ?category=candles
  &minPrice=10&maxPrice=50
  &inStock=true
  &search=lavender
```

#### Get Product Details
```http
GET /products/:id
```

#### Search Products
```http
GET /products/search?q=lavender+candle
```

### Admin Endpoints (Auth + Admin Role Required)

#### Create Product
```http
POST /products
Authorization: Bearer <token>
Roles: admin

{
  "sku": "CAN-LAV-001",
  "name": "Lavender Candle",
  "description": "Hand-poured lavender scented candle",
  "price": 24.99,
  "categories": ["candles", "aromatherapy"],
  "inventory": {
    "quantity": 100,
    "lowStockThreshold": 10
  }
}
```

#### Update Product
```http
PATCH /products/:id
Authorization: Bearer <token>
Roles: admin

{
  "price": 29.99,
  "inventory.quantity": 150
}
```

#### Delete Product
```http
DELETE /products/:id
Authorization: Bearer <token>
Roles: admin
```

## Inventory Management

### Stock Reservation Flow

```
1. User adds item to cart
    ↓
2. InventoryService.checkAvailability()
    ↓
3. User proceeds to checkout
    ↓
4. InventoryService.reserveStock()
    ├─→ Deduct from available quantity
    └─→ Add to reserved quantity
    ↓
5. Payment processed
    ↓
6a. Success: InventoryService.deductStock()
    └─→ Remove from reserved (already sold)
    
6b. Failed: InventoryService.releaseStock()
    └─→ Return reserved to available
```

### Low Stock Alerts

Products with inventory below threshold:

```typescript
const lowStockItems = await inventoryService.getLowStockItems();
// Returns products where: quantity - reserved < lowStockThreshold
```

## Business Rules

1. **Price Precision**: Prices stored as numbers (2 decimal places)
2. **SKU Uniqueness**: Each product must have unique SKU
3. **Soft Delete**: Products marked `active: false`, not deleted
4. **Inventory Tracking**: Optional per-product (digital products = false)
5. **Image Requirements**: At least one image required
6. **Category Hierarchy**: Flat categories (no nesting currently)

## Search Functionality

### Full-Text Search

Uses MongoDB text indexes:

```typescript
// Create text index
db.products.createIndex({
  name: 'text',
  description: 'text',
  tags: 'text'
});

// Search
productsService.search('lavender candle');
```

### Filtering

```typescript
// By category
await productsService.findByCategory('candles');

// By price range
await productsService.findAll({
  minPrice: 10,
  maxPrice: 50
});

// In stock only
await productsService.findAll({
  inStock: true
});
```

## Error Handling

Common errors:
- `PRODUCT_NOT_FOUND`: Invalid product ID
- `SKU_EXISTS`: Duplicate SKU on create
- `INSUFFICIENT_STOCK`: Not enough inventory
- `INVALID_PRICE`: Price must be positive
- `MISSING_IMAGES`: At least one image required

## Testing

Mock Mongoose in tests:

```typescript
const mockProductModel = {
  find: jest.fn().mockReturnThis(),
  findById: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn()
};
```

## Performance Optimization

**Indexes:**
```javascript
// MongoDB indexes
db.products.createIndex({ sku: 1 }, { unique: true });
db.products.createIndex({ categories: 1 });
db.products.createIndex({ active: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ 'inventory.quantity': 1 });
```

**Caching:**
- Cache popular products (Redis future enhancement)
- Cache category lists
- Cache search results for common queries

## Dependencies

- **MongooseModule**: MongoDB integration
- Used by: CartModule, OrdersModule, ManagementModule

## Future Enhancements

- [ ] Product reviews and ratings
- [ ] Related products
- [ ] Product recommendations
- [ ] Bulk import/export
- [ ] Product bundles
- [ ] Tiered pricing (wholesale)
- [ ] Product variations (size/color matrix)
- [ ] Advanced search (faceted navigation)
- [ ] Elasticsearch integration
- [ ] Image optimization/CDN

## Related Documentation

- `/docs/Development Steps/11-Product and Inventory Management.md`
- [Mongoose Documentation](https://mongoosejs.com)
- CartModule README - Uses product data
- OrdersModule README - Inventory integration


