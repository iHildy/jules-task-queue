# Self-Hosting Jules Task Queue

This guide covers how to self-host the Jules Task Queue system using Docker or manual deployment.

## Quick Start with Docker Compose (Recommended)

The easiest way to self-host is using the provided Docker Compose setup:

### 1. Prerequisites

- Docker and Docker Compose installed
- A GitHub App created with necessary permissions (see "GitHub App Setup" below)
- PostgreSQL database (provided in docker-compose.yml)

### 2. GitHub App Setup

**For comprehensive, step-by-step instructions on creating and configuring your GitHub App, please refer to the dedicated [`GITHUB_APP_SETUP.md`](./GITHUB_APP_SETUP.md) guide in this repository.**

This guide covers all necessary details, including:
- Registering the GitHub App.
- Configuring permissions (Issues: Read & write, Contents: Read-only, Metadata: Read-only).
- Setting up Webhooks (URL, Secret, and subscribed events like Issues, Issue comment, Installation, Installation repositories).
- Generating a private key and noting your App ID.
- Installing the app on your repositories.
- **Crucially, configuring the "Callback URL" and "Setup URL" in your GitHub App settings to point to your application's `/api/github/callback` endpoint (e.g., `https://your-domain.com/api/github/callback` using your `NEXT_PUBLIC_APP_URL`).**

You will need the following key pieces of information from your GitHub App setup for the environment variables:
- App ID (`GITHUB_APP_ID`)
- GitHub App Name (`GITHUB_APP_NAME` - URL-friendly version)
- Private Key contents (`GITHUB_APP_PRIVATE_KEY`)
- Webhook Secret (`GITHUB_WEBHOOK_SECRET`)
- (Optional) Installation ID (`GITHUB_APP_INSTALLATION_ID`)

### 3. Environment Setup

Create a `.env` file in the project root with the following variables. Refer to `.env.example` and `GITHUB_APP_SETUP.md` for details.

```bash
# Application's public URL (IMPORTANT: Used for GitHub App callbacks)
# Example: http://localhost:3000 for local dev, https://your-app.com for production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# GitHub App Configuration (Details in GITHUB_APP_SETUP.md)
GITHUB_APP_ID=your_app_id
GITHUB_APP_NAME=your-github-app-name # URL-friendly name
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_PEM_FILE_CONTENT_HERE\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret
# Optional: For targeting a single, specific installation globally.
GITHUB_APP_INSTALLATION_ID=your_installation_id

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
| `NEXT_PUBLIC_APP_URL`          | Yes         | The publicly accessible base URL of your application (e.g., `http://localhost:3000` or `https://your-app.com`). Used for GitHub App callbacks.                           |
| `GITHUB_APP_ID`                | Yes         | The ID of your GitHub App. Found on the app's settings page.                                                                                                             |
| `GITHUB_APP_NAME`              | Yes         | The URL-friendly name of your GitHub App (e.g., "my-jules-app"). Used for constructing installation URLs.                                                                  |
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
