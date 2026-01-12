# ADP Query Syntax Tutorial - Understanding the Queries in Step 13

## Table of Contents
1. [OData Query Language Basics](#1-odata-query-language-basics)
2. [The $filter Parameter Explained](#2-the-filter-parameter-explained)
3. [The $select Parameter Explained](#3-the-select-parameter-explained)
4. [OAuth2 Authentication Flow](#4-oauth2-authentication-flow)
5. [URLSearchParams Explained](#5-urlsearchparams-explained)
6. [Axios Request Configuration](#6-axios-request-configuration)
7. [Real-World Examples with Breakdowns](#7-real-world-examples-with-breakdowns)

---

## 1. OData Query Language Basics

### What is OData?

**OData** (Open Data Protocol) is a standardized way to build and consume RESTful APIs. Many enterprise systems like ADP, Microsoft Dynamics, and SAP use OData.

**The Analogy**: Think of OData like SQL for web APIs. Just like SQL lets you filter and select data from a database, OData lets you filter and select data from a web API.

### Why Does ADP Use OData?

ADP's employee database has thousands of records. Imagine if every time you asked for "active employees," ADP sent you ALL employees (including terminated, on leave, contractors, etc.). That would be:
- **Slow** (massive data transfer)
- **Wasteful** (processing data you don't need)
- **Expensive** (more bandwidth, more processing time)

OData solves this by letting you say: **"Hey ADP, only send me active employees, and only send me their name, email, and job title."**

### OData Query Parameters

| Parameter | Purpose | SQL Equivalent |
|-----------|---------|----------------|
| `$filter` | Filter which records to return | `WHERE` clause |
| `$select` | Choose which fields to return | `SELECT` columns |
| `$top` | Limit number of results | `LIMIT` |
| `$skip` | Skip first N results | `OFFSET` |
| `$orderby` | Sort results | `ORDER BY` |
| `$expand` | Include related data | `JOIN` |

---

## 2. The $filter Parameter Explained

### Basic Syntax

```
$filter="field/subfield/property OPERATOR value"
```

### Common Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equals | `status eq 'Active'` |
| `ne` | Not equals | `status ne 'Terminated'` |
| `gt` | Greater than | `age gt 18` |
| `lt` | Less than | `salary lt 100000` |
| `ge` | Greater or equal | `experience ge 5` |
| `le` | Less or equal | `age le 65` |
| `and` | Logical AND | `status eq 'Active' and dept eq 'Sales'` |
| `or` | Logical OR | `status eq 'Active' or status eq 'OnLeave'` |

### Breaking Down Our ADP Filter Query

**The Query:**
```javascript
$filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'"
```

**Breaking It Down:**

1. **`workAssignment`** - This is the top-level property
   - An employee can have multiple work assignments (e.g., part-time role + full-time role)
   - We're navigating into this nested object

2. **`/assignmentStatus`** - Navigate deeper into the assignment
   - Each assignment has a status (active, terminated, on leave, etc.)

3. **`/statusCode`** - The status is represented as a code object
   - ADP uses codes for standardization across different countries/languages

4. **`/codeValue`** - The actual string value of the status code
   - This is where we find values like "Active", "Terminated", "OnLeave"

5. **`eq 'Active'`** - We're saying: "Only give me records where this value equals 'Active'"

**Visual Representation:**

```
Employee Object (as ADP stores it):
{
  "workerID": { "idValue": "12345" },
  "person": { ... },
  "workAssignment": [                          ← Start here
    {
      "assignmentStatus": {                    ← Navigate to status
        "statusCode": {                        ← Navigate to code
          "codeValue": "Active"                ← Check if this equals "Active"
        }
      },
      "jobTitle": "Software Engineer"
    }
  ]
}
```

**SQL Equivalent:**

If ADP's data were in a SQL database, this filter would be like:

```sql
SELECT * 
FROM employees e
JOIN work_assignments wa ON e.id = wa.employee_id
JOIN assignment_statuses ast ON wa.status_id = ast.id
WHERE ast.code_value = 'Active';
```

### More Filter Examples

**Example 1: Find employees in a specific department**
```javascript
$filter: "workAssignment/organizationalUnit/nameCode/codeValue eq 'IT'"
```

**Example 2: Find employees hired after a certain date**
```javascript
$filter: "workAssignment/hireDate gt '2023-01-01'"
```

**Example 3: Combine multiple conditions**
```javascript
$filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active' and person/communication/emails/emailUri ne null"
```
This says: "Give me active employees who have an email address"

---

## 3. The $select Parameter Explained

### What Does $select Do?

The `$select` parameter tells ADP: **"Only send me these specific fields, not the entire employee record."**

### Why Use $select?

Without `$select`, ADP sends you **everything**:
- Full employment history
- All addresses (home, work, mailing)
- Dependents information
- Tax withholding details
- Benefits enrollment
- Emergency contacts
- Performance reviews
- ...and much more

This could be **megabytes of data per employee**. With 1,000 employees, that's **gigabytes** of unnecessary data transfer!

### Our $select Query

**The Query:**
```javascript
$select: 'workerID,person/legalName,person/communication/emails,workAssignment'
```

**Breaking It Down:**

```
workerID                          ← Get the employee's unique ID
person/legalName                  ← Get their legal name (first, last, middle)
person/communication/emails       ← Get their email addresses
workAssignment                    ← Get their job assignment info
```

**What This Returns:**

```json
{
  "workers": [
    {
      "workerID": { "idValue": "ADP12345" },
      "person": {
        "legalName": {
          "givenName": "John",
          "familyName1": "Doe"
        },
        "communication": {
          "emails": [
            { "emailUri": "john.doe@company.com" }
          ]
        }
      },
      "workAssignment": [
        {
          "jobTitle": "Software Engineer",
          "assignmentStatus": {
            "statusCode": { "codeValue": "Active" }
          }
        }
      ]
    }
  ]
}
```

**What This Doesn't Return** (saved bandwidth):
- Social Security Number
- Home address
- Bank account details
- Tax information
- Salary history
- Performance reviews
- Benefits information
- etc.

### Nested Field Selection

Notice the `/` slash notation:

```javascript
'person/legalName'  ← Navigate into 'person', then get 'legalName'
```

This is like JavaScript object notation:

```javascript
// In JavaScript, you'd write:
employee.person.legalName

// In OData $select, you write:
'person/legalName'
```

### Selecting Multiple Fields

Use **commas** to separate multiple fields:

```javascript
$select: 'field1,field2,object/nestedField,anotherField'
```

**Example:**
```javascript
// Get just the basics for a directory listing
$select: 'workerID,person/legalName,person/communication/emails,workAssignment/jobTitle'
```

---

## 4. OAuth2 Authentication Flow

### What is OAuth2?

**OAuth2** is a security protocol that lets applications access APIs without sharing passwords.

**The Analogy**: Imagine a hotel key card system:
- You show ID at check-in (authenticate with client ID + secret)
- They give you a key card (access token)
- The key card opens your room for 24 hours (token expires)
- After 24 hours, you need to get a new card

### The OAuth2 "Client Credentials" Flow

This is the flow used for **server-to-server** communication (your API talking to ADP):

```
Step 1: Your Server Sends Credentials
   ↓
   POST to https://accounts.adp.com/auth/oauth/v2/token
   Body: {
     grant_type: "client_credentials",
     client_id: "your_client_id",
     client_secret: "your_secret"
   }
   
Step 2: ADP Verifies Credentials
   ↓
   ADP checks: "Is this client_id valid? Does the secret match?"
   
Step 3: ADP Sends Access Token
   ↓
   Response: {
     access_token: "eyJhbGciOiJSUzI1NiIs...",
     token_type: "Bearer",
     expires_in: 3600  // Token valid for 1 hour
   }
   
Step 4: Use Token for API Calls
   ↓
   GET https://api.adp.com/hr/v2/workers
   Header: Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

### Understanding Our getAccessToken() Code

**The Code:**
```typescript
const response = await axios.post(
  adpTokenUrl,
  new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }),
  {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }
);
```

**Parameter Breakdown:**

| Parameter | What It Means | Why We Need It |
|-----------|---------------|----------------|
| `grant_type: 'client_credentials'` | "We're a server, not a user" | Tells ADP this is machine-to-machine auth |
| `client_id` | Your application's username | Identifies YOUR application to ADP |
| `client_secret` | Your application's password | Proves you're authorized to access the API |

**Why URLSearchParams?**

OAuth2 requires data to be sent as **URL-encoded form data**, not JSON. This format looks like:

```
grant_type=client_credentials&client_id=abc123&client_secret=xyz789
```

`URLSearchParams` automatically converts a JavaScript object into this format.

### Token Caching Strategy

**The Problem**: If we request a new token for every API call, we'll be slow and hit rate limits.

**The Solution**: Cache the token in memory.

**Our Implementation:**

```typescript
// Check if we have a valid cached token
if (this.cachedToken && this.tokenExpiration && new Date() < this.tokenExpiration) {
  return this.cachedToken;  // Reuse existing token
}

// Token expired or doesn't exist, get a new one
const response = await axios.post(/* ... */);
this.cachedToken = response.data.access_token;

// Calculate expiration with 5-minute buffer
const expiresIn = response.data.expires_in || 3600;
this.tokenExpiration = new Date(Date.now() + (expiresIn - 300) * 1000);
```

**Why the 5-minute buffer?**

If a token expires at exactly 3:00 PM, and we make a request at 2:59:59 PM, the token might expire while our request is in flight. The 5-minute buffer ensures we never use a token that's about to expire.

**Timeline Example:**

```
Token received: 2:00 PM
Token expires: 3:00 PM (1 hour later)
Our cache expires: 2:55 PM (5 minutes early)

2:00 PM → Request token from ADP
2:01 PM → API call #1 (uses cached token) ✅
2:30 PM → API call #2 (uses cached token) ✅
2:54 PM → API call #3 (uses cached token) ✅
2:56 PM → API call #4 (cache expired, request new token) 🔄
```

---

## 5. URLSearchParams Explained

### What is URLSearchParams?

`URLSearchParams` is a built-in JavaScript class that creates URL-encoded query strings.

### Why Do We Need It?

Different APIs expect data in different formats:

| Format | Example | Use Case |
|--------|---------|----------|
| JSON | `{"name": "John", "age": 30}` | Most modern REST APIs |
| URL-encoded | `name=John&age=30` | OAuth2, HTML forms |
| XML | `<person><name>John</name></person>` | Legacy SOAP APIs |

ADP's OAuth2 endpoint requires **URL-encoded** format.

### Usage Example

**Without URLSearchParams (manual encoding):**
```typescript
const body = `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`;
// Problem: What if clientId contains special characters like & or =?
// Problem: What if clientSecret contains spaces?
```

**With URLSearchParams (automatic encoding):**
```typescript
const body = new URLSearchParams({
  grant_type: 'client_credentials',
  client_id: clientId,
  client_secret: clientSecret,
});
// Automatically handles special characters!
```

### What It Creates

**Input:**
```javascript
new URLSearchParams({
  grant_type: 'client_credentials',
  client_id: 'my-app-123',
  client_secret: 'super$ecret&key'
})
```

**Output (as string):**
```
grant_type=client_credentials&client_id=my-app-123&client_secret=super%24ecret%26key
```

Notice:
- `$` became `%24` (URL encoded)
- `&` became `%26` (URL encoded)

### Why This Matters

OAuth2 servers are very strict. If you don't encode properly:

```typescript
// ❌ BAD - Will fail if secret contains special characters
const body = `client_secret=${clientSecret}`;

// ✅ GOOD - Handles all special characters
const body = new URLSearchParams({ client_secret: clientSecret });
```

---

## 6. Axios Request Configuration

### Understanding HTTP Request Components

Every HTTP request has three main parts:

```
1. URL → WHERE to send the request
2. Headers → Metadata about the request
3. Body → The actual data (for POST/PUT)
```

### Breaking Down Our ADP Request

**The Code:**
```typescript
const response = await axios.get(`${adpApiUrl}/workers`, {
  headers: { 
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  params: {
    $filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'",
    $select: 'workerID,person/legalName,person/communication/emails,workAssignment',
  },
});
```

**Component Breakdown:**

#### 1. The URL
```typescript
`${adpApiUrl}/workers`
// Example: https://api.adp.com/hr/v2/workers
```

This is the endpoint we're calling.

#### 2. The Headers Object
```typescript
headers: { 
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}
```

| Header | Purpose | Example Value |
|--------|---------|---------------|
| `Authorization` | Proves we're authenticated | `Bearer eyJhbGciOiJSUz...` |
| `Content-Type` | Tells server we expect JSON | `application/json` |

**The "Bearer" Prefix:**

OAuth2 tokens must be prefixed with the word "Bearer":
```
Authorization: Bearer YOUR_TOKEN_HERE
```

Why "Bearer"? It means: "The bearer of this token is authorized." Like saying "I am a Bearer of this hotel key card."

#### 3. The Params Object
```typescript
params: {
  $filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'",
  $select: 'workerID,person/legalName,person/communication/emails,workAssignment',
}
```

Axios automatically converts this into a query string:

```
?$filter=workAssignment%2FassignmentStatus%2FstatusCode%2FcodeValue%20eq%20%27Active%27&$select=workerID%2Cperson%2FlegalName%2Cperson%2Fcommunication%2Femails%2CworkAssignment
```

**Final URL:**
```
https://api.adp.com/hr/v2/workers?$filter=workAssignment%2FassignmentStatus%2FstatusCode%2FcodeValue%20eq%20%27Active%27&$select=workerID%2Cperson%2FlegalName%2Cperson%2Fcommunication%2Femails%2CworkAssignment
```

---

## 7. Real-World Examples with Breakdowns

### Example 1: Get Active Employees

**The Full Request:**
```typescript
const response = await axios.get('https://api.adp.com/hr/v2/workers', {
  headers: { 
    Authorization: 'Bearer eyJhbGciOiJSUzI1NiIs...',
    'Content-Type': 'application/json',
  },
  params: {
    $filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'",
    $select: 'workerID,person/legalName,person/communication/emails,workAssignment',
  },
});
```

**What ADP Receives:**
```http
GET /hr/v2/workers?$filter=workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'&$select=workerID,person/legalName,person/communication/emails,workAssignment HTTP/1.1
Host: api.adp.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json
```

**What ADP Sends Back:**
```json
{
  "workers": [
    {
      "workerID": { "idValue": "ADP001" },
      "person": {
        "legalName": { "givenName": "Alice", "familyName1": "Smith" },
        "communication": { "emails": [{ "emailUri": "alice@company.com" }] }
      },
      "workAssignment": [{ "jobTitle": "Engineer" }]
    },
    {
      "workerID": { "idValue": "ADP002" },
      "person": {
        "legalName": { "givenName": "Bob", "familyName1": "Jones" },
        "communication": { "emails": [{ "emailUri": "bob@company.com" }] }
      },
      "workAssignment": [{ "jobTitle": "Designer" }]
    }
  ]
}
```

---

### Example 2: Get Processing Payroll Runs

**The Full Request:**
```typescript
const response = await axios.get('https://api.adp.com/hr/v2/payroll/v1/pay-runs', {
  headers: { Authorization: `Bearer ${token}` },
  params: {
    $filter: "payRunStatus/statusCode/codeValue eq 'Processing'",
    $top: 10,
  },
});
```

**Breaking Down the Query:**

| Parameter | Meaning |
|-----------|---------|
| `$filter: "payRunStatus/statusCode/codeValue eq 'Processing'"` | Only show payroll runs currently being processed |
| `$top: 10` | Limit results to 10 most recent |

**What This Query Asks:**

"Hey ADP, give me up to 10 payroll runs that are currently being processed."

**Why We Need This:**

For the admin dashboard, we want to show:
- "3 payrolls currently processing"
- "Last payroll date: 2026-01-05"

**The Response:**
```json
{
  "payRuns": [
    {
      "payRunID": "PR2026-01-15",
      "payDate": "2026-01-15",
      "payRunStatus": {
        "statusCode": { "codeValue": "Processing" }
      }
    },
    {
      "payRunID": "PR2026-01-08",
      "payDate": "2026-01-08",
      "payRunStatus": {
        "statusCode": { "codeValue": "Processing" }
      }
    }
  ]
}
```

**How We Process It:**
```typescript
return {
  processingPayRuns: response.data.payRuns?.length || 0,  // Count: 2
  lastPayRunDate: response.data.payRuns?.[0]?.payDate || null,  // "2026-01-15"
};
```

---

### Example 3: Get Employee Payroll Details

**The Full Request:**
```typescript
const response = await axios.get(
  `https://api.adp.com/hr/v2/workers/${employeeId}/pay-statements`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
```

**Breaking It Down:**

```
Base URL: https://api.adp.com/hr/v2
Employee-specific endpoint: /workers/{employeeId}/pay-statements
                                           ↑
                                    Replace with actual ID
```

**Example with Real ID:**
```
GET /hr/v2/workers/ADP12345/pay-statements
```

**What We Get Back:**
```json
{
  "payStatements": [
    {
      "payDate": "2026-01-15",
      "grossPay": { "amount": 5000.00 },
      "netPay": { "amount": 3750.00 },
      "taxes": [
        { "type": "Federal", "amount": 850.00 },
        { "type": "State", "amount": 250.00 },
        { "type": "Social Security", "amount": 150.00 }
      ]
    }
  ]
}
```

**Important Security Note:**

This endpoint returns sensitive payroll data. In our code, we:
1. **Don't store** this data in our database
2. **Only show** it to admins or the employee themselves
3. **Log access** for audit trails

---

## 8. Common Query Patterns and Use Cases

### Pattern 1: Filtering by Date Range

**Use Case:** Get employees hired in the last 30 days

```javascript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

params: {
  $filter: `workAssignment/hireDate ge '${thirtyDaysAgo.toISOString()}'`,
  $select: 'workerID,person/legalName,workAssignment/hireDate'
}
```

### Pattern 2: Combining Multiple Conditions

**Use Case:** Get active employees in IT department with email

```javascript
params: {
  $filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active' and " +
           "workAssignment/organizationalUnit/nameCode/codeValue eq 'IT' and " +
           "person/communication/emails/emailUri ne null",
  $select: 'workerID,person/legalName,person/communication/emails'
}
```

### Pattern 3: Pagination

**Use Case:** Get employees in batches of 50

```javascript
// Page 1
params: {
  $top: 50,
  $skip: 0
}

// Page 2
params: {
  $top: 50,
  $skip: 50
}

// Page 3
params: {
  $top: 50,
  $skip: 100
}
```

### Pattern 4: Sorting Results

**Use Case:** Get employees sorted by hire date (newest first)

```javascript
params: {
  $orderby: 'workAssignment/hireDate desc',
  $top: 10
}
```

---

## 9. Debugging Your Queries

### Technique 1: Log the Full URL

```typescript
const fullUrl = axios.getUri({
  url: `${adpApiUrl}/workers`,
  params: {
    $filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'",
    $select: 'workerID,person/legalName'
  }
});
console.log('Full request URL:', fullUrl);
```

### Technique 2: Test in Postman

1. Copy the full URL from logs
2. Open Postman
3. Create a GET request
4. Add `Authorization: Bearer YOUR_TOKEN` header
5. Send and inspect the response

### Technique 3: Check ADP Response Structure

```typescript
try {
  const response = await axios.get(/* ... */);
  
  // Log the structure
  console.log('Response keys:', Object.keys(response.data));
  console.log('First worker:', response.data.workers?.[0]);
  
  return response.data.workers || [];
} catch (error) {
  console.error('Full error response:', error.response?.data);
  throw error;
}
```

### Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Invalid or expired token | Refresh your access token |
| `400 Bad Request` | Invalid $filter syntax | Check OData syntax, ensure proper escaping |
| `404 Not Found` | Wrong API endpoint | Verify API URL and version |
| `429 Too Many Requests` | Rate limit exceeded | Implement exponential backoff |

---

## 10. Performance Optimization Tips

### Tip 1: Always Use $select

```javascript
// ❌ BAD - Transfers megabytes of unnecessary data
axios.get('/workers', {
  params: {
    $filter: "status eq 'Active'"
  }
});

// ✅ GOOD - Only transfers what you need
axios.get('/workers', {
  params: {
    $filter: "status eq 'Active'",
    $select: 'workerID,person/legalName,person/communication/emails'
  }
});
```

**Performance Impact:**
- Without $select: ~50KB per employee
- With $select: ~2KB per employee
- **25x faster** data transfer!

### Tip 2: Use Specific Filters

```javascript
// ❌ BAD - Gets all 10,000 employees, filters in your code
const allEmployees = await getEmployees();
const activeIT = allEmployees.filter(e => 
  e.status === 'Active' && e.department === 'IT'
);

// ✅ GOOD - Only transfers 50 relevant employees
const activeIT = await getEmployees({
  $filter: "status eq 'Active' and department eq 'IT'"
});
```

### Tip 3: Cache Aggressively

```typescript
private cachedEmployees: ADPEmployee[] | null = null;
private cacheExpiration: Date | null = null;

async getActiveEmployees(): Promise<ADPEmployee[]> {
  // Cache for 5 minutes
  if (this.cachedEmployees && this.cacheExpiration && new Date() < this.cacheExpiration) {
    return this.cachedEmployees;
  }
  
  const employees = await this.fetchFromADP();
  this.cachedEmployees = employees;
  this.cacheExpiration = new Date(Date.now() + 5 * 60 * 1000);
  
  return employees;
}
```

---

## 11. Summary Cheat Sheet

### Quick Reference: Common Query Parameters

```javascript
// Get active employees
{
  $filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'",
  $select: 'workerID,person/legalName,person/communication/emails'
}

// Get recent hires (last 30 days)
{
  $filter: "workAssignment/hireDate ge '2025-12-08'",
  $orderby: 'workAssignment/hireDate desc'
}

// Get first 50 employees
{
  $top: 50,
  $skip: 0
}

// Get employees with email addresses
{
  $filter: "person/communication/emails/emailUri ne null",
  $select: 'workerID,person/communication/emails'
}

// Get processing payroll runs
{
  $filter: "payRunStatus/statusCode/codeValue eq 'Processing'",
  $top: 10,
  $orderby: 'payDate desc'
}
```

### Quick Reference: OAuth2 Flow

```typescript
// Step 1: Get token
const tokenResponse = await axios.post(
  'https://accounts.adp.com/auth/oauth/v2/token',
  new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET',
  }),
  {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }
);

const token = tokenResponse.data.access_token;

// Step 2: Use token in API calls
const dataResponse = await axios.get(
  'https://api.adp.com/hr/v2/workers',
  {
    headers: { Authorization: `Bearer ${token}` },
    params: { $filter: "status eq 'Active'" }
  }
);
```

---

## 12. Practice Exercises

Try modifying our queries for these scenarios:

### Exercise 1: Get Employees by Department

**Task:** Get all active employees in the "Engineering" department

**Hint:** Add another `and` condition to the $filter

<details>
<summary>Solution</summary>

```javascript
params: {
  $filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active' and " +
           "workAssignment/organizationalUnit/nameCode/codeValue eq 'Engineering'",
  $select: 'workerID,person/legalName,workAssignment/jobTitle'
}
```
</details>

### Exercise 2: Get Top 5 Newest Employees

**Task:** Get the 5 most recently hired employees, sorted by hire date

**Hint:** Use $orderby and $top

<details>
<summary>Solution</summary>

```javascript
params: {
  $filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'",
  $orderby: 'workAssignment/hireDate desc',
  $top: 5,
  $select: 'workerID,person/legalName,workAssignment/hireDate'
}
```
</details>

### Exercise 3: Get Employees Without Email

**Task:** Find all active employees who don't have an email address

**Hint:** Use the `eq null` operator

<details>
<summary>Solution</summary>

```javascript
params: {
  $filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active' and " +
           "person/communication/emails/emailUri eq null",
  $select: 'workerID,person/legalName,person/communication'
}
```
</details>

---

## Congratulations! 🎉

You now understand:
✅ What OData is and why ADP uses it  
✅ How $filter works to filter data server-side  
✅ How $select works to reduce data transfer  
✅ OAuth2 authentication flow  
✅ URLSearchParams and URL encoding  
✅ Axios request configuration  
✅ How to debug and optimize your queries  

**Next Steps:**
- Experiment with different filter combinations
- Test queries in Postman or curl
- Monitor your application's performance
- Read the [official ADP API documentation](https://developers.adp.com/)


