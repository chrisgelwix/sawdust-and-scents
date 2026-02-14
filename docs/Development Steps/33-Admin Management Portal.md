# Step 30: Admin Management Portal (UI)

## 1. The "Why" Behind This Step: The Cockpit

While customers use the storefront, the business owner uses the **Management Portal**. This is where they manage inventory, fulfill orders, and sync employee data with ADP.

**The Strategy**: A dedicated dashboard layout with side navigation for different admin modules.
- **The Analogy**: This is the "Back Office" of the shop. It's where the manager looks at the spreadsheets and decides what to restock.

---

## 2. Core Concepts & Definitions

### 2.1 Role-Based Access Control (RBAC)
- **Definition**: Restricting access based on a user's role (e.g., only "Admins" can see the Management Portal).
- **The Logic**: We check the Keycloak token for the `realm:admin` role before rendering this section of the app.

### 2.2 Data Tables with Actions
- **The Logic**: Admins don't just see data; they act on it. A table of orders should have buttons like "Mark as Shipped" or "Issue Refund."

---

## 3. Step-by-Step Implementation

### Step 3.1: The Admin Sidebar Layout

**File**: `apps/web/src/app/pages/Admin/AdminLayout.tsx`

```tsx
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer variant="permanent" sx={{ width: 240 }}>
        <List>
          <ListItem button onClick={() => navigate('/admin')}>
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Overview" />
          </ListItem>
          <ListItem button onClick={() => navigate('/admin/inventory')}>
            <ListItemIcon><InventoryIcon /></ListItemIcon>
            <ListItemText primary="Inventory" />
          </ListItem>
          <ListItem button onClick={() => navigate('/admin/employees')}>
            <ListItemIcon><PeopleIcon /></ListItemIcon>
            <ListItemText primary="Employees" />
          </ListItem>
        </List>
      </Drawer>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
```

---

## 4. Checklist for Success
- [ ] **Security**: Try to visit `/admin` as a regular customer. Do you get "Access Denied"?
- [ ] **ADP Sync**: Does the "Sync Employees" button trigger the logic we built in Step 13?

---

**Moving Forward**: Every modern store needs a helpful assistant. Our final feature is the **Chatbot Interface (Rowan)**.
