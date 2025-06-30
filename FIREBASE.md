# Firebase Deployment Guide for Jules Task Queue

This guide covers how to deploy the Jules Task Queue system using Firebase App Hosting and Cloud Functions.

## Overview

Firebase deployment consists of:

- **Firebase App Hosting**: Hosts the Next.js application
- **Cloud Functions**: Handles scheduled cron jobs by calling App Hosting endpoints
- **Centralized Architecture**: All retry logic lives in App Hosting, functions just trigger it
- **Firebase Extensions**: Optional database and authentication services

## Architecture Benefits

This deployment uses a **centralized architecture** where:

- All business logic stays in the App Hosting instance
- Cloud Functions simply trigger the existing `/api/cron/retry` endpoint
- No code duplication between platforms (Docker, Vercel, Firebase)
- Easier maintenance and consistent behavior
- Database connections are handled in one place

## Prerequisites

### 1. Firebase Project Setup

- Firebase project on **Blaze (Pay-as-you-go)** plan
- Firebase CLI installed (`npm install -g firebase-tools`)
- GitHub repository with your forked version of this project

### 2. Required Environment Variables

You'll need these values during setup:

- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_APP_ID`: GitHub App ID from your app settings
- `GITHUB_APP_PRIVATE_KEY`: GitHub App private key (base64 encoded)
- `GITHUB_APP_WEBHOOK_SECRET`: Secret for GitHub App webhook verification
- `GITHUB_APP_CLIENT_ID`: GitHub App client ID (optional)
- `GITHUB_APP_CLIENT_SECRET`: GitHub App client secret (optional)
- `GITHUB_APP_NAME`: Your GitHub App name (optional)
- `CRON_SECRET`: Random string for cron job authentication

## Step-by-Step Deployment

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Clone and Setup Project

You can either fork the repository or clone it directly:

**Option A: Clone directly (recommended for most users):**

```bash
# Clone the repository
git clone https://github.com/iHildy/jules-task-queue.git
cd jules-task-queue

# Install dependencies
pnpm install
```

**Option B: Fork first (if you plan to make modifications):**

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/jules-task-queue.git
cd jules-task-queue

# Install dependencies
pnpm install
```

### 4. Initialize Firebase App Hosting

```bash
firebase init apphosting
```

**Configuration prompts:**

- **Project**: Select your Firebase project
- **Backend name**: `jules-task-queue` (or your preferred name)
- **Region**: `us-central1` (recommended)
- **Root directory**: `.` (current directory)
- **GitHub repository**: Connect your forked repository
- **Live branch**: `main` (or your default branch)
- **Automatic rollouts**: `Yes` (recommended)

### 5. Set Environment Variables

Set up your environment variables as Firebase secrets:

```bash
# Database connection
firebase apphosting:secrets:set DATABASE_URL
# Enter your PostgreSQL connection string when prompted

# GitHub App configuration
firebase apphosting:secrets:set GITHUB_APP_ID
# Enter your GitHub App ID when prompted

firebase apphosting:secrets:set GITHUB_APP_PRIVATE_KEY
# Enter your GitHub App private key when prompted

firebase apphosting:secrets:set GITHUB_APP_WEBHOOK_SECRET
# Enter your GitHub App webhook secret when prompted

firebase apphosting:secrets:set GITHUB_APP_CLIENT_ID
# Enter your GitHub App client ID when prompted (optional)

firebase apphosting:secrets:set GITHUB_APP_CLIENT_SECRET
# Enter your GitHub App client secret when prompted (optional)

firebase apphosting:secrets:set GITHUB_APP_NAME
# Enter your GitHub App name when prompted (optional)

# Cron job security
firebase apphosting:secrets:set CRON_SECRET
# Enter a secure random string when prompted
```

### 6. Deploy App Hosting

```bash
firebase deploy --only apphosting
```

This will:

- Upload your source code to Google Cloud Storage
- Build your Next.js application using Cloud Build
- Deploy to Cloud Run and Cloud CDN
- Provide you with a live URL: `https://your-backend-id--your-project-id.us-central1.hosted.app`

### 7. Set Up Cloud Functions for Cron Jobs

Since Firebase App Hosting doesn't have built-in cron support, we'll use Cloud Functions to trigger the retry logic. The project includes pre-configured Cloud Functions that call your App Hosting instance.

#### Option A: Use Pre-configured Functions (Recommended)

The repository already includes Cloud Functions configuration. Simply deploy them:

```bash
# Navigate to the functions directory
cd functions

# Install function dependencies
npm install

# Build the functions
npm run build

# Return to project root
cd ..

# Deploy functions
firebase deploy --only functions
```

#### Option B: Initialize from Scratch (if needed)

If you need to reinitialize the functions:

```bash
# Initialize Cloud Functions
firebase init functions
```

**Configuration prompts:**

- **Language**: TypeScript (recommended)
- **Source directory**: `functions`
- **ESLint**: Yes (recommended)
- **Install dependencies**: Yes
- **Overwrite existing files**: No (unless you want to start fresh)

### 8. Configure Cloud Function Environment

The Cloud Functions need to know your App Hosting URL. You have two options:

**Option A: Automatic URL Detection (Recommended)**
The functions will automatically detect your App Hosting URL using your project ID and backend name.

**Option B: Manual Configuration**
If automatic detection doesn't work, set the URL manually:

```bash
# Set as a Firebase Functions secret (recommended)
firebase functions:secrets:set FIREBASE_APP_HOSTING_URL
# Enter: https://jules-task-queue--YOUR_PROJECT_ID.us-central1.hosted.app

# OR set via config (legacy method)
firebase functions:config:set app_hosting.url="https://jules-task-queue--YOUR_PROJECT_ID.us-central1.hosted.app"
```

**Important**: Replace `jules-task-queue` with your actual backend ID and `YOUR_PROJECT_ID` with your Firebase project ID.

### 9. Understanding the Functions Architecture

The Cloud Functions use a **centralized approach** that calls your App Hosting `/api/cron/retry` endpoint, avoiding code duplication:

**Functions included:**

1. **`retryTasks`**: Runs every 30 minutes, calls your App Hosting retry endpoint
2. **`retryTasksHealth`**: Runs every 6 hours, checks system health via `/api/health`
3. **`triggerRetryManual`**: Manual trigger for testing (never runs automatically)

**Benefits of this approach:**

- Single source of truth for retry logic in App Hosting
- No database connection needed in functions
- Easier maintenance and debugging
- Consistent behavior across deployment methods
- Reduced cold start times

### 10. Deploy Cloud Functions

```bash
# Deploy only functions
firebase deploy --only functions

# View deployment status
firebase functions:list

# Check function logs
firebase functions:log --limit 20
```

### 11. Verify Functions Deployment

```bash
# Check all functions are deployed
firebase functions:list

# View recent execution logs
firebase functions:log retryTasks --limit 10

# Test manual trigger (optional)
firebase functions:shell
# In the shell, run: triggerRetryManual()
```

### 12. Local Testing and Development

#### Prerequisites

1. **Firebase CLI**: Install globally

   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

#### Environment Setup

1. **Create functions environment file**:

   ```bash
   cd functions
   cp local.env.example .env.local
   ```

2. **Edit `.env.local`** with your values:

   ```bash
   # Your local development URL
   FIREBASE_APP_HOSTING_URL=http://localhost:3000

   # Your Firebase project ID
   GCLOUD_PROJECT=your-firebase-project-id

   # Test secret (should match your local app's CRON_SECRET)
   CRON_SECRET=your-local-test-secret
   ```

#### Starting the Development Environment

1. **Start the main Next.js app**:

   ```bash
   pnpm dev
   ```

   This runs your app at `http://localhost:3000`

2. **In a new terminal, start Firebase Functions emulator**:

   ```bash
   cd functions
   npm run serve
   ```

   This starts the functions emulator at `http://localhost:5001`

3. **In a third terminal, you can watch function builds**:
   ```bash
   cd functions
   npm run build:watch
   ```

#### Testing the Setup

**Test App Hosting Endpoints Manually**

```bash
# Test the retry endpoint
curl -X POST http://localhost:3000/api/cron/retry \
  -H "Authorization: Bearer your-local-test-secret" \
  -H "Content-Type: application/json"

# Test the health endpoint
curl http://localhost:3000/api/health
```

**Test Cloud Functions**

**Option 1: Use the automated test runner**

```bash
cd functions
node test-functions.js
```

**Option 2: Test individual functions manually**

```bash
# Test manual retry trigger
curl -X POST http://localhost:5001/YOUR_PROJECT_ID/us-central1/triggerRetryManual

# Test health check
curl -X POST http://localhost:5001/YOUR_PROJECT_ID/us-central1/retryTasksHealth

# Test main retry function
curl -X POST http://localhost:5001/YOUR_PROJECT_ID/us-central1/retryTasks
```

**Option 3: Use Firebase Functions shell**

```bash
cd functions
npm run shell

# In the shell:
> retryTasks()
> retryTasksHealth()
> triggerRetryManual()
```

#### Development Scripts

The functions package includes several helpful scripts:

```bash
# Build functions
npm run build

# Watch and rebuild on changes
npm run build:watch

# Start emulator
npm run serve

# Start emulator with debug logging
npm run serve:debug

# Run automated tests
npm run test

# Start both watch mode and emulator (development mode)
npm run dev

# Deploy to production
npm run deploy

# View production logs
npm run logs
```

#### Function URLs

When running locally, your functions will be available at:

- **Retry Tasks**: `http://localhost:5001/YOUR_PROJECT_ID/us-central1/retryTasks`
- **Health Check**: `http://localhost:5001/YOUR_PROJECT_ID/us-central1/retryTasksHealth`
- **Manual Trigger**: `http://localhost:5001/YOUR_PROJECT_ID/us-central1/triggerRetryManual`

#### Debugging Tips

1. **Check emulator logs**: The Firebase emulator shows detailed logs for function execution
2. **Enable debug mode**: Use `npm run serve:debug` for more verbose logging
3. **Test the centralized architecture**: Functions call your App Hosting endpoints, so test both layers
4. **Check environment variables**: Ensure `.env.local` is correctly configured
5. **Verify database connection**: Make sure your local app can connect to your database

#### Common Issues

- **CORS errors**: Make sure your Next.js app allows the Firebase Functions user agent
- **Authentication errors**: Verify your `CRON_SECRET` matches between app and functions
- **URL not found**: Check that `FIREBASE_APP_HOSTING_URL` points to your running app
- **Database connection**: Ensure your `DATABASE_URL` is accessible from your local environment

## Database Setup

### Option 1: Supabase (Recommended)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → Database
3. Copy your connection string (postgres://...)
4. Use this as your `DATABASE_URL`

### Option 2: Google Cloud SQL

1. Create a PostgreSQL instance in Google Cloud Console
2. Configure authorized networks or use Cloud SQL Proxy
3. Create a database named `jules_queue`
4. Use the connection string as your `DATABASE_URL`

### Option 3: External PostgreSQL

Use any PostgreSQL provider (AWS RDS, DigitalOcean, etc.) and provide the connection string.

## Database Migration

After setting up your database, run migrations:

```bash
# Install dependencies locally
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

## GitHub App Setup

**Note**: Webhooks are automatically configured when users install your GitHub App.

1. Create your GitHub App following the [GitHub App Setup Guide](./GITHUB_APP_SETUP.md)
2. Configure your GitHub App webhook URL to: `https://your-backend-id--your-project-id.us-central1.hosted.app/api/webhooks/github-app`
3. Users can install your app on their repositories by visiting your app's installation page
4. Installation and webhook management is handled automatically

## Configuration Files

### apphosting.yaml

The project includes an `apphosting.yaml` file that configures your App Hosting deployment with optimized settings:

```yaml
# Firebase App Hosting configuration for Jules Task Queue
# Cloud Run service settings optimized for a queue processing system
runConfig:
  # Keep at least 1 instance warm to handle webhooks quickly
  minInstances: 1
  # Scale up to handle traffic spikes
  maxInstances: 10
  # Allow multiple concurrent requests per instance
  concurrency: 80
  # 1 CPU should be sufficient for most operations
  cpu: 1
  # 1GB memory for database operations and task processing
  memoryMiB: 1024

# Environment variables and secrets
env:
  # Database connection - using secret for security
  - variable: DATABASE_URL
    secret: DATABASE_URL

  # GitHub integration - using secrets for security
  - variable: GITHUB_TOKEN
    secret: GITHUB_TOKEN

  - variable: GITHUB_WEBHOOK_SECRET
    secret: GITHUB_WEBHOOK_SECRET

  # Cron job authentication
  - variable: CRON_SECRET
    secret: CRON_SECRET

  # Next.js environment
  - variable: NODE_ENV
    value: production
    availability:
      - BUILD
      - RUNTIME

  # Optimize Next.js build
  - variable: NEXT_TELEMETRY_DISABLED
    value: "1"
    availability:
      - BUILD
      - RUNTIME
```

This configuration:

- Keeps 1 instance warm for quick webhook response
- Allows scaling up to 10 instances under load
- Uses Firebase secrets for sensitive data
- Optimizes memory and CPU for the workload

### firebase.json

The project includes a `firebase.json` file with optimal configuration:

```json
{
  "apphosting": [
    {
      "backendId": "jules-task-queue",
      "rootDir": ".",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        ".next",
        "out",
        "build",
        "coverage",
        ".env*",
        ".vercel",
        "*.md",
        "*.log",
        ".DS_Store",
        "Thumbs.db"
      ]
    }
  ],
  "functions": [
    {
      "source": "functions",
      "codebase": "default"
    }
  ]
}
```

## Monitoring and Logs

### Application Logs

```bash
# View App Hosting logs
firebase apphosting:backends:logs your-backend-id

# View Function logs
firebase functions:log
```

### Firebase Console

Monitor your deployment at [console.firebase.google.com](https://console.firebase.google.com):

- **App Hosting**: View rollouts, usage, and performance
- **Functions**: Monitor function executions and logs
- **Extensions**: Manage additional Firebase services

## Custom Domain (Optional)

1. Go to Firebase Console → App Hosting → your backend
2. Click "Connect domain"
3. Follow the DNS configuration steps
4. Update your GitHub webhook URL to use the custom domain

## Troubleshooting

### Common Issues

**App Hosting Build Failures**

- Check build logs in Firebase Console
- Verify all environment variables are set
- Ensure `package.json` build script works locally

**Function Deployment Errors**

- Verify you're on the Blaze plan
- Check function logs for runtime errors
- Ensure all required secrets are set

**Database Connection Issues**

- Verify `DATABASE_URL` format and credentials
- Check if database allows connections from Google Cloud
- Test connection string locally first

**GitHub Webhook Failures**

- Verify webhook URL is accessible
- Check webhook secret matches `GITHUB_WEBHOOK_SECRET`
- Ensure "Issues" events are selected

### Debug Commands

```bash
# Check App Hosting status
firebase apphosting:backends:get your-backend-id

# Test function locally
firebase functions:shell

# View detailed logs
firebase functions:log --only retryTasks
```

## Support

- **Firebase Documentation**: [firebase.google.com/docs/app-hosting](https://firebase.google.com/docs/app-hosting)
- **Community Support**: [Firebase Discord](https://discord.gg/firebase)
- **Project Issues**: [GitHub Issues](https://github.com/iHildy/jules-task-queue/issues)

## Migration from Other Platforms

### From Vercel

1. Export environment variables from Vercel
2. Follow the deployment steps above
3. Update your GitHub webhook URL
4. Test the deployment thoroughly
5. Update DNS records if using custom domain

### From Docker/Self-Hosted

1. Export your database (if applicable)
2. Set up new database on Firebase/Supabase
3. Import your data
4. Follow the deployment steps above
5. Update GitHub webhook configuration

---

**Need help?** Create an issue in the GitHub repository with your deployment logs and configuration details.
