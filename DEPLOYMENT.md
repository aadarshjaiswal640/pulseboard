# Pulseboard Deployment Guide

Pulseboard is a Next.js performance dashboard designed for production deployment on Vercel. This guide walks you through verifying the application locally and deploying it to Vercel via GitHub.

## Prerequisites

- **Git**: Version control system (installed on your machine)
- **GitHub account**: Required to host the repository
- **Vercel account**: Free tier supported; sign up at https://vercel.com
- **Node.js**: Version 18+ (as specified in package.json)
- **npm**: Comes with Node.js

## 1. Verify Locally

Before deploying, verify that the application builds and runs correctly on your machine.

### Install Dependencies

```bash
npm install
```

Expected output: All packages installed with no vulnerabilities.

### Run Linter

```bash
npm run lint
```

Expected output: No linting errors.

### Build for Production

```bash
npm run build
```

Expected output: Build succeeds without errors. Creates `.next/` directory with optimized production bundle.

### Run Production Build Locally

```bash
npm start
```

Expected output: Application starts on `http://localhost:3000` (or available port). You can verify:
- Homepage redirects to `/dashboard`
- All dashboard pages load
- Charts render
- Live stream works
- Data Explorer loads
- Alert Rules page loads
- Settings page loads
- No console errors
- No hydration errors

Press `Ctrl+C` to stop the server.

## 2. Initialize Git Repository

If not already initialized, create a Git repository locally:

```bash
git init
git add .
git commit -m "Initial production release"
```

## 3. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository with a name (e.g., `pulseboard`)
3. **Important**: Do NOT initialize with README, .gitignore, or license — these already exist in your project
4. Copy the repository URL

### Connect Local Repository to GitHub

```bash
git remote add origin https://github.com/<USERNAME>/<REPOSITORY>.git
git branch -M main
git push -u origin main
```

Replace `<USERNAME>` with your GitHub username and `<REPOSITORY>` with your repository name.

**Expected output**: Your code is now pushed to GitHub.

## 4. Deploy to Vercel

### Option A: Connect via Vercel Dashboard (Recommended)

1. Go to https://vercel.com and log in (or sign up)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub account and find your `pulseboard` repository
5. Click **"Import"**

### Configure Project Settings

On the "Configure Project" screen:

- **Framework**: Should auto-detect as "Next.js" ✓
- **Root Directory**: `./` (project root) ✓
- **Build Command**: `npm run build` (auto-detected) ✓
- **Output Directory**: `.next` (auto-detected by Next.js) ✓
- **Install Command**: `npm install` (auto-detected) ✓

**Environment Variables**: No environment variables are required for this application. Leave this section empty.

### Deploy

Click the **"Deploy"** button. Vercel will:
1. Clone your repository
2. Install dependencies
3. Build the application
4. Deploy to Vercel's global network

Expected deployment time: 2–5 minutes.

**You'll receive a live URL** like `https://pulseboard-xyz.vercel.app`

## 5. Expected Vercel Configuration

Vercel automatically detects Next.js projects and applies optimal settings:

| Setting | Value |
|---------|-------|
| **Framework** | Next.js 16.3.5 |
| **Runtime** | Node.js 18+ |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |
| **Environment Variables** | None required |

No custom `vercel.json` is needed. The default Next.js configuration is fully compatible.

## 6. Post-Deployment Verification

After deployment, verify the application works on Vercel:

### Functionality Checklist

- [ ] Homepage loads and redirects to `/dashboard`
- [ ] Dashboard overview loads with 4 charts
- [ ] Live Stream page loads
- [ ] Data Explorer loads with virtualized table
- [ ] Alert Rules page loads
- [ ] Settings page loads and persists changes (uses localStorage)
- [ ] Streaming starts when "Start Stream" is clicked
- [ ] Charts render correctly with Canvas
- [ ] Web Worker processes data (no errors in console)
- [ ] 10K dataset works without lag
- [ ] 100ms interval streams at ~10 updates/sec
- [ ] Data filtering and sorting work
- [ ] CSV export works
- [ ] No console errors
- [ ] No hydration errors
- [ ] No failed network requests

### Performance Observation

Open the browser DevTools (F12) → **Performance Monitor** tab:

- Verify that FPS is smooth (ideally 30+)
- Memory usage should be reasonable for your browser
- No excessive re-renders in React DevTools (if installed)

## 7. Production Performance Benchmark

The application has been locally benchmarked with the following configuration:

**Test Configuration**:
- Dataset: 10,000 data points
- Stream Interval: 100ms
- Duration: 30–60 seconds

**Observed Local Results**:
- Average FPS: ~54.2
- Minimum FPS: Maintained stable
- Updates/sec: ~10 (as expected for 100ms interval)
- Memory: 15–20 MB (varies by browser)

**Note**: These are observed metrics from local browser testing. Vercel deployment performance may vary based on:
- Network latency from your location to Vercel's servers
- Browser and hardware capabilities
- Concurrent users and server load

Vercel provides analytics and monitoring via the Vercel Dashboard. Check your project's Analytics tab for real-time performance data.

## 8. Continuous Deployment

After GitHub is connected to Vercel:

- **Automatic Deployments**: Pushes to `main` branch trigger automatic deployments
- **Preview Deployments**: Pull requests and other branches receive preview URLs for testing
- **Production URL**: The main branch is deployed to your production URL

To deploy a new version:

```bash
git add .
git commit -m "Your change description"
git push origin main
```

Vercel will automatically build and deploy within 2–5 minutes.

## 9. Troubleshooting

### Build Failure on Vercel

**Error**: "Build failed"

**Steps**:
1. Check the Vercel build logs for the specific error message
2. Verify that `npm run build` works locally
3. Ensure all files are committed and pushed to GitHub
4. Try rebuilding: Vercel Dashboard → Project → Deployments → Failed deployment → "Redeploy"

### Missing Environment Variable

**Error**: "ReferenceError: process.env.X is undefined"

**Resolution**: Pulseboard does not require environment variables. This error should not occur. If it does, it indicates an unexpected change to the codebase.

### Hydration Error

**Error**: "Hydration failed" or "Text content mismatch"

**Cause**: Mismatch between server and client rendering.

**Resolution**:
1. Check browser console for specific error
2. Clear browser cache and reload
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Web Worker Not Found

**Error**: "Failed to create Worker" or "dataProcessor.worker.ts not found"

**Cause**: Worker file not deployed correctly.

**Resolution**:
1. Verify `workers/dataProcessor.worker.ts` is committed to Git
2. Check Vercel build logs for any file exclusion warnings
3. Redeploy from Vercel Dashboard

### API Route 404

**Error**: "GET /api/data returns 404"

**Cause**: API route file not deployed.

**Resolution**:
1. Verify `app/api/data/route.ts` is in the repository
2. Restart the Vercel deployment

### Static Asset 404

**Error**: "Image/font/asset fails to load"

**Cause**: Public files not deployed.

**Resolution**:
1. Verify files are in `public/` directory
2. Verify filenames are correct (case-sensitive on Linux-based servers)
3. Check asset URLs in components (should use `/path/to/asset`, not relative paths)

### Git Push Failure

**Error**: "Permission denied (publickey)" or "Repository not found"

**Resolution**:
1. Verify GitHub SSH key is configured: `ssh -T git@github.com`
2. Or use HTTPS with personal access token: `git remote set-url origin https://<TOKEN>@github.com/<USERNAME>/<REPOSITORY>.git`
3. Verify correct repository URL: `git remote -v`

## 10. Additional Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Vercel Documentation**: https://vercel.com/docs
- **Pulseboard README**: See [README.md](./README.md) for architecture and feature details
- **Performance Analysis**: See [PERFORMANCE.md](./PERFORMANCE.md) for optimization details and benchmarking methodology
