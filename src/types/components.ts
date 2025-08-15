import React from "react";

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Repository-related types for components
export interface Repository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description?: string;
}

// Setup options for label configuration
export interface SetupOption {
  id: "all" | "selected" | "manual";
  title: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

// Installation status types
export interface InstallationStatus {
  success: boolean;
  installationId?: string | null;
  setupAction?: string;
  error?: string;
  errorDescription?: string;
}

// Error boundary types
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Loading component types
export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export interface PageLoadingProps {
  text?: string;
}

// Modal component types
export interface RepositorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: Repository[];
  selectedRepositories: Set<number>;
  onSelectionChange: (repoId: number, selected: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

// GitHub install button types
export interface GitHubInstallButtonProps extends BaseComponentProps {
  onInstallStart?: () => void;
  onInstallError?: (error: string) => void;
  children?: React.ReactNode;
}

// Error display types
export interface ErrorDisplayProps extends BaseComponentProps {
  title?: string;
  message: string;
  suggestedAction?: string;
  onRetry?: () => void;
  onContactSupport?: () => void;
  retryLabel?: string;
  variant?: "default" | "destructive";
}

// Success/Error state component types
export interface ErrorStateProps {
  installationStatus: InstallationStatus;
}

export interface SuccessStateProps {
  installationStatus: InstallationStatus;
}

// Task row types for dashboard
export interface TaskItem {
  id: number;
  title: string;
  status: "running" | "queued" | "completed";
  statusText: string;
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  labelColor: string;
  textColor: string;
}

export interface TaskRowProps {
  task: TaskItem;
}

// State management types for complex components
export type LabelSetupAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_REPOSITORIES"; payload: Repository[] }
  | {
      type: "SET_SELECTED_OPTION";
      payload: "all" | "selected" | "manual" | null;
    }
  | { type: "SET_SELECTED_REPOS"; payload: Set<number> }
  | { type: "SET_MODAL_OPEN"; payload: boolean }
  | { type: "SET_PROCESSING"; payload: boolean };

export interface LabelSetupState {
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  repositories: Repository[];
  selectedOption: "all" | "selected" | "manual" | null;
  selectedRepos: Set<number>;
  isModalOpen: boolean;
}
