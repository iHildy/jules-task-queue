# Jules Task Queue - API Documentation

## Overview

The Jules Task Queue system provides a comprehensive tRPC-based API for managing GitHub issue tasks, monitoring system health, and administering the queue system. The API is organized into three main routers located in `src/server/api/routers/`:

- **Tasks Router** (`tasks.ts`) - Core task management operations
- **Admin Router** (`admin.ts`) - Administrative and monitoring functions
- **Webhook Router** (`webhook.ts`) - Webhook health and status checks

## Base URL

When deployed on Vercel: `https://your-app.vercel.app/api/trpc`
When self-hosted: `http://localhost:3000/api/trpc` (or your configured domain)

## Authentication

This API leverages GitHub App authentication, including user access tokens obtained via OAuth during installation. This ensures that actions performed by the system (e.g., label changes) are attributed to the user who authorized the app, allowing Jules to respond correctly.

For development, endpoints are open. In production, implement authentication middleware in the tRPC context (`src/server/api/trpc.ts`) to secure your API.

---

## Tasks Router (`tasks.ts`)

**Purpose**: Manage individual Jules tasks, view statistics, and perform task operations.

### `tasks.list`

**Purpose**: Retrieve a paginated list of all Jules tasks with filtering options.

**Input**:

```typescript
{
  limit?: number;        // Max items per page (default: 50, max: 100)
  cursor?: number;       // Task ID for pagination
  flaggedOnly?: boolean; // Show only tasks flagged for retry
}
```

**Output**:

```typescript
{
  items: JulesTask[];
  nextCursor?: number;
}
```

**Example Usage**:

```bash
# Get first 20 tasks
curl "https://your-app.vercel.app/api/trpc/tasks.list?input={\"limit\":20}"

# Get only flagged tasks
curl "https://your-app.vercel.app/api/trpc/tasks.list?input={\"flaggedOnly\":true}"
```

### `tasks.getById`

**Purpose**: Retrieve detailed information about a specific task.

**Input**:

```typescript
{
  id: number; // Task ID
}
```

**Output**:

```typescript
JulesTask | null;
```

**Example Usage**:

```bash
curl "https://your-app.vercel.app/api/trpc/tasks.getById?input={\"id\":123}"
```

### `tasks.stats`

**Purpose**: Get comprehensive statistics about the task queue system.

**Input**: None

**Output**:

```typescript
{
  totalTasks: number;
  queuedTasks: number;
  activeTasks: number;
  oldestQueuedTaskAge: number | null; // milliseconds
  averageRetryCount: number;
  maxRetryCount: number;
}
```

**Example Usage**:

```bash
curl "https://your-app.vercel.app/api/trpc/tasks.stats"
```

### `tasks.retry`

**Purpose**: Manually retry a specific flagged task.

**Input**:

```typescript
{
  id: number; // Task ID to retry
}
```

**Output**:

```typescript
{
  success: boolean;
  message: string;
}
```

**Example Usage**:

```bash
curl -X POST "https://your-app.vercel.app/api/trpc/tasks.retry" \
  -H "Content-Type: application/json" \
  -d '{"id": 123}'
```

### `tasks.updateStatus`

**Purpose**: Manually update a task's retry status.

**Input**:

```typescript
{
  id: number;
  flaggedForRetry: boolean;
}
```

**Output**:

```typescript
{
  success: boolean;
  task: JulesTask;
}
```

**Example Usage**:

```bash
curl -X POST "https://your-app.vercel.app/api/trpc/tasks.updateStatus" \
  -H "Content-Type: application/json" \
  -d '{"id": 123, "flaggedForRetry": false}'
```

---

## Admin Router (`admin.ts`)

**Purpose**: Administrative operations, bulk actions, and system monitoring.

### `admin.retryAll`

**Purpose**: Trigger a manual retry of all flagged tasks (same as cron job).

**Input**: None

**Output**:

```typescript
{
  attempted: number;
  successful: number;
  failed: number;
  skipped: number;
}
```

**Example Usage**:

```bash
curl -X POST "https://your-app.vercel.app/api/trpc/admin.retryAll"
```

### `admin.cleanup`

**Purpose**: Clean up old completed tasks to maintain database hygiene.

**Input**:

```typescript
{
  olderThanDays?: number; // Default: 30 days
}
```

**Output**:

```typescript
{
  deletedCount: number;
  message: string;
}
```

**Example Usage**:

```bash
# Clean up tasks older than 7 days
curl -X POST "https://your-app.vercel.app/api/trpc/admin.cleanup" \
  -H "Content-Type: application/json" \
  -d '{"olderThanDays": 7}'
```

### `admin.logs`

**Purpose**: Retrieve webhook and system operation logs.

**Input**:

```typescript
{
  limit?: number;     // Default: 50, max: 200
  eventType?: string; // Filter by event type
  success?: boolean;  // Filter by success status
}
```

**Output**:

```typescript
{
  logs: WebhookLog[];
  total: number;
}
```

**Example Usage**:

```bash
# Get recent failed operations
curl "https://your-app.vercel.app/api/trpc/admin.logs?input={\"success\":false,\"limit\":10}"

# Get cron job executions
curl "https://your-app.vercel.app/api/trpc/admin.logs?input={\"eventType\":\"cron_retry_execution\"}"
```

### `admin.health`

**Purpose**: Comprehensive system health check.

**Input**: None

**Output**:

```typescript
{
  status: "healthy" | "unhealthy";
  database: "connected" | "disconnected";
  services: {
    github: boolean;
    cron: boolean;
  }
  metrics: {
    totalTasks: number;
    queuedTasks: number;
    recentErrors: number;
  }
  timestamp: string;
}
```

**Example Usage**:

```bash
curl "https://your-app.vercel.app/api/trpc/admin.health"
```

### `admin.installations.list`

**Purpose**: Get all GitHub App installations.

**Input**: None

**Output**:

```typescript
{
  installations: Installation[];
  count: number;
}
```

### `admin.installations.detail`

**Purpose**: Get detailed information about a specific installation.

**Input**:

```typescript
{
  installationId: number;
}
```

**Output**:

```typescript
{
  id: number;
  accountLogin: string;
  repositoryCount: number;
  repositories: Repository[];
  tasks: Task[];
  // ... other installation details
}
```

### `admin.installations.sync`

**Purpose**: Sync a specific installation with GitHub.

**Input**:

```typescript
{
  installationId: number;
}
```

**Output**:

```typescript
{
  success: boolean;
  message: string;
  data?: Installation;
}
```

### `admin.installations.syncAll`

**Purpose**: Sync all installations with GitHub.

**Input**: None

**Output**:

```typescript
{
  success: boolean;
  message: string;
  results: SyncResult[];
  stats: { successful: number; failed: number; total: number; };
}
```

### `admin.installations.stats`

**Purpose**: Get installation statistics.

**Input**: None

**Output**:

```typescript
{
  totalInstallations: number;
  activeInstallations: number;
  suspendedInstallations: number;
  totalRepositories: number;
  totalTasks: number;
  recentInstallations: number;
  healthyPercentage: number;
}
```

**Example Usage**:

```bash
# List all installations
curl "https://your-app.vercel.app/api/trpc/admin.installations.list"

# Get installation details
curl "https://your-app.vercel.app/api/trpc/admin.installations.detail?input={\"installationId\":123}"

# Sync specific installation
curl -X POST "https://your-app.vercel.app/api/trpc/admin.installations.sync" \
  -H "Content-Type: application/json" \
  -d '{"installationId": 123}'

# Get installation statistics
curl "https://your-app.vercel.app/api/trpc/admin.installations.stats"
```

---

## Webhook Router (`webhook.ts`)

**Purpose**: Monitor webhook system health and processing status.

### `webhook.health`

**Purpose**: Check webhook processing system health.

**Input**: None

**Output**:

```typescript
{
  status: "healthy" | "unhealthy";
  webhookSecret: boolean; // Whether secret is configured
  recentProcessing: {
    successful: number;
    failed: number;
    last24Hours: number;
  }
  timestamp: string;
}
```

**Example Usage**:

```bash
curl "https://your-app.vercel.app/api/trpc/webhook.health"
```

---

## Usage Examples

### Monitoring Dashboard

Create a simple monitoring script:

```javascript
// monitor.js
async function getSystemStatus() {
  const baseUrl = "https://your-app.vercel.app/api/trpc";

  // Get overall health
  const health = await fetch(`${baseUrl}/admin.health`).then((r) => r.json());

  // Get task statistics
  const stats = await fetch(`${baseUrl}/tasks.stats`).then((r) => r.json());

  // Get recent logs
  const logs = await fetch(`${baseUrl}/admin.logs?input={"limit":5}`).then(
    (r) => r.json(),
  );

  console.log("System Health:", health);
  console.log("Task Stats:", stats);
  console.log("Recent Logs:", logs.logs);
}

getSystemStatus();
```

### Bulk Operations

```javascript
// bulk-retry.js
async function retryAllTasks() {
  const response = await fetch(
    "https://your-app.vercel.app/api/trpc/admin.retryAll",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );

  const result = await response.json();
  console.log("Retry Results:", result);
}

retryAllTasks();
```

### Task Management

```javascript
// task-manager.js
async function manageTask(taskId, shouldRetry) {
  // Update task status
  const updateResponse = await fetch(
    "https://your-app.vercel.app/api/trpc/tasks.updateStatus",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, flaggedForRetry: shouldRetry }),
    },
  );

  if (shouldRetry) {
    // Immediately retry the task
    const retryResponse = await fetch(
      "https://your-app.vercel.app/api/trpc/tasks.retry",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId }),
      },
    );

    console.log("Retry Result:", await retryResponse.json());
  }
}

// Flag task 123 for retry and execute immediately
manageTask(123, true);
```

## Error Handling

All endpoints return standardized error responses:

```typescript
{
  error: {
    code: "INTERNAL_SERVER_ERROR" | "BAD_REQUEST" | "NOT_FOUND";
    message: string;
    data?: {
      // Additional error context
    };
  }
}
```

## Development

To test endpoints locally:

1. Start the development server: `pnpm dev`
2. Visit `http://localhost:3000/api/trpc` for the tRPC panel (if enabled)
3. Use the examples above with `http://localhost:3000` as the base URL
