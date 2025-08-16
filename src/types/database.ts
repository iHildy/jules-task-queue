import type {
  JulesTask,
  WebhookLog,
  GitHubInstallation,
  InstallationRepository,
  LabelPreference,
  LabelPreferenceRepository,
  RateLimit,
} from "@prisma/client";

// Export Prisma model types
export type {
  JulesTask,
  WebhookLog,
  LabelPreference,
  LabelPreferenceRepository,
  RateLimit,
};

// Export with different names to avoid conflicts with api.ts
export type PrismaGitHubInstallation = GitHubInstallation;
export type PrismaInstallationRepository = InstallationRepository;

// Extended types for database operations
export interface TaskWithStats extends JulesTask {
  _count?: {
    retries?: number;
  };
}

// Consolidated single-source interfaces for DB operations
export interface TaskCreationParams {
  githubRepoId: bigint;
  githubIssueId: bigint;
  githubIssueNumber: bigint;
  repoOwner: string;
  repoName: string;
  installationId?: number | null;
}

export interface TaskUpdateParams {
  flaggedForRetry?: boolean;
  retryCount?: number;
  lastRetryAt?: Date | null;
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
