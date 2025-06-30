import type { JulesTask, WebhookLog } from "@prisma/client";

// Export Prisma model types
export type { JulesTask, WebhookLog };

// Extended types for database operations
export interface TaskWithStats extends JulesTask {
  _count?: {
    retries?: number;
  };
}

export interface TaskCreationParams {
  githubRepoId: bigint;
  githubIssueId: bigint;
  githubIssueNumber: bigint;
  repoOwner: string;
  repoName: string;
  installationId?: number;
}

export interface TaskUpdateParams {
  flaggedForRetry?: boolean;
  retryCount?: number;
  lastRetryAt?: Date;
}

export interface WebhookLogCreationParams {
  eventType: string;
  payload: string;
  success: boolean;
  error?: string | null;
}

export interface TaskStats {
  total: number;
  flaggedForRetry: number;
  active: number;
  completed: number;
  avgRetryCount: number;
}

export interface RetryStats {
  attempted: number;
  successful: number;
  failed: number;
  skipped: number;
}
