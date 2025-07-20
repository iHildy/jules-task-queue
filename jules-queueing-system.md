# Jules Task Queueing System

## Overview

The Jules Task Queueing System is a GitHub-integrated service that manages task overflow for the Google Labs Jules AI assistant. When Jules reaches its concurrent task limit, this system automatically queues tasks and retries them at regular intervals.

## System Architecture

```mermaid
graph TD
    subgraph GitHub App Installation & OAuth
        GAI["User Installs GitHub App"] --> GAC["GitHub Redirects to Callback URL (with code)"]
        GAC --> OAE["OAuth Callback Endpoint (Exchange code for tokens)"]
        OAE --> STD["Store Tokens in Database (encrypted)"]
        STD --> SUCC["Redirect to Success Page"]
    end

    A["User adds 'jules' label to GitHub issue"] --> B["GitHub webhook triggers"]
    B --> C["Create/Update JulesTask in database"]
    C --> D["Start 60-second timer"]
    D --> E["Timer expires - Check for Jules comments"]
    E --> F{"Jules commented?"}
    F -->|No| G["End - Jules probably working or no response yet"]
    F -->|Yes| H{"Comment type?"}
    H -->|"You are currently at your concurrent task limit"| I["Task Limit Reached"]
    H -->|"When finished, you will see another comment"| J["Jules Started Working"]
    H -->|Other comment| G

    I --> K["Mark JulesTask.flaggedForRetry = true"]
    K --> L["Remove 'jules' label from GitHub issue"]
    L --> M["Add 'jules-queue' label to GitHub issue"]
    M --> N["Task queued for retry"]

    J --> O["Jules is actively actively working"]
    O --> P["End - Success path"]

    Q["Cron job runs every 30 minutes"] --> R["Find all JulesTask where flaggedForRetry = true"]
    R --> S{"Any flagged tasks?"}
    S -->|No| T["End cron cycle"]
    S -->|Yes| U["For each flagged task"]
    U --> V{"Issue has 'Human' label?"}
    V -->|Yes| W["Skip this task"]
    V -->|No| X["Remove 'jules-queue' label"]
    X --> Y["Add 'jules' label back (using user token if available)"]
    Y --> Z["Set flaggedForRetry = false"]
    Z --> AA["Increment retryCount"]
    AA --> BB["Update lastRetryAt timestamp"]
    BB --> CC["Jules will see label and try again"]
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
    style GAI fill:#c8e6c9
    style GAC fill:#c8e6c9
    style OAE fill:#c8e6c9
    style STD fill:#c8e6c9
    style SUCC fill:#c8e6c9
    style Y fill:#e1f5fe
```

## Key Components

### 1. GitHub Webhook Handler

- **Trigger**: When `jules` label is added to an issue
- **Action**: Creates/updates JulesTask record
- **Delay**: Waits 60 seconds before checking for bot responses

### 2. Comment Detection System

- **Purpose**: Monitors Jules responses after label application
- **Detection Patterns**:
  - Task limit: `"You are currently at your concurrent task limit"`
  - Success: `"When finished, you will see another comment"`

### 3. Queue Management

- **Queueing**: Moves tasks from `jules` → `jules-queue` when limit reached
- **Retry Logic**: Cron job processes queued tasks every 30 minutes
- **Safety**: Skips tasks with `Human` label (manual intervention required)
