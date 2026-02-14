# Step 32: CI/CD Security Integration (Snyk & StackHawk)

In a professional development environment, security is not an afterthought; it is integrated directly into the development lifecycle (DevSecOps). This step covers the integration of automated security scanning tools into your GitHub Actions pipeline to catch vulnerabilities before they ever reach production.

## 1. Core Concepts & Definitions

### Software Composition Analysis (SCA)
SCA is the process of identifying open-source components and third-party libraries used in your application and checking them for known security vulnerabilities (CVEs) and license compliance issues.
*   **Tool**: **Snyk**

### Static Application Security Testing (SAST)
SAST analyzes your source code without executing it to find security flaws such as SQL injection, cross-site scripting (XSS), and insecure coding patterns.
*   **Tool**: **Snyk Code**

### Dynamic Application Security Testing (DAST)
DAST tests the application from the "outside in" by simulating attacks against a running version of the app. It finds vulnerabilities that only appear at runtime, such as configuration errors or authentication flaws.
*   **Tool**: **StackHawk**

### Security Gates
A "gate" is a condition in your CI/CD pipeline that stops the build or deployment if certain criteria are met (e.g., "Fail the build if a High or Critical vulnerability is found").

---

## 2. Setting Up Snyk (SCA & SAST)

Snyk will monitor your `package.json` and source code for vulnerabilities.

### Step 2.1: Get Snyk API Token
1.  Sign up at [snyk.io](https://snyk.io).
2.  Navigate to **Account Settings** -> **Auth Token**.
3.  Copy the token.

### Step 2.2: Add GitHub Secret
In your GitHub repository:
1.  Go to **Settings** -> **Secrets and variables** -> **Actions**.
2.  Click **New repository secret**.
3.  Name: `SNYK_TOKEN`.
4.  Value: Paste your Snyk token.

### Step 2.3: Update GitHub Actions Workflow
Add the Snyk scan step to your `.github/workflows/ci.yml`:

```yaml
  security_scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Snyk Open Source Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Snyk Code (SAST) Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: code test
          args: --severity-threshold=high
```

---

## 3. Setting Up StackHawk (DAST)

StackHawk scans your running API for vulnerabilities. It uses a configuration file (`stackhawk.yml`) to understand how to talk to your app.

### Step 3.1: Get StackHawk API Key
1.  Sign up at [stackhawk.com](https://stackhawk.com).
2.  Go to **Settings** -> **API Keys**.
3.  Copy the key.

### Step 3.2: Add GitHub Secret
1.  Name: `HAWK_API_KEY`.
2.  Value: Paste your StackHawk key.

### Step 3.3: Create `stackhawk.yml`
Create this file in your project root to define the scan target:

```yaml
# stackhawk.yml
app:
  applicationId: your-app-id-from-stackhawk # Get this from StackHawk platform
  env: development
  host: http://localhost:3000
  onFailure: fail # Fail the CI build if vulnerabilities are found
  excludePaths:
    - "/api/docs" # Exclude Swagger UI from the scan
```

### Step 3.4: Update GitHub Actions Workflow
Since DAST requires a *running* app, you typically run this after the build and before/during E2E tests.

```yaml
  dast_scan:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - name: Start API for Scanning
        run: |
          docker-compose up -d postgres mongodb keycloak
          npm install
          npx nx serve api & # Run in background
          sleep 30 # Wait for startup
      
      - name: Run StackHawk Scan
        uses: stackhawk/hawkscan-action@v2
        with:
          apiKey: ${{ secrets.HAWK_API_KEY }}
```

---

## 4. Verification & Best Practices

1.  **Check CI Logs**: Ensure the "Security Scan" jobs are appearing in your GitHub Actions tab.
2.  **Severity Thresholds**: Start with `--severity-threshold=high` to avoid being overwhelmed by low-risk warnings initially.
3.  **Regular Monitoring**: Check the Snyk and StackHawk dashboards weekly for trends and new vulnerabilities discovered in existing code.
4.  **Shift Left**: Install the Snyk IDE extension (for VS Code/Cursor) to catch vulnerabilities while you write code, before you even commit!

## 5. Vocabulary Breakdown

*   **CVE (Common Vulnerabilities and Exposures)**: A list of publicly disclosed computer security flaws.
*   **Vulnerability**: A weakness in an information system, system security procedures, internal controls, or implementation that could be exploited.
*   **False Positive**: When a security tool incorrectly identifies a piece of code as vulnerable when it is actually safe.



