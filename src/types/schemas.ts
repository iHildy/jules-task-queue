import { z } from "zod";

// GitHub webhook event schemas
export const GitHubLabelEventSchema = z.object({
  action: z.enum(["labeled", "unlabeled"]),
  label: z.object({
    name: z.string(),
  }),
  issue: z.object({
    id: z.number(),
    number: z.number(),
    state: z.enum(["open", "closed"]),
    labels: z.array(
      z.object({
        name: z.string(),
      }),
    ),
  }),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
      login: z.string(),
    }),
  }),
  sender: z.object({
    login: z.string(),
    type: z.string(),
  }),
});

export const GitHubWebhookEventSchema = z.object({
  action: z.string(),
  issue: z
    .object({
      id: z.number(),
      number: z.number(),
      state: z.string(),
      labels: z.array(z.object({ name: z.string() })).optional(),
    })
    .optional(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
      login: z.string(),
    }),
  }),
  sender: z.object({
    login: z.string(),
    type: z.string(),
  }),
});

// API input validation schemas
export const TaskFilterSchema = z.object({
  flaggedForRetry: z.boolean().optional(),
  repoOwner: z.string().optional(),
  repoName: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const TaskIdSchema = z.object({
  id: z.number().positive(),
});

export const RetryTaskSchema = z.object({
  taskId: z.number().positive(),
  force: z.boolean().default(false),
});

export const BulkRetrySchema = z.object({
  taskIds: z.array(z.number().positive()).min(1).max(100),
  force: z.boolean().default(false),
});

// Webhook log schemas
export const WebhookLogFilterSchema = z.object({
  eventType: z.string().optional(),
  success: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// Comment analysis schemas
export const CommentAnalysisSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  issueNumber: z.number().positive(),
  maxRetries: z.number().min(1).max(10).default(3),
  minConfidence: z.number().min(0).max(1).default(0.6),
});

// Admin operation schemas
export const CleanupTasksSchema = z.object({
  olderThanDays: z.number().min(1).max(365).default(30),
  dryRun: z.boolean().default(false),
});

export const SystemHealthSchema = z.object({
  includeDetails: z.boolean().default(false),
});

// Public stats schema
export const PublicStatsSchema = z.object({
  totalTasks: z.number(),
  totalRetries: z.number(),
  queuedTasks: z.number(),
  activeTasks: z.number(),
  totalInstallations: z.number(),
  totalRepositories: z.number(),
});
