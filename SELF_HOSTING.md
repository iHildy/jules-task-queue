# Self-Hosting Jules Task Queue

This guide covers how to self-host the Jules Task Queue system using Docker or manual deployment.

## Quick Start with Docker Compose (Recommended)

The easiest way to self-host is using the provided Docker Compose setup:

### 1. Prerequisites

- Docker and Docker Compose installed
- A GitHub App created with necessary permissions (see "GitHub App Setup" below)
- PostgreSQL database (provided in docker-compose.yml)

### 2. GitHub App Setup

Before configuring the application, you need to create a GitHub App. This app will grant the system permission to interact with your repositories.

1.  **Navigate to GitHub App Creation:**
    *   Go to your GitHub Settings > Developer settings > GitHub Apps.
    *   Click on "New GitHub App".

2.  **Register New GitHub App:**
    *   **GitHub App name:** Choose a descriptive name (e.g., "Jules SelfHosted" or "My Project Task Queue").
    *   **Homepage URL:** Your application's intended homepage or your GitHub repository URL.
    *   **Callback URL:** While not strictly used for server-to-server flow, you can set this to your application's domain.
    *   **Setup URL:** (Optional) Can be used to redirect users after installation if you implement such a flow.
    *   **Webhook:**
        *   Check **Active**.
        *   **Webhook URL:** `https://your-domain.com/api/webhooks/github` (Replace `your-domain.com` with your actual domain where the app will be hosted).
        *   **Webhook secret:** Generate a strong, random string. You will use this value for the `GITHUB_WEBHOOK_SECRET` environment variable.
    *   **Permissions:**
        *   **Repository permissions:**
            *   **Issues:** Select `Read & write`. This is essential for reading issue details, comments, creating comments, and managing labels.
            *   **Contents:** Select `Read-only`. (Recommended for potential future features or if the app needs to access file content. If you are certain it's not needed, this can be skipped, but it's a common requirement for deeper repository interaction).
            *   **Metadata:** Select `Read-only`. (This is often a default and allows access to basic repository information).
            *   *(Optional) Pull Requests: If you plan to extend functionality to PRs, set to `Read & write`.*
        *   **Organization permissions:** Generally not needed if installing per-repository for self-hosting.
        *   **Account permissions:** Not needed for this server-to-server application.
    *   **Subscribe to events:**
        *   Select `Issues` (for issue open, edit, close, label, etc.).
        *   Select `Issue comment` (for comment creation, edits, deletions).
        *   Select `Installation` (to be notified when the app is installed or uninstalled).
        *   Select `Installation repositories` (to be notified when repositories are added/removed from an installation).
    *   **Where can this GitHub App be installed?:** Choose "Only on this account" if you are installing it on repositories you own directly. Choose "Any account" if you intend for others to install it (less common for a typical self-hosted setup).
    *   Click **Create GitHub App**.

3.  **Generate Private Key:**
    *   After the app is created, you'll land on its settings page.
    *   Scroll down to "Private keys" and click **Generate a private key**.
    *   A `.pem` file will be downloaded. **Store this file securely.** The contents of this file will be used for the `GITHUB_APP_PRIVATE_KEY` environment variable.

4.  **Note App ID:**
    *   On the same app settings page, find the **App ID** (usually near the top). You will use this for the `GITHUB_APP_ID` environment variable.

5.  **Install the App:**
    *   On the left sidebar of your GitHub App's settings page, click "Install App".
    *   Install the app on your account and select the specific repositories you want this application to have access to (or all current and future repositories).
    *   After installation, you might be redirected. The **Installation ID** can often be found in the URL of the configuration page for the installed app (e.g., `https://github.com/settings/installations/YOUR_INSTALLATION_ID`). This ID is needed if you set `GITHUB_APP_INSTALLATION_ID`.

### 3. Environment Setup

Create a `.env` file in the project root:

```bash
# GitHub App Configuration
GITHUB_APP_ID=your_app_id_from_github_app_settings
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_PEM_FILE_CONTENT_HERE\n-----END RSA PRIVATE KEY-----"
# Optional: If your app targets a single, specific installation.
# Can often be derived from webhooks if not set.
GITHUB_APP_INSTALLATION_ID=your_installation_id_from_github
GITHUB_WEBHOOK_SECRET=your_webhook_secret_generated_during_app_creation

# Database (matches docker-compose.yml)
DATABASE_URL=postgresql://jules:jules_password@db:5432/jules_queue

# Security
CRON_SECRET=your_secure_random_string_for_cron_authentication

# Optional
NODE_ENV=production
```

### 3. Deploy

```bash
# Clone the repository
git clone <your-repo>
cd jules-task-queue

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f cron
```

### 4. Services Overview

The Docker Compose setup includes:

- **app**: The Next.js application (port 3000)
- **db**: PostgreSQL database (port 5432)
- **cron**: Automated retry job runner (runs every 30 minutes)

## Manual Installation

If you prefer not to use Docker:

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- pnpm package manager

### 2. Database Setup

Create a PostgreSQL database and update your `.env` file:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/jules_queue
```

### 3. Application Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Build the application
pnpm build

# Start production server
pnpm start
```

### 4. Cron Job Setup

Since you're not using Docker, you need to manually set up the cron job:

#### Option A: System Crontab

Add to your crontab (`crontab -e`):

```bash
# Run Jules retry job every 30 minutes
*/30 * * * * cd /path/to/your/jules-task-queue && pnpm cron:run >> /var/log/jules-cron.log 2>&1
```

#### Option B: Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start pnpm --name "jules-app" -- start

# Start the cron job
pm2 start --name "jules-cron" --cron "*/30 * * * *" pnpm -- cron:run

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option C: Coolify/Other Platforms

In your platform's scheduled tasks:

- **Command**: `pnpm cron:run`
- **Schedule**: `*/30 * * * *` (every 30 minutes)

## Configuration

### Environment Variables

| Variable                       | Required    | Description                                                                                                                                                              |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GITHUB_APP_ID`                | Yes         | The ID of your GitHub App. Found on the app's settings page.                                                                                                             |
| `GITHUB_APP_PRIVATE_KEY`       | Yes         | The contents of the .pem private key file generated for your GitHub App. Should be formatted as a single string with `\n` for newlines if necessary.                       |
| `GITHUB_APP_INSTALLATION_ID`   | No          | (Optional) The ID of the specific installation of your app on an account/repository. If not set, the app may rely on deriving this from webhook payloads for operations. |
| `GITHUB_WEBHOOK_SECRET`        | Yes         | The secret you configured in your GitHub App's webhook settings. Used to verify incoming webhook events.                                                                 |
| `DATABASE_URL`                 | Yes         | PostgreSQL connection string.                                                                                                                                            |
| `CRON_SECRET`                  | Recommended | Secret for authenticating cron job requests.                                                                                                                             |
| `NODE_ENV`                     | No          | Set to `production` for production deployments.                                                                                                                          |

### GitHub App Webhook Verification

The webhook URL (`https://your-domain.com/api/webhooks/github`) and the webhook secret should be configured directly in your GitHub App's settings page (under the "Webhook" section you filled out during App creation). This is different from repository-specific webhooks.

1.  Ensure the **Webhook URL** in your GitHub App settings points to your service's `/api/webhooks/github` endpoint.
2.  Ensure the **Webhook secret** in your GitHub App settings matches the `GITHUB_WEBHOOK_SECRET` value in your `.env` file.
3.  The GitHub App should be configured to send `Issues` and `Issue comment` events (and optionally `Installation`, `Installation repositories` events) to this URL.

## Monitoring & Maintenance

### Health Checks

The system provides several health check endpoints:

```bash
# Application health
curl https://your-domain.com/api/health

# Cron job health
curl https://your-domain.com/api/cron/retry

# Admin health check
curl https://your-domain.com/api/trpc/admin.health
```

### Logs

#### Docker Logs

```bash
# Application logs
docker-compose logs -f app

# Cron job logs
docker-compose logs -f cron

# Database logs
docker-compose logs -f db
```

#### Manual Installation Logs

Check your application logs and cron job logs in the locations you specified.

### Database Maintenance

Clean up old completed tasks periodically:

```bash
# Using tRPC API
curl -X POST "https://your-domain.com/api/trpc/admin.cleanup" \
  -H "Content-Type: application/json" \
  -d '{"olderThanDays": 30}'

# Or using the database directly
psql $DATABASE_URL -c "DELETE FROM \"JulesTask\" WHERE \"createdAt\" < NOW() - INTERVAL '30 days' AND \"flaggedForRetry\" = false;"
```

## Troubleshooting

### Common Issues

#### Cron Jobs Not Running

1. **Docker**: Check if cron container is running: `docker-compose ps`
2. **Manual**: Verify crontab is correctly configured: `crontab -l`
3. **Logs**: Check cron execution logs for errors

#### GitHub Webhook Failures

1. **Secret**: Verify `GITHUB_WEBHOOK_SECRET` matches GitHub configuration
2. **URL**: Ensure webhook URL is accessible from GitHub
3. **Events**: Confirm "Issues" events are selected in GitHub webhook settings

#### Database Connection Issues

1. **URL**: Verify `DATABASE_URL` is correct
2. **Network**: Ensure database is accessible from application
3. **Migrations**: Run `pnpm db:migrate` if using manual installation

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
DEBUG=jules:*

# Or check application logs for detailed information
docker-compose logs -f app | grep -E "(ERROR|WARN|cron)"
```

## Security Considerations

### Production Hardening

1. **Database**: Use strong passwords and limit network access
2. **API Keys**: Store in secure environment variables, not in code
3. **HTTPS**: Always use HTTPS in production
4. **Firewall**: Limit access to necessary ports only
5. **Updates**: Keep Docker images and dependencies updated

### Backup Strategy

```bash
# Database backup
docker-compose exec db pg_dump -U jules jules_queue > backup.sql

# Restore from backup
docker-compose exec -T db psql -U jules jules_queue < backup.sql
```

## Support

- **API Documentation**: See `API_DOCUMENTATION.md` for tRPC endpoint details
- **Issues**: Create GitHub issues for bugs or questions
