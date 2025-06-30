# Self-Hosting Jules Task Queue

This guide covers how to self-host the Jules Task Queue system using Docker or manual deployment.

## Quick Start with Docker Compose (Recommended)

The easiest way to self-host is using the provided Docker Compose setup:

### 1. Prerequisites

- Docker and Docker Compose installed
- GitHub App or Personal Access Token with repo permissions
- PostgreSQL database (provided in docker-compose.yml)

### 2. Environment Setup

Create a `.env` file in the project root:

```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token_or_app_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret_from_github

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

| Variable                | Required    | Description                                                     |
| ----------------------- | ----------- | --------------------------------------------------------------- |
| `GITHUB_TOKEN`          | Yes         | GitHub Personal Access Token or App token with repo permissions |
| `GITHUB_WEBHOOK_SECRET` | Yes         | Secret used to verify GitHub webhook signatures                 |
| `DATABASE_URL`          | Yes         | PostgreSQL connection string                                    |
| `CRON_SECRET`           | Recommended | Secret for authenticating cron job requests                     |
| `NODE_ENV`              | No          | Set to `production` for production deployments                  |

### GitHub Webhook Setup

1. Go to your repository settings → Webhooks
2. Add webhook with URL: `https://your-domain.com/api/webhooks/github`
3. Select "Issues" events
4. Set the secret to match your `GITHUB_WEBHOOK_SECRET`

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
