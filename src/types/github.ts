// GitHub webhook event types
export interface GitHubLabelEvent {
  action: "labeled" | "unlabeled";
  label: {
    name: string;
  };
  issue: {
    id: bigint;
    number: number;
    state: "open" | "closed";
    labels: Array<{
      name: string;
    }>;
  };
  repository: {
    id: bigint;
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

// GitHub webhook payload interfaces
export interface GitHubAccount {
  id: bigint;
  login: string;
  type: string;
}

export interface GitHubInstallation {
  id: number;
  account: GitHubAccount;
  target_type: string;
  permissions: Record<string, string>;
  events: string[];
  single_file_name?: string;
  repository_selection: string;
  suspended_at?: string;
  suspended_by?: { login: string };
}

export interface GitHubWebhookRepository {
  id: bigint;
  name: string;
  full_name: string;
  owner?: GitHubAccount; // Optional for installation webhooks
  private: boolean;
  html_url?: string; // Optional for installation webhooks
  description?: string;
}

export interface GitHubInstallationEvent {
  action: string;
  installation: GitHubInstallation;
  repositories?: GitHubWebhookRepository[];
}

export interface GitHubInstallationRepositoriesEvent {
  action: string;
  installation: GitHubInstallation;
  repositories_added?: GitHubWebhookRepository[];
  repositories_removed?: GitHubWebhookRepository[];
}

export interface GitHubLabel {
  name: string;
}

export interface GitHubUser {
  login: string;
}

export interface GitHubIssue {
  number: number;
  state: string;
  labels: GitHubLabel[];
}

export interface GitHubWebhookComment {
  user: GitHubUser;
}

export interface GitHubIssueCommentEvent {
  action: string;
  issue: GitHubIssue;
  comment: GitHubWebhookComment;
  repository: GitHubWebhookRepository;
  installation?: { id: number };
}

export interface GitHubWebhookEvent {
  action: string;
  installation?: { id: number };
  [key: string]: unknown;
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
