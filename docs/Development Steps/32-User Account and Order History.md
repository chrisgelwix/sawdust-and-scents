# Step 29: User Account and Order History

## 1. The "Why" Behind This Step: Customer Loyalty

Once a customer buys something, they want to track its progress. The **User Account** area builds trust by showing "Where is my order?" and "What did I buy last time?"

**The Strategy**: We'll fetch data from our PostgreSQL `Orders` table (created in Step 07/12).
- **The Analogy**: This is the customer's personal file folder at the store. It keeps their receipts and tracking numbers in one place.

---

## 2. Core Concepts & Definitions

### 2.1 Protected Routes
- **Definition**: Pages that only logged-in users can see. If you try to go to `/account` without logging in, the app should bounce you to the Login page.

### 2.2 Relational Data Fetching
- **The Logic**: On the backend, we join the `User` and `Orders` tables so that one request returns the user's profile PLUS all their historical orders.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Orders List Component

**File**: `apps/web/src/app/pages/Account/OrderHistory.tsx`

```tsx
import { Table, TableBody, TableCell, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { useAuth } from '../../context/auth-context';

export function OrderHistory() {
  const { user } = useAuth();
  const orders = []; // Fetch from `GET /api/orders/user/${user.sub}`

  return (
    <Paper sx={{ p: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Order ID</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>#{order.id.slice(0, 8)}</TableCell>
              <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Chip label={order.status} color={order.status === 'delivered' ? 'success' : 'primary'} />
              </TableCell>
              <TableCell align="right">${order.total.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
```

---

## 4. Checklist for Success
- [ ] **Security**: Can you see your orders? Can you see someone else's? (Ensure the backend validates the User ID).
- [ ] **Status**: Does the status (Pending/Delivered) update in real-time?

---

**Moving Forward**: The customers are happy. Now the store owner needs a way to manage the business. Next is the **Admin Management Portal**.
