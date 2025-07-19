# Scripts

This directory contains scripts for managing the Jules Task Queue.

## `retry-tasks.js`

This script is used to retry all flagged tasks. It is intended to be run as a cron job.

### Usage

```bash
node scripts/retry-tasks.js
```

## `test-retry.js`

This script is used to manually retry a single task. It is useful for testing and debugging.

### Usage

```bash
node scripts/test-retry.js <taskId>
```

Replace `<taskId>` with the ID of the task you want to retry.
