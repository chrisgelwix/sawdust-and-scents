# Database Module

Database configuration and connection management.

## Overview

Configures and manages database connections for both PostgreSQL (relational) and MongoDB (document) databases.

## Dual Database Architecture

This application uses a polyglot persistence approach:

### PostgreSQL (via TypeORM)
**Used for**: Relational data requiring strong consistency and transactions
- Users and authentication
- Orders and order items
- Transactions and payments
- Relational foreign key constraints

### MongoDB (via Mongoose)
**Used for**: Flexible, document-based data
- Product catalog (varying product attributes)
- Inventory tracking
- Product metadata and categories
- Search and filtering optimization

## Why Two Databases?

**PostgreSQL Strengths:**
- ✅ ACID transactions (critical for orders/payments)
- ✅ Strong data integrity (foreign keys, constraints)
- ✅ Complex queries and joins
- ✅ Financial data precision

**MongoDB Strengths:**
- ✅ Flexible schema (products have varying attributes)
- ✅ Fast reads for product catalog
- ✅ Easy scaling for read-heavy operations
- ✅ Nested document support (product options, variants)

## Configuration

### Environment Variables

Required in `.env.local`:

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=sawdust_scents

# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_USER=admin
MONGO_PASSWORD=admin
MONGO_DB=sawdust_scents
```

### TypeORM Configuration

- **Auto-load entities**: Automatically discovers entity classes
- **Synchronize**: Enabled in development (auto-creates tables)
  - ⚠️ **WARNING**: Disabled in production (use migrations)
- **Connection pooling**: Managed automatically

### Mongoose Configuration

- **Authentication**: MongoDB username/password auth
- **Auth source**: `admin` database
- **Connection string**: Built from environment variables

## Database Schema

### PostgreSQL Tables (TypeORM Entities)
- `users` - User accounts
- `orders` - Customer orders
- `order_items` - Items within orders
- (Additional tables as entities are added)

### MongoDB Collections (Mongoose Schemas)
- `products` - Product catalog
- `inventory` - Stock levels
- (Additional collections as schemas are added)

## Usage in Modules

### Using PostgreSQL (TypeORM)

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Order, OrderItem])
  ],
  // ...
})
export class OrdersModule {}
```

### Using MongoDB (Mongoose)

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema }
    ])
  ],
  // ...
})
export class ProductsModule {}
```

## Migrations

### TypeORM Migrations (PostgreSQL)

Generate migration:
```bash
npm run typeorm migration:generate -- -n MigrationName
```

Run migrations:
```bash
npm run typeorm migration:run
```

### MongoDB Schema Changes

MongoDB is schemaless, but Mongoose schemas provide validation:
- Schema changes are code-based (no migrations needed)
- Add validation for new fields
- Use default values for backward compatibility

## Connection Health

Check database connections:

```typescript
// PostgreSQL
const connection = await dataSource.query('SELECT 1');

// MongoDB
const status = mongoose.connection.readyState;
// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
```

## Performance Considerations

### PostgreSQL
- Add indexes to frequently queried columns
- Use query builder for complex queries
- Enable query logging in development
- Use connection pooling (default: 10 connections)

### MongoDB
- Create indexes for search fields
- Use projection to limit returned fields
- Enable MongoDB query profiling
- Consider read replicas for scaling

## Backup Strategy

### PostgreSQL
```bash
# Backup
pg_dump -U postgres sawdust_scents > backup.sql

# Restore
psql -U postgres sawdust_scents < backup.sql
```

### MongoDB
```bash
# Backup
mongodump --db sawdust_scents --out /backup

# Restore
mongorestore --db sawdust_scents /backup/sawdust_scents
```

## Development vs Production

### Development
- ✅ TypeORM `synchronize: true` (auto-create tables)
- ✅ Detailed query logging
- ✅ Local database instances

### Production
- ❌ TypeORM `synchronize: false` (use migrations)
- ❌ Minimal logging (errors only)
- ✅ Managed database services (RDS, Atlas)
- ✅ Connection pooling optimization
- ✅ Automated backups
- ✅ Read replicas for scaling

## Troubleshooting

**PostgreSQL connection failed:**
- Verify PostgreSQL is running
- Check credentials in `.env.local`
- Ensure database exists
- Check firewall/network settings

**MongoDB connection failed:**
- Verify MongoDB is running
- Check auth credentials
- Ensure `authSource=admin` in connection string
- Verify network connectivity

## Related Documentation

- [TypeORM Documentation](https://typeorm.io)
- [Mongoose Documentation](https://mongoosejs.com)
- `typeorm.config.ts` - TypeORM CLI configuration


