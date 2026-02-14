# Step 31d: Monitoring, Error Tracking, and Logging

## 1. The "Why" Behind This Step: The Security Camera

In production, you can't sit and watch the server logs 24/7. **Monitoring** and **Error Tracking** act as your "Security Cameras" and "Alarm System." If something breaks for a customer, you should know about it before they even have a chance to email support.

**The Strategy**: We integrate **Sentry** for errors and **Health Checks** for uptime.
- **The Analogy**: Sentry is like a "Black Box" flight recorder. If the "plane" (your app) crashes, the recorder tells you exactly what the pilot (user) was doing and what went wrong with the engine (code).

---

## 2. Core Concepts & Definitions

### 2.1 Error Tracking (Sentry)
- **Definition**: A service that automatically captures every crash and bug in your app and notifies you instantly.

### 2.2 Health Checks
- **Definition**: A special API endpoint (`/api/health`) that AWS or a monitor pings every 30 seconds. If it doesn't respond with "OK," you know the server is down.

---

## 3. Step-by-Step Implementation

### Step 3.1: Install Sentry

```bash
# For Backend
npm install @sentry/nestjs @sentry/node
# For Frontend
npm install @sentry/react
```

### Step 3.2: Implement API Health Check

**File**: `apps/api/src/app/app.controller.ts`

```typescript
@Get('health')
@Public() // Ensure this is accessible without login
checkHealth() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}
```

---

## 4. Checklist for Success
- [ ] **Sentry Dashboard**: Trigger a fake error (`throw new Error("Test")`). Does it appear on your Sentry dashboard?
- [ ] **Alerts**: Did you receive an email or Slack notification about the error?

---

**CONGRATULATIONS!** You have completed the full development lifecycle for Sawdust & Scents. From your first line of code to production-grade monitoring. You are now ready for the final **Security and Deployment (Steps 32-34)**.
