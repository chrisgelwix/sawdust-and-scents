# Users Module

User management and profile data.

## Overview

Manages user data and profile information. Authentication is handled by Keycloak (AuthModule), while this module stores additional user metadata.

## Responsibilities

- User profile storage
- User preferences
- Order history associations
- User metadata not managed by Keycloak

## Key Components

### User Entity (`entities/user.entity.ts`)
PostgreSQL entity for user data:
- User profile information
- Preferences and settings
- References to Keycloak user ID
- Shipping addresses (saved)
- Contact preferences

## Database Schema

### Users Table (PostgreSQL)

```sql
users
├── id (UUID, PK)
├── keycloak_id (string, unique, FK to Keycloak)
├── email (string, unique)
├── first_name (string)
├── last_name (string)
├── phone (string, nullable)
├── preferences (jsonb)
│   ├── email_notifications: boolean
│   ├── marketing_emails: boolean
│   └── preferred_language: string
├── default_shipping_address (jsonb, nullable)
├── saved_addresses (jsonb[], nullable)
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Architecture Decision: Keycloak + Users Table

### Why Both?

**Keycloak Handles:**
- ✅ Authentication (login/logout)
- ✅ Password management
- ✅ OAuth/OIDC tokens
- ✅ Role assignments
- ✅ Session management
- ✅ Security features (MFA, etc.)

**Users Table Handles:**
- ✅ Application-specific profile data
- ✅ Saved shipping addresses
- ✅ User preferences
- ✅ Order associations
- ✅ Custom business logic

### Data Synchronization

User creation flow:

```
1. User registers in Keycloak
    ↓
2. Keycloak creates user account
    ↓
3. First API request with JWT
    ↓
4. AuthGuard validates token
    ↓
5. If user not in Users table:
    ├─→ Extract info from JWT
    └─→ Create Users record
    ↓
6. Attach user data to request
```

## Current Status

🚧 **Minimal Implementation**

Currently only exports the User entity for use by other modules. Full user profile management endpoints are not yet implemented.

## Planned API Endpoints

### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>
```

### Update Profile
```http
PATCH /users/profile
Authorization: Bearer <token>

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "555-1234",
  "preferences": {
    "emailNotifications": true,
    "marketingEmails": false
  }
}
```

### Manage Addresses
```http
# Add address
POST /users/addresses
Authorization: Bearer <token>

{
  "street": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zip": "62701",
  "country": "US",
  "isDefault": true
}

# Get addresses
GET /users/addresses
Authorization: Bearer <token>

# Update address
PATCH /users/addresses/:id
Authorization: Bearer <token>

# Delete address
DELETE /users/addresses/:id
Authorization: Bearer <token>
```

## Dependencies

- **TypeORM**: Database persistence
- **AuthModule**: Integration with Keycloak
- Used by: OrdersModule (associate orders with users)

## Security Considerations

- Users can only access their own profile
- Email changes should sync with Keycloak
- Soft delete users (maintain order history)
- GDPR compliance: data export/deletion

## Future Enhancements

- [ ] User profile CRUD endpoints
- [ ] Address book management
- [ ] Order history view (via OrdersModule)
- [ ] Wishlist functionality
- [ ] Account deletion (GDPR right to be forgotten)
- [ ] User data export (GDPR data portability)
- [ ] Notification preferences
- [ ] Newsletter subscription management
- [ ] Account activity log

## Data Privacy (GDPR)

User rights to implement:

1. **Right to Access**: Export all user data
2. **Right to Erasure**: Delete user account and data
3. **Right to Rectification**: Update incorrect information
4. **Right to Portability**: Download data in portable format
5. **Right to Object**: Opt-out of marketing

## Testing

Mock TypeORM repository:

```typescript
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn()
};
```

## Integration with Keycloak

### Syncing User Data

User info from Keycloak JWT:

```typescript
{
  sub: 'keycloak-user-id',      // Unique Keycloak ID
  email: 'user@example.com',
  given_name: 'John',
  family_name: 'Doe',
  realm_access: { roles: [...] }
}
```

Store `sub` as `keycloak_id` in Users table for lookups.

### User Creation Example

```typescript
@Injectable()
export class UsersService {
  async findOrCreate(keycloakUser: KeycloakUser) {
    let user = await this.userRepository.findOne({
      where: { keycloakId: keycloakUser.sub }
    });

    if (!user) {
      user = this.userRepository.create({
        keycloakId: keycloakUser.sub,
        email: keycloakUser.email,
        firstName: keycloakUser.given_name,
        lastName: keycloakUser.family_name
      });
      await this.userRepository.save(user);
    }

    return user;
  }
}
```

## Related Documentation

- AuthModule README - Keycloak authentication
- OrdersModule README - User order associations
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- GDPR compliance guidelines


