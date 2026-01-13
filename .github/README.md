# GitHub Configuration

This directory contains GitHub-specific configuration files for the Sawdust and Scents repository.

## Overview

The `.github` directory houses configuration for:
- GitHub Actions workflows (CI/CD)
- Issue templates (future)
- Pull request templates (future)
- Dependabot configuration (future)
- Community health files

## Directory Structure

```
.github/
├── README.md           # This file
└── workflows/
    └── ci.yml         # Continuous Integration workflow
```

## Workflows

### CI Workflow (`workflows/ci.yml`)

Automated continuous integration pipeline that runs on every push and pull request.

#### Triggers
- **Push** to `main` or `master` branches
- **Pull Requests** targeting `main` or `master` branches

#### Jobs

**Main Job (Ubuntu Latest)**

1. **Checkout Code**
   - Uses `actions/checkout@v4`
   - Full git history (`fetch-depth: 0`) for Nx affected commands

2. **Setup Node.js**
   - Version: Node.js 20
   - Caches npm dependencies for faster builds

3. **Install Dependencies**
   - Runs `npm ci` (clean install from lockfile)
   - Ensures reproducible builds

4. **Nx Affected Detection**
   - Uses `nrwl/nx-set-shas@v4`
   - Determines which projects changed
   - Only tests/builds affected projects (faster CI)

5. **Lint**
   - Runs ESLint on affected projects
   - Ensures code quality standards

6. **Test**
   - Runs Jest tests on affected projects
   - Includes unit tests for all modules

7. **Build**
   - Builds affected projects
   - Verifies production build succeeds

#### Benefits of Nx Affected

Instead of testing/building the entire monorepo on every change:
- ✅ Only affected projects are processed
- ✅ Faster CI pipeline (minutes vs hours)
- ✅ Efficient resource usage
- ✅ Quick feedback for developers

Example: If you only change `apps/web`, the CI won't rebuild `apps/api`.

## CI/CD Best Practices

### Branch Protection Rules (Recommended)

Configure on GitHub:

**For `main` branch:**
- ✅ Require pull request reviews (1+ approvals)
- ✅ Require status checks to pass (CI workflow)
- ✅ Require branches to be up to date
- ✅ Require linear history (no merge commits)
- ✅ Do not allow force pushes
- ✅ Do not allow deletions

### Workflow Status Badge

Add to main README.md:

```markdown
![CI](https://github.com/YOUR_USERNAME/sawdust-and-scents/workflows/CI/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username/organization.

## Future Enhancements

### Issue Templates

Create `.github/ISSUE_TEMPLATE/`:

```yaml
# bug_report.yml
name: Bug Report
description: Report a bug or issue
labels: ["bug", "triage"]
body:
  - type: textarea
    id: description
    attributes:
      label: Description
      description: What happened?
    validations:
      required: true
```

### Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Description
<!-- Describe your changes -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Dependabot Configuration

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

Auto-updates dependencies weekly.

### Additional Workflows

**Planned workflows:**

1. **Deploy to Staging** (`deploy-staging.yml`)
   - Trigger: Push to `develop` branch
   - Deploy API and Web to staging environment
   - Run E2E tests against staging

2. **Deploy to Production** (`deploy-production.yml`)
   - Trigger: Release created or tag pushed
   - Deploy to production AWS/Azure
   - Database migrations
   - Health checks

3. **Security Scanning** (`security.yml`)
   - Trigger: Daily schedule
   - Run npm audit
   - Check for known vulnerabilities
   - CodeQL analysis

4. **Performance Tests** (`performance.yml`)
   - Trigger: Weekly schedule
   - Load testing
   - API response time benchmarks

## Secrets Management

Required GitHub Secrets (Settings → Secrets and variables → Actions):

### For CI/CD Deployments

```bash
# AWS Deployment
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION

# Or Azure Deployment
AZURE_CREDENTIALS
AZURE_RESOURCE_GROUP

# Database
DATABASE_URL_STAGING
DATABASE_URL_PRODUCTION

# External Services
ADP_CLIENT_ID
ADP_CLIENT_SECRET
SHIPPO_API_KEY
STRIPE_SECRET_KEY

# Keycloak
KEYCLOAK_ADMIN_USERNAME
KEYCLOAK_ADMIN_PASSWORD
```

**Never commit secrets to the repository!**

## Environment Variables

Use GitHub Environments for environment-specific variables:

1. **Development**
   - API URL: Development server
   - Feature flags enabled

2. **Staging**
   - API URL: Staging server
   - Test payment providers
   - Debug logging enabled

3. **Production**
   - API URL: Production server
   - Live payment providers
   - Minimal logging

## Workflow Dispatch (Manual Triggers)

For manual deployments, add to workflow:

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        type: choice
        options:
          - staging
          - production
```

Trigger via: Actions → Workflow → Run workflow

## Monitoring CI/CD

### View Workflow Runs
- Navigate to "Actions" tab in GitHub
- See all workflow runs and their status
- View logs for debugging failures

### Notifications
- Configure in GitHub Settings → Notifications
- Get alerts for failed CI builds
- Email or Slack integration

## Troubleshooting

### CI Workflow Fails

**Lint Errors:**
```bash
# Run locally before pushing
nx affected -t lint
```

**Test Failures:**
```bash
# Run locally
nx affected -t test
```

**Build Errors:**
```bash
# Run locally
nx affected -t build
```

### Nx Affected Issues

**Issue:** CI runs all projects, not just affected

**Solution:**
- Ensure `fetch-depth: 0` in checkout action
- Verify `nx-set-shas` action is running
- Check that base branch is correct

### Secrets Not Available

**Issue:** Workflow can't access secrets

**Solution:**
- Verify secrets are added to repository settings
- Check secret names match workflow references
- Ensure workflow has proper permissions

## GitHub Actions Marketplace

Useful actions to consider:

- **Code Coverage**: `codecov/codecov-action`
- **Slack Notifications**: `8398a7/action-slack`
- **Docker Build**: `docker/build-push-action`
- **Terraform**: `hashicorp/setup-terraform`
- **Lighthouse CI**: `treosh/lighthouse-ci-action`

## Best Practices

1. ✅ Keep workflows DRY (use reusable workflows)
2. ✅ Use caching to speed up builds
3. ✅ Run only affected projects (Nx)
4. ✅ Fail fast (exit on first error)
5. ✅ Use matrix builds for multiple Node versions
6. ✅ Separate staging and production deployments
7. ✅ Add status badges to README
8. ✅ Document all custom workflows
9. ✅ Regularly update action versions
10. ✅ Monitor workflow performance

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nx CI Documentation](https://nx.dev/ci/intro/ci-with-nx)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- Main repository README
- `/docs/Development Steps/34-AWS Cloud Infrastructure and Deployment.md`

## Contributing to Workflows

When modifying workflows:

1. Test changes in a fork or feature branch
2. Document any new secrets required
3. Update this README with changes
4. Consider impact on CI time
5. Ensure backward compatibility
6. Add appropriate error handling

## Cost Optimization

GitHub Actions is free for public repositories, but has limits:

- **Public repos**: Unlimited minutes
- **Private repos**: 2,000 minutes/month (free tier)

To optimize:
- Use Nx affected (don't rebuild everything)
- Cache dependencies aggressively
- Use self-hosted runners for heavy workloads
- Avoid redundant workflow runs

---

**Last Updated**: January 2026
**Maintainer**: Development Team


