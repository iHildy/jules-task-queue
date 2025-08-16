# Self-Hosting Jules Task Queue

This guide covers how to self-host the Jules Task Queue system using Docker or manual deployment.

## Quick Start with Docker Compose (Recommended)

The easiest way to self-host is using the provided Docker Compose setup:

### 1. Prerequisites

- Docker and Docker Compose installed
- GitHub App credentials (see [GitHub App Setup Guide](./GITHUB_APP_SETUP.md))

### 2. Clone the repository

```bash
git clone https://github.com/ihildy/jules-task-queue.git
cd jules-task-queue
```

### 3. Environment Setup

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

**Important:** We recommend `.env` over `.env.local` because Prisma is picky about environment file locations.

Edit the `.env` file with your specific configuration. See `.env.example` for all available options and their descriptions.

**Key variables you need to configure:**

- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_APP_ID`: Your GitHub App ID
- `NEXT_PUBLIC_GITHUB_APP_NAME`: Your GitHub App name (for display)
- `GITHUB_APP_PRIVATE_KEY`: Your GitHub App private key
- `GITHUB_APP_WEBHOOK_SECRET`: Webhook verification secret
- `GITHUB_APP_CLIENT_ID` & `GITHUB_APP_CLIENT_SECRET`: For OAuth (optional)

**Note:** For `GITHUB_APP_PRIVATE_KEY`, you can either:

- Base64 encode your private key: `cat private-key.pem | base64`
- Or use the raw PEM format with `\n` escaped as `\\n`

### 4. Deploy

#### Full Self-Hosting (with database and cron)

```bash
# Start all services including PostgreSQL database and cron
docker-compose -f docker-compose.selfhost.yml up -d

# Check status
docker-compose -f docker-compose.selfhost.yml ps

# View logs
docker-compose -f docker-compose.selfhost.yml logs -f app
docker-compose -f docker-compose.selfhost.yml logs -f cron
```

#### Coolify/Platform Hosting (app only)

If you're using Coolify or another platform that provides managed databases and cron jobs:

```bash
# Use the standard docker-compose file
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 5. Services Overview

The self-hosting Docker Compose setup (`docker-compose.selfhost.yml`) includes:

- **app**: The Next.js application (port 3000)
- **db**: PostgreSQL database (port 5432)
- **cron**: Automated retry job runner (runs every 30 minutes)

The platform hosting setup (`docker-compose.yml`) includes:

- **app**: The Next.js application only (expects external database and cron)

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

#### Option B: Coolify/Other Platforms

In your platform's scheduled tasks:

- **Command**: `pnpm cron:run`
- **Schedule**: `*/30 * * * *` (every 30 minutes)

## Configuration

### Environment Variables

| Variable                      | Build Variable | Description                                             |
| ----------------------------- | -------------- | ------------------------------------------------------- |
| `DATABASE_URL`                | No             | PostgreSQL connection string                            |
| `NEXT_PUBLIC_GITHUB_APP_ID`   | Yes            | GitHub App ID from your app settings                    |
| `NEXT_PUBLIC_GITHUB_APP_NAME` | Yes            | GitHub App name (for client-side display)               |
| `GITHUB_APP_PRIVATE_KEY`      | No             | GitHub App private key (base64 encoded or with \n)      |
| `GITHUB_APP_WEBHOOK_SECRET`   | No             | Secret used to verify GitHub App webhook signatures     |
| `GITHUB_APP_CLIENT_ID`        | No             | GitHub App client ID (for OAuth user access tokens)     |
| `GITHUB_APP_CLIENT_SECRET`    | No             | GitHub App client secret (for OAuth user access tokens) |
| `GITHUB_APP_CALLBACK_URL`     | No             | Callback URL for GitHub App OAuth flow                  |
| `CRON_SECRET`                 | No             | Secret for authenticating cron job requests             |
| `NODE_ENV`                    | No             | Set to `production` for production deployments          |

### GitHub App Setup

**Note**: Webhooks are automatically configured when users install your GitHub App on their repositories.

1. Create your GitHub App following the [GitHub App Setup Guide](./GITHUB_APP_SETUP.md)
2. Configure your GitHub App webhook URL to: `https://your-domain.com/api/webhooks/github-app`
3. Users can install your app on their repositories for automatic webhook setup

## Platform-Specific Deployment

### Coolify

Coolify provides managed services for databases and cron jobs. For Coolify deployment:

1. **Use the standard `docker-compose.yml`** (not the selfhost version)
2. **Set environment variables** in Coolify's interface
3. **Mark build variables**: Ensure `NEXT_PUBLIC_GITHUB_APP_NAME` is marked as "Is Build Variable?" in Coolify
4. **Use managed database**: Set `DATABASE_URL` to point to your Coolify-managed database
5. **Configure scheduled tasks**: Use Coolify's scheduled tasks feature instead of the cron container

### Vercel/Netlify

**Note**: Vercel only allows once per day cron jobs for free accounts.

These platforms handle the build and deployment automatically:

1. Connect your GitHub repository
2. Set environment variables in the platform's dashboard
3. The platform will build and deploy automatically

## Monitoring & Maintenance

### Health Checks

The system provides several health check endpoints:

```bash
# Application health
curl https://your-domain.com/api/health

# Example healthy response:
# {"status":"healthy","timestamp":"2025-07-16T21:27:07.286Z","version":"0.1.0","uptime":323.494783647,"environment":"production","checks":{"database":"ok","githubApp":"ok","webhook":"ok"}}
```

### Logs

#### Docker Logs

```bash
# Application logs (full self-hosting)
docker-compose -f docker-compose.selfhost.yml logs -f app

# Cron job logs (full self-hosting)
docker-compose -f docker-compose.selfhost.yml logs -f cron

# Database logs (full self-hosting)
docker-compose -f docker-compose.selfhost.yml logs -f db

# Application logs (platform hosting)
docker-compose logs -f app
```

### Shutdown docker containers

```bash
docker-compose -f docker-compose.selfhost.yml down
```

### Restart docker containers

```bash
docker-compose -f docker-compose.selfhost.yml restart
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

#### Environment Variable Errors

**Error**: "Invalid environment variables" or client-side variables not available

**Solution**:

- For **Coolify**: Ensure `NEXT_PUBLIC_GITHUB_APP_NAME` is marked as "Is Build Variable?"
- For **self-hosting**: Make sure all required variables are set in your `.env` file
- For **GitHub App private key**: Ensure it's properly formatted (base64 encoded or escaped newlines)

#### GitHub App Private Key Issues

**Error**: "Invalid keyData" or "Failed to read private key"

**Solution**: Format your private key correctly. You can either:

```bash
# Option 1: Base64 encode the entire key
cat your-private-key.pem | base64 > private-key-base64.txt
# Then set GITHUB_APP_PRIVATE_KEY to the base64 string

# Option 2: Escape newlines manually
# Replace all \n with \\n in your private key string
```

#### Cron Jobs Not Running

1. **Docker**: Check if cron container is running: `docker-compose -f docker-compose.selfhost.yml ps`
2. **Manual**: Verify crontab is correctly configured: `crontab -l`
3. **Logs**: Check cron execution logs for errors
4. **Coolify**: Use the platform's scheduled tasks feature instead

#### GitHub Webhook Failures

1. **Secret**: Verify `GITHUB_APP_WEBHOOK_SECRET` matches GitHub configuration
2. **URL**: Ensure webhook URL is accessible from GitHub
3. **Events**: Confirm "Issues" events are selected in GitHub webhook settings

#### Database Connection Issues

1. **URL**: Verify `DATABASE_URL` is correct
2. **Network**: Ensure database is accessible from application
3. **Migrations**: Run `pnpm db:migrate` if using manual installation

#### 502 Bad Gateway Errors

This usually indicates container/service conflicts:

1. **Coolify**: Make sure you're using `docker-compose.yml` (not `docker-compose.selfhost.yml`)
2. **Self-hosting**: Make sure you're using `docker-compose.selfhost.yml`
3. **Port conflicts**: Ensure no other services are using ports 3000 or 5432

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
DEBUG=jules:*

# Or check application logs for detailed information
docker-compose -f docker-compose.selfhost.yml logs -f app | grep -E "(ERROR|WARN|cron)"
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
# Database backup (self-hosting)
docker-compose -f docker-compose.selfhost.yml exec db pg_dump -U jules jules_queue > backup.sql

# Restore from backup
docker-compose -f docker-compose.selfhost.yml exec -T db psql -U jules jules_queue < backup.sql
```

## Support

- **API Documentation**: See `API_DOCUMENTATION.md` for tRPC endpoint details
- **Issues**: Create GitHub issues for bugs or questions
- **Health Check**: Always verify `/api/health` returns `{"status":"healthy"}` after deployment
