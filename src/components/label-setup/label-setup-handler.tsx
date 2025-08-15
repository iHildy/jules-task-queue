"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  GitBranch,
  Info,
  Package,
  Settings,
  User,
  Zap,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useReducer, useMemo, useState } from "react";
import { RepositorySelectionModal } from "./repository-selection-modal";
import type {
  SetupOption,
  LabelSetupState,
  LabelSetupAction,
} from "@/types/components";

const SETUP_OPTIONS: SetupOption[] = [
  {
    id: "all",
    title: "All Repositories",
    description:
      "Automatically create Jules labels in all current and future repositories",
    icon: <GitBranch className="h-6 w-6" />,
    recommended: true,
  },
  {
    id: "selected",
    title: "Selected Repositories",
    description:
      "Choose specific repositories where you want Jules labels created",
    icon: <Settings className="h-6 w-6" />,
  },
  {
    id: "manual",
    title: "Manual Setup",
    description:
      "Skip automatic setup - I'll create Jules labels myself when needed",
    icon: <User className="h-6 w-6" />,
  },
];

function labelSetupReducer(
  state: LabelSetupState,
  action: LabelSetupAction,
): LabelSetupState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_REPOSITORIES":
      return { ...state, repositories: action.payload };
    case "SET_SELECTED_OPTION":
      return { ...state, selectedOption: action.payload };
    case "SET_SELECTED_REPOS":
      return { ...state, selectedRepos: action.payload };
    case "SET_MODAL_OPEN":
      return { ...state, isModalOpen: action.payload };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };
    default:
      return state;
  }
}

const initialState: LabelSetupState = {
  isLoading: true,
  isProcessing: false,
  error: null,
  repositories: [],
  selectedOption: null,
  selectedRepos: new Set(),
  isModalOpen: false,
};

export function LabelSetupHandler(): React.JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, dispatch] = useReducer(labelSetupReducer, initialState);
  const [installationId, setInstallationId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get("installation_id");
    if (!id) {
      dispatch({ type: "SET_ERROR", payload: "Missing installation ID" });
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }
    setInstallationId(id);
    fetchRepositories(id);
  }, [searchParams]);

  const fetchRepositories = async (installationId: string): Promise<void> => {
    try {
      const response = await fetch(
        `/api/github-app/installations/${installationId}/repositories`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch repositories");
      }

      const data = await response.json();
      dispatch({ type: "SET_REPOSITORIES", payload: data.repositories || [] });
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error
            ? error.message
            : "Failed to load repositories",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleOptionSelect = (option: "all" | "selected" | "manual"): void => {
    dispatch({ type: "SET_SELECTED_OPTION", payload: option });
    if (option === "all") {
      const allRepoIds = new Set(state.repositories.map((repo) => repo.id));
      dispatch({ type: "SET_SELECTED_REPOS", payload: allRepoIds });
    } else if (option === "manual") {
      dispatch({ type: "SET_SELECTED_REPOS", payload: new Set() });
    } else if (option === "selected") {
      // Keep current selection or open modal
      if (state.selectedRepos.size === 0) {
        dispatch({ type: "SET_MODAL_OPEN", payload: true });
      }
    }
  };

  const handleRepositorySelectionChange = (
    repoId: number,
    selected: boolean,
  ): void => {
    const newSelected = new Set(state.selectedRepos);
    if (selected) {
      newSelected.add(repoId);
    } else {
      newSelected.delete(repoId);
    }
    dispatch({ type: "SET_SELECTED_REPOS", payload: newSelected });
  };

  const handleSelectAll = (): void => {
    const allRepoIds = new Set(state.repositories.map((repo) => repo.id));
    dispatch({ type: "SET_SELECTED_REPOS", payload: allRepoIds });
  };

  const handleClearAll = (): void => {
    dispatch({ type: "SET_SELECTED_REPOS", payload: new Set() });
  };

  const canContinue = useMemo(
    () =>
      state.selectedOption &&
      (state.selectedOption === "manual" ||
        state.selectedOption === "all" ||
        (state.selectedOption === "selected" && state.selectedRepos.size > 0)),
    [state.selectedOption, state.selectedRepos.size],
  );

  const handleContinue = async (): Promise<void> => {
    if (!state.selectedOption || !installationId) return;

    dispatch({ type: "SET_PROCESSING", payload: true });
    try {
      const repositoryIds =
        state.selectedOption === "all"
          ? state.repositories.map((repo) => repo.id)
          : Array.from(state.selectedRepos);

      const response = await fetch("/api/github-app/label-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          installationId: parseInt(installationId),
          setupType: state.selectedOption,
          repositoryIds: repositoryIds.length > 0 ? repositoryIds : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Label setup API error:", errorData);
        throw new Error(errorData.error || "Failed to setup labels");
      }

      const result = await response.json();
      console.log("Label setup result:", result);

      // Redirect to success page with result details
      const params = new URLSearchParams({
        installation_id: installationId,
        setup_type: result.setupType,
      });

      if (result.repositoriesProcessed) {
        params.set(
          "repositories_processed",
          result.repositoriesProcessed.toString(),
        );
      }

      if (result.labelsCreated) {
        params.set(
          "labels_successful",
          result.labelsCreated.successful.toString(),
        );
        params.set("labels_failed", result.labelsCreated.failed.toString());
      }

      router.push(`/github-app/success?${params.toString()}`);
    } catch (error) {
      console.error("Failed to setup labels:", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error
            ? error.message
            : "Failed to setup labels. Please try again.",
      });
    } finally {
      dispatch({ type: "SET_PROCESSING", payload: false });
    }
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-jules-dark flex items-center justify-center">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-jules-accent/20">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <LoadingSpinner size="lg" />
              <div>
                <h3 className="text-lg font-semibold">
                  Loading repositories...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Fetching your repository information
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-jules-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur border-destructive/20">
          <CardContent className="p-8">
            <Alert className="border-destructive/20 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive-foreground">
                {state.error}
              </AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-jules-dark">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-jules-accent/10 border border-jules-accent/20 mb-6">
              <Package className="h-8 w-8 text-jules-accent" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Label Setup
            </h1>
            <p className="text-lg sm:text-xl text-jules-gray max-w-2xl mx-auto">
              Jules Task Queue uses special labels to manage your task workflow.
              Choose how you&apos;d like to set them up.
            </p>
          </div>

          {/* Info Card */}
          <Card className="mb-8 bg-jules-darker/50 border-jules-gray/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm">
                  <p className="text-blue-100">
                    <strong>What are Jules labels?</strong> Two special labels
                    that help manage your task queue:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-[#642cc2] text-white text-xs"
                      >
                        jules
                      </Badge>
                      <span className="text-blue-200 text-xs">
                        Add this to start processing
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-[#00d3f2] text-black text-xs"
                      >
                        jules-queue
                      </Badge>
                      <span className="text-blue-200 text-xs">
                        Used for queue management (automatically handled)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup Options */}
          <div className="space-y-4 mb-8">
            {SETUP_OPTIONS.map((option) => (
              <Card
                key={option.id}
                className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                  state.selectedOption === option.id
                    ? "border-jules-primary bg-jules-accent/15 shadow-lg shadow-jules-accent/10"
                    : "border-jules-gray/20 hover:border-jules-primary bg-jules-darker"
                }`}
                onClick={() => handleOptionSelect(option.id)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 p-2 sm:p-3 rounded-lg transition-colors ${
                        state.selectedOption === option.id
                          ? "bg-jules-accent text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {option.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-white">
                          {option.title}
                        </h3>
                        {option.recommended && (
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs sm:text-sm">
                            <Zap className="h-3 w-3 mr-1" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-jules-gray">
                        {option.description}
                      </p>

                      {/* Repository count for selected option */}
                      {state.selectedOption === option.id &&
                        option.id === "selected" && (
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatch({
                                  type: "SET_MODAL_OPEN",
                                  payload: true,
                                });
                              }}
                              className="h-8"
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Choose Repositories
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                            {state.selectedRepos.size > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {state.selectedRepos.size} selected
                              </Badge>
                            )}
                          </div>
                        )}

                      {state.selectedOption === option.id &&
                        option.id === "all" && (
                          <div className="mt-3">
                            <Badge variant="secondary" className="text-xs">
                              {state.repositories.length} repositories
                            </Badge>
                          </div>
                        )}
                    </div>

                    {state.selectedOption === option.id && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-jules-accent flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full sm:w-auto hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <Button
              onClick={handleContinue}
              disabled={!canContinue || state.isProcessing}
              size="lg"
              className="w-full sm:w-auto bg-jules-accent hover:bg-jules-accent/90 text-white px-8"
            >
              {state.isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Setting up...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Repository Selection Modal */}
      <RepositorySelectionModal
        isOpen={state.isModalOpen}
        onClose={() => dispatch({ type: "SET_MODAL_OPEN", payload: false })}
        repositories={state.repositories}
        selectedRepositories={state.selectedRepos}
        onSelectionChange={handleRepositorySelectionChange}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
      />
    </>
  );
}
