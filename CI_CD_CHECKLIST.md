# CI/CD Setup Checklist

**Project:** doc2html-arch
**Date:** 2026-06-11
**Status:** ✅ All CI/CD infrastructure created — secrets pending manual configuration

---

## Step 1: GitHub Repository Setup

### Required GitHub Secrets

| Secret Name | Where to get it | Purpose |
|------------|----------------|---------|
| `DOCKER_USERNAME` | [Docker Hub](https://hub.docker.com/settings/general) | Login for `build.yml` to push images |
| `DOCKER_PASSWORD` | Docker Hub account password or access token | Password for Docker Hub login |
| `NPM_TOKEN` | [npmjs.com → Account → Access Tokens](https://www.npmjs.com/settings/tokens) | Publish to npm (`release.yml`) |

> **To add secrets:** GitHub repo → Settings → Secrets and variables → Actions → New repository secret

### Recommended GitHub Settings

- [ ] Enable **Actions** permissions (Settings → Actions → General → Allow GitHub Actions)
- [ ] Require PR reviews before merge (Settings → Branches → Add rule → main)
- [ ] Require status checks to pass before merge
- [ ] Enable **Dependabot** (Security → Dependabot alerts → Dependabot security updates)

---

## Step 2: Docker Hub Setup

- [ ] Create account at [hub.docker.com](https://hub.docker.com)
- [ ] Create public repository named **`doc2html-arch`**
- [ ] Note the repository URL: `docker.io/your-username/doc2html-arch`
- [ ] Create an **access token** (Account → Security → Access Tokens) instead of using your password directly

---

## Step 3: npm.js Setup

- [ ] Create account at [npmjs.com](https://www.npmjs.com)
- [ ] Verify email address
- [ ] Create an **Automation token** (Account → Access Tokens → Create Automation token)
  - This token bypasses 2FA during CI/CD
- [ ] Note the package name: `doc2html-arch` (must be unique — you may need a scoped name like `@yourusername/doc2html-arch`)

---

## Step 4: Verify Workflows

### test.yml — Auto-runs on every push/PR
```bash
# Check workflow syntax
npx yamllint .github/workflows/test.yml

# Local simulate (dry-run)
# No local equivalent — rely on first push to main
```

- [ ] Push a test commit to verify `test.yml` runs on push
- [ ] Open a test PR to verify `test.yml` runs on PR

### build.yml — Runs on push to main + releases
- [ ] Push to main → check Docker Hub for new image tag
- [ ] Image should appear as `latest` + `sha-xxxxxxx`

### release.yml — Runs when a GitHub Release is published
- [ ] Create a draft release in GitHub → publish it → verify npm publish
- [ ] Package appears on npmjs.com

---

## Step 5: Local Version Management

```bash
# Make release.sh executable
chmod +x scripts/release.sh

# Dry-run (won't commit anything)
./scripts/release.sh --dry-run patch # (patch/minor/major or1.2.3)

# Actual release
./scripts/release.sh patch   # Bump patch version
git push origin main
git push origin v0.1.1
# Then create GitHub Release on GitHub.com UI
```

- [ ] Verify `chmod +x scripts/release.sh`
- [ ] Verify `scripts/release.sh patch` works on a feature branch
- [ ] Check `CHANGELOG.md` was updated with new version header

---

## Step 6: CI/CD Files Created

| File | Purpose |
|------|---------|
| `.github/workflows/test.yml` | CI: lint, build, test on Node18/20/22 |
| `.github/workflows/build.yml` | Build & push Docker image on main/release |
| `.github/workflows/release.yml` | npm publish on GitHub Release |
| `.github/dependabot.yml` | Auto-update dependencies weekly |
| `.github/ISSUE_TEMPLATE/` | (optional) Bug/feature issue templates |
| `scripts/release.sh` | Local version bumping script |
| `.dockerignore` | Exclude dev/test/docs from Docker context |
| `.npmrc` | npm publish registry + public access |
| `CHANGELOG.md` | Keep a Changelog format |
| `CONTRIBUTING.md` | Contribution guidelines |
| `SECURITY.md` | Security policy + vulnerability reporting |

---

## Step 7: First Release Checklist

Before publishing v1.0.0:

- [ ] All215 tests pass locally
- [ ] `npm run build` clean
- [ ] Docker image builds and runs locally
- [ ] GitHub secrets configured (DOCKER_USERNAME, DOCKER_PASSWORD, NPM_TOKEN)
- [ ] npm package name confirmed available
- [ ] License file present (MIT — from `package.json` license field)
- [ ] README badges point to correct repository
- [ ] SECURITY.md has reporting instructions
- [ ] CHANGELOG.md has v1.0.0 entry

---

## Step 8: README Badges

Replace the placeholders in README.md with your actual badge URLs:

```markdown
[![Test](https://github.com/<OWNER>/doc2html-arch/actions/workflows/test.yml/badge.svg)](https://github.com/<OWNER>/doc2html-arch/actions/workflows/test.yml)
[![Build & Push](https://github.com/<OWNER>/doc2html-arch/actions/workflows/build.yml/badge.svg)](https://github.com/<OWNER>/doc2html-arch/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/doc2html-arch)](https://www.npmjs.com/package/doc2html-arch)
[![Docker Pulls](https://img.shields.io/docker/pulls/yourusername/doc2html-arch)](https://hub.docker.com/r/yourusername/doc2html-arch)
```

---

## Workflow Trigger Summary

| Event | Workflows Run |
|-------|-------------|
| Push to any branch | `test.yml` |
| PR to main | `test.yml` |
| Push to main | `test.yml` + `build.yml` |
| GitHub Release published | `release.yml` + `build.yml` |
| Weekly schedule | Dependabot auto-opens PRs |