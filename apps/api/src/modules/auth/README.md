# Auth Module

Authentication and authorization module using Keycloak.

## Overview

Handles user authentication and authorization using Keycloak as the identity provider. Implements OAuth 2.0 / OpenID Connect protocols.

## Responsibilities

- Keycloak integration and configuration
- JWT token validation
- Route protection with guards
- Role-based access control (RBAC)
- Resource-based access control
- Public route decoration

## Key Components

### AuthModule
Configures Keycloak integration and registers global guards.

### AuthController (`auth.controller.ts`)
Provides authentication-related endpoints.

### Guards
- **AuthGuard**: Validates JWT tokens on all routes
- **ResourceGuard**: Checks resource-level permissions
- **RoleGuard**: Validates user roles

### Decorators

#### `@Public()` (`decorators/public.decorator.ts`)
Marks routes as publicly accessible (no authentication required).

```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

#### `@User()` (`decorators/user.decorator.ts`)
Injects the authenticated user into route handlers.

```typescript
@Get('profile')
getProfile(@User() user: KeycloakUser) {
  return user;
}
```

## Configuration

Required environment variables in `.env.local`:

```bash
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=sawdust-scents
KEYCLOAK_CLIENT_ID=api-client
KEYCLOAK_CLIENT_SECRET=your-secret-here
```

## Usage Examples

### Protected Route (Default)
```typescript
@Controller('orders')
export class OrdersController {
  @Get()  // Automatically protected by AuthGuard
  findAll(@User() user: KeycloakUser) {
    return this.ordersService.findByUser(user.sub);
  }
}
```

### Public Route
```typescript
@Controller('products')
export class ProductsController {
  @Public()  // Bypass authentication
  @Get()
  findAll() {
    return this.productsService.findAll();
  }
}
```

### Role-Based Protection
```typescript
@Controller('admin')
@Roles('admin')  // Only admins can access
export class AdminController {
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }
}
```

## Authentication Flow

1. User logs in through Keycloak
2. Keycloak issues JWT access token
3. Frontend sends token in `Authorization: Bearer <token>` header
4. AuthGuard validates token on each request
5. User object is attached to request
6. RoleGuard/ResourceGuard check permissions

## Token Structure

Keycloak JWT contains:
- `sub`: User ID (subject)
- `email`: User email
- `name`: User full name
- `realm_access.roles`: User roles
- `resource_access`: Resource-level permissions

## Security Features

- ✅ All routes protected by default
- ✅ Token signature verification
- ✅ Token expiration checking
- ✅ Role-based access control
- ✅ Secure cookie support
- ✅ CORS configuration

## Testing

Mock authentication in tests:

```typescript
const mockUser = {
  sub: 'user-123',
  email: 'test@example.com',
  realm_access: { roles: ['user'] }
};

// Bypass guards in tests
app = moduleFixture.createNestApplication();
app.useGlobalGuards(/* mock guards */);
```

## Troubleshooting

**401 Unauthorized:**
- Verify token is being sent in Authorization header
- Check token hasn't expired
- Ensure Keycloak server is running

**403 Forbidden:**
- User lacks required role
- Check role configuration in Keycloak
- Verify `@Roles()` decorator usage

## Related Documentation

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [nest-keycloak-connect](https://github.com/ferrerojosh/nest-keycloak-connect)
- OAuth 2.0 / OpenID Connect specifications


