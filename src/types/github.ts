// GitHub webhook event types
export interface GitHubLabelEvent {
  action: "labeled" | "unlabeled";
  label: {
    name: string;
  };
  issue: {
    id: number;
    number: number;
    state: "open" | "closed";
    labels: Array<{
      name: string;
    }>;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
    type: string;
  };
}

export interface GitHubWebhookEvent {
  action: string;
  issue?: {
    id: number;
    number: number;
    state: string;
    labels?: Array<{ name: string }>;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
    type: string;
  };
}

// GitHub API response types
export interface GitHubComment {
  id: number;
  body?: string;
  user?: {
    login: string;
    [key: string]: unknown;
  } | null;
  created_at: string;
  [key: string]: unknown;
}

export interface GitHubIssueData {
  repository?: {
    full_name?: string;
  };
}

export interface GitHubRepository {
  owner: string;
  repo: string;
}

// Comment analysis types
export type CommentClassification =
  | "task_limit"
  | "working"
  | "error"
  | "completed"
  | "unknown"
  | "no_action";

export interface CommentAnalysis {
  classification: CommentClassification;
  confidence: number; // 0-1 score
  comment?: GitHubComment;
  patterns_matched: string[];
  timestamp: Date;
  age_minutes: number;
}

export interface CommentCheckResult {
  action: CommentClassification;
  comment?: GitHubComment;
  analysis?: CommentAnalysis;
  retryCount?: number;
}

// Processing workflow types
export interface ProcessingResult {
  action:
    | "task_created"
    | "task_updated"
    | "timer_scheduled"
    | "no_action"
    | "error";
  taskId?: number;
  message: string;
  delayMs?: number;
}
