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
export interface ApiResponse<T = unknown> {
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

// API Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
