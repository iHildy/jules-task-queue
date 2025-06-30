# Jules Task Queueing System

## Overview

The Jules Task Queueing System is a GitHub-integrated service that manages task overflow for the Google Labs Jules AI assistant. When Jules reaches its concurrent task limit, this system automatically queues tasks and retries them at regular intervals.

## System Architecture

```mermaid
graph TD
    A["User adds 'jules' label to GitHub issue"] --> B["GitHub webhook triggers"]
    B --> C["Create/Update JulesTask in database"]
    C --> D["Start 60-second timer"]
    D --> E["Timer expires - Check for Jules bot comments"]
    E --> F{"Jules bot commented?"}
    F -->|No| G["End - Jules probably working or no response yet"]
    F -->|Yes| H{"Comment type?"}
    H -->|"You are currently at your concurrent task limit"| I["Task Limit Reached"]
    H -->|"When finished, you will see another comment"| J["Jules Started Working"]
    H -->|Other comment| G

    I --> K["Mark JulesTask.flaggedForRetry = true"]
    K --> L["Remove 'jules' label from GitHub issue"]
    L --> M["Add 'jules-queue' label to GitHub issue"]
    M --> N["Task queued for retry"]

    J --> O["Jules is actively working"]
    O --> P["End - Success path"]

    Q["Cron job runs every 30 minutes"] --> R["Find all JulesTask where flaggedForRetry = true"]
    R --> S{"Any flagged tasks?"}
    S -->|No| T["End cron cycle"]
    S -->|Yes| U["For each flagged task"]
    U --> V{"Issue has 'Human' label?"}
    V -->|Yes| W["Skip this task"]
    V -->|No| X["Remove 'jules-queue' label"]
    X --> Y["Add 'jules' label back"]
    Y --> Z["Set flaggedForRetry = false"]
    Z --> AA["Increment retryCount"]
    AA --> BB["Update lastRetryAt timestamp"]
    BB --> CC["Jules bot will see label and try again"]
    CC --> D

    W --> DD{"More tasks?"}
    BB --> DD
    DD -->|Yes| U
    DD -->|No| T

    style A fill:#e1f5fe
    style I fill:#ffebee
    style J fill:#e8f5e8
    style Q fill:#fff3e0
    style CC fill:#e1f5fe
```

## Key Components

### 1. GitHub Webhook Handler

- **Trigger**: When `jules` label is added to an issue
- **Action**: Creates/updates JulesTask record
- **Delay**: Waits 60 seconds before checking for bot responses

### 2. Comment Detection System

- **Purpose**: Monitors Jules bot responses after label application
- **Detection Patterns**:
  - Task limit: `"You are currently at your concurrent task limit"`
  - Success: `"When finished, you will see another comment"`

### 3. Queue Management

- **Queueing**: Moves tasks from `jules` → `jules-queue` when limit reached
- **Retry Logic**: Cron job processes queued tasks every 30 minutes
- **Safety**: Skips tasks with `Human` label (manual intervention required)

### 4. Database Schema

```prisma
model JulesTask {
  id                 Int      @id @default(autoincrement())
  githubRepoId       BigInt
  githubIssueId      BigInt   @unique
  githubIssueNumber  BigInt
  flaggedForRetry    Boolean  @default(false)
  retryCount         Int      @default(0)
  lastRetryAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

## Core Functions

### 1. Task Creation

```typescript
async function upsertJulesTask(params: {
  githubRepoId: bigint;
  githubIssueId: bigint;
  githubIssueNumber: bigint;
}) {
  // Create/update task record
  // Start 60-second delay timer
  // Check for Jules bot comments
  // Handle task limit or success responses
}
```

### 2. Retry Processing

```typescript
async function retryFlaggedJulesTasks() {
  // Find all flagged tasks
  // Skip tasks with 'Human' label
  // Re-apply 'jules' label
  // Remove 'jules-queue' label
  // Update retry metrics
}
```

## GitHub Labels

- **`jules`**: Active task - Jules should process this
- **`jules-queue`**: Queued task - waiting for retry
- **`Human`**: Manual intervention - skip automatic processing

## Environment Requirements

- GitHub webhook configured for `issues.labeled` events
- GitHub API token with repo access
- Database for task persistence
- Cron job capability for retries

## Retry Strategy

- **Interval**: Every 30 minutes
- **Persistence**: Tasks remain queued until successful or manually resolved
- **Metrics**: Tracks retry count and timestamps
- **Safety**: Human label prevents infinite retries

## Error Handling

- Graceful webhook failures
- GitHub API rate limiting
- Network timeouts
- Database connection issues
- Missing environment variables

## Security Considerations

- GitHub webhook signature verification
- Encrypted API token storage
- Input validation and sanitization
- Rate limiting on endpoints
- Audit logging for all operations

## Monitoring & Observability

- Task creation and completion metrics
- Retry attempt tracking
- Queue depth monitoring
- Error rate alerting
- Performance metrics for webhook processing

## Future Enhancements

1. **Priority Queueing**: Handle urgent tasks first
2. **Dynamic Retry Intervals**: Exponential backoff for repeated failures
3. **Multi-Repository Support**: Centralized queueing across repos
4. **Webhook Delivery Guarantees**: Retry failed webhook deliveries
5. **Task Analytics**: Success rates, processing times, bottlenecks
6. **Auto-scaling**: Detect Jules capacity and adjust accordingly
7. **Integration Testing**: Automated end-to-end workflow validation
