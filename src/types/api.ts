import type { env } from "@/lib/env";
import type { PrismaClient } from "@prisma/client";

// tRPC Context types
export interface CreateContextOptions {
  headers: Headers;
}

export interface TRPCContext {
  headers: Headers;
  db: PrismaClient;
  env: typeof env;
}

// API Response types
export interface ApiResponse<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Admin operation types
export interface AdminOperationResult {
  success: boolean;
  message: string;
  affectedCount?: number;
  errors?: string[];
}

// Health check types
export interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    database: "up" | "down";
    github: "up" | "down";
  };
  uptime: number;
}

// Admin router types
export interface InstallationWithCounts {
  id: number;
  accountLogin: string;
  accountType: string;
  repositorySelection: string;
  createdAt: Date;
  updatedAt: Date;
  suspendedAt: Date | null;
  suspendedBy: string | null;
  _count: {
    repositories: number;
    tasks: number;
  };
}

export interface InstallationRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  htmlUrl: string;
  description: string | null;
  addedAt: Date;
}

export interface InstallationTask {
  id: number;
  githubIssueNumber: bigint;
  repoOwner: string;
  repoName: string;
  flaggedForRetry: boolean;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}
