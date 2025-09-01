# GitHub Branch Protection & CI/CD Setup Guide

This guide will help you configure GitHub branch protection rules to ensure all code passes tests and builds before merging.

## 📋 Prerequisites

- GitHub repository with admin access
- CI workflow configured (`.github/workflows/ci.yml`)
- At least one successful CI run on your repository

## 🛡️ Setting Up Branch Protection Rules

### Step 1: Navigate to Branch Protection Settings

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Branches**
4. Click **Add rule** button

### Step 2: Configure Branch Name Pattern

1. In the **Branch name pattern** field, enter:
   - `main` for protecting main branch
   - `develop` for protecting develop branch
   - `release/*` for protecting all release branches
   - Use `*` to protect all branches

### Step 3: Enable Required Status Checks

#### Required Settings ✅

1. **☑️ Require status checks to pass before merging**
   - This ensures CI passes before merging

2. **☑️ Require branches to be up to date before merging**
   - Forces PR to be rebased/merged with latest changes

3. **Search and select required status checks:**

   > ⚠️ **Important**: Search for the actual status check names created by your CI workflow

   For this project, add these status checks (based on our CI configuration):
   - `CI Status Check` - Main status check that depends on all others
   - `build-and-test` - Ensures build and tests pass
   - `lint` - Code quality checks
   - `security` - Security audit
   - `type-check` - TypeScript validation

### Step 4: Configure Pull Request Requirements

1. **☑️ Require a pull request before merging**
   - Enforces code review process

2. **☑️ Require approvals**
   - Number of required approving reviews: **1** (minimum)
   - Recommended: **2** for production branches

3. **☑️ Dismiss stale pull request approvals when new commits are pushed**
   - Re-requires approval after changes

4. **☑️ Require review from CODEOWNERS**
   - If you have a CODEOWNERS file

### Step 5: Additional Protection Rules

#### Recommended Settings 🔒

1. **☑️ Require signed commits**
   - Ensures commits are verified

2. **☑️ Require conversation resolution before merging**
   - All PR comments must be resolved

3. **☑️ Include administrators**
   - Apply rules to admins too (recommended for production)

4. **☑️ Restrict pushes that create matching branches**
   - Control who can create branches matching this pattern

5. **☑️ Restrict who can push to matching branches**
   - Limit direct pushes to specific users/teams

6. **☑️ Require linear history** (Optional)
   - Prevent merge commits, require rebase workflow

7. **☑️ Require merge queue** (Optional)
   - Automatically manage merging with additional validation

#### Optional Settings ⚙️

1. **Allow force pushes**
   - ❌ Generally not recommended
   - ✅ Only for specific recovery scenarios

2. **Allow deletions**
   - ❌ Not recommended for main/production branches

3. **Lock branch**
   - Makes branch read-only
   - Use for archived or deprecated branches

### Step 6: Save Changes

Click **Create** or **Save changes** to apply the protection rules.

## 🔄 CI/CD Workflow Status Checks

### Understanding Status Checks

Our CI pipeline creates these status checks:

| Status Check        | Purpose             | Required?   | Blocking? |
| ------------------- | ------------------- | ----------- | --------- |
| `CI Status Check`   | Overall CI status   | ✅ Yes      | Yes       |
| `lint`              | Code quality        | ✅ Yes      | Yes       |
| `security`          | Security audit      | ⚠️ Optional | No        |
| `build-and-test`    | Build & tests       | ✅ Yes      | Yes       |
| `type-check`        | TypeScript check    | ✅ Yes      | Yes       |
| `integration-tests` | Integration testing | ⚠️ Optional | No        |

### Troubleshooting Status Checks

#### Status checks not appearing?

1. **Run the workflow at least once**

   ```bash
   git push origin feature/test-branch
   ```

2. **Wait for workflow completion**
   - GitHub needs to register the checks

3. **Search by job name, not workflow name**
   - Search for `build-and-test`, not `CI Pipeline`

4. **Check workflow syntax**
   ```bash
   # Validate workflow locally
   npm install -g @actions/workflow-parser
   workflow-parser .github/workflows/ci.yml
   ```

## 🚀 Local Development Setup

### Initial Setup

```bash
# Install dependencies
npm install

# Set up Husky hooks
npm run prepare

# Make hooks executable (Unix/Linux/macOS)
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### Running CI Locally

```bash
# Run all CI checks locally
npm run ci

# Individual checks
npm run lint        # Linting
npm run test        # Tests
npm run build       # Build
npm run type-check  # TypeScript
```

## 📝 Commit Message Format

We use conventional commits. Format:

```
type(scope): subject

body

footer
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, semicolons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks
- `revert`: Revert previous commit

### Examples

```bash
# Good ✅
git commit -m "feat(auth): add jwt authentication"
git commit -m "fix(api): resolve null pointer exception"
git commit -m "docs: update branch protection guide"

# Bad ❌
git commit -m "Fixed stuff"
git commit -m "WIP"
git commit -m "feat: Added new feature." # No period!
```

## 🔥 Emergency Override Process

For critical hotfixes when checks are failing:

### Option 1: Admin Override (If enabled)

1. Repository admin can merge despite failing checks
2. Must document reason in PR description
3. Create follow-up issue to fix failing checks

### Option 2: Temporary Rule Modification

```bash
# Via GitHub CLI
gh api repos/:owner/:repo/branches/main/protection \
  --method PATCH \
  --field required_status_checks=null

# Don't forget to re-enable after fix!
```

### Option 3: Create Hotfix Branch

1. Create unprotected hotfix branch
2. Apply emergency fix
3. Merge to main with admin override
4. Backport fixes to develop

## 📊 Monitoring CI Performance

### GitHub Actions Insights

1. Go to **Actions** tab
2. Click **Usage** in sidebar
3. Monitor:
   - Workflow run times
   - Success/failure rates
   - Resource usage

### Optimization Tips

1. **Use job matrix efficiently**

   ```yaml
   strategy:
     matrix:
       node: [18.x, 20.x]
       os: [ubuntu-latest]
   ```

2. **Cache dependencies**

   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'
   ```

3. **Run jobs in parallel**
   - Split independent tasks into separate jobs
   - Use `needs: []` only when necessary

4. **Set appropriate timeouts**
   ```yaml
   timeout-minutes: 15
   ```

## 🆘 Common Issues & Solutions

### Issue: "Merging is blocked"

**Solution:**

1. Check Actions tab for failing jobs
2. Fix issues locally
3. Push fixes
4. Re-request review if needed

### Issue: "Required status checks not found"

**Solution:**

1. Ensure workflow has run at least once
2. Search by job name, not workflow name
3. Wait 1-2 minutes after workflow completion

### Issue: "npm ci failing in CI but works locally"

**Solution:**

1. Ensure `package-lock.json` is committed
2. Check Node.js version matches CI
3. Clear npm cache: `npm cache clean --force`
4. Regenerate lock file: `rm package-lock.json && npm install`

### Issue: "Pre-commit hooks not running"

**Solution:**

```bash
# Reinstall Husky
npm run prepare

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

# Test hook
npx husky run pre-commit
```

## 📚 Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [npm ci vs npm install](https://docs.npmjs.com/cli/v8/commands/npm-ci)

## 🎯 Best Practices Summary

1. **Always use `npm ci` in CI/CD** - Ensures reproducible builds
2. **Require status checks** - Prevents broken code from merging
3. **Keep branches up to date** - Avoid integration issues
4. **Use semantic versioning** - Clear version management
5. **Monitor CI performance** - Optimize slow workflows
6. **Document emergency processes** - Be prepared for critical fixes
7. **Regular dependency updates** - Keep security patches current
8. **Use branch protection on main/develop** - Protect critical branches

## 📞 Need Help?

- Check workflow logs in Actions tab
- Review this documentation
- Ask in team Slack channel
- Create GitHub issue for persistent problems

---

_Last updated: 2025_
_Version: 1.0.0_
