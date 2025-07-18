"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, GitBranch, Globe, Lock, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Repository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description?: string;
}

interface RepositorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  repositories: Repository[];
  selectedRepositories: Set<number>;
  onSelectionChange: (repoId: number, selected: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function RepositorySelectionModal({
  isOpen,
  onClose,
  repositories,
  selectedRepositories,
  onSelectionChange,
  onSelectAll,
  onClearAll,
}: RepositorySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter repositories based on search query
  const filteredRepositories = useMemo(() => {
    if (!searchQuery.trim()) return repositories;

    const query = searchQuery.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.fullName.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query),
    );
  }, [repositories, searchQuery]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const selectedCount = selectedRepositories.size;
  const totalCount = repositories.length;
  const filteredSelectedCount = filteredRepositories.filter((repo) =>
    selectedRepositories.has(repo.id),
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-4xl sm:h-[90vh] sm:max-h-[90vh] flex flex-col bg-jules-darker border-jules-gray/20">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white">
            <GitBranch className="h-5 w-5" />
            Select Repositories
          </DialogTitle>
          <DialogDescription className="text-jules-gray">
            Choose which repositories should have Jules labels created. You can
            search by name or description.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Actions */}
        <div className="space-y-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onSelectAll}
                disabled={selectedCount === totalCount}
              >
                <Check className="h-4 w-4 mr-2" />
                Select All ({totalCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                disabled={selectedCount === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedCount} of {totalCount} selected
              {searchQuery && filteredRepositories.length !== totalCount && (
                <span>
                  {" "}
                  • {filteredSelectedCount} of {filteredRepositories.length}{" "}
                  shown
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Repository List */}
        <ScrollArea className="flex-1 min-h-0 pr-4 overflow-y-auto">
          <div className="space-y-3">
            {filteredRepositories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? (
                  <>
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>
                      No repositories found matching &quot;{searchQuery}&quot;
                    </p>
                    <p className="text-xs">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No repositories available</p>
                  </>
                )}
              </div>
            ) : (
              filteredRepositories.map((repo) => (
                <RepositoryItem
                  key={repo.id}
                  repository={repo}
                  isSelected={selectedRepositories.has(repo.id)}
                  onSelectionChange={onSelectionChange}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-jules-gray/20 flex-shrink-0">
          <div className="text-sm text-jules-gray">
            {selectedCount > 0 && (
              <span className="text-white font-medium">
                {selectedCount} repositor{selectedCount === 1 ? "y" : "ies"}{" "}
                selected
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={onClose}
              className="bg-jules-accent hover:bg-jules-accent/90"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RepositoryItemProps {
  repository: Repository;
  isSelected: boolean;
  onSelectionChange: (repoId: number, selected: boolean) => void;
}

function RepositoryItem({
  repository,
  isSelected,
  onSelectionChange,
}: RepositoryItemProps) {
  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer hover:bg-jules-darker/60
        ${isSelected ? "border-jules-accent bg-jules-accent/5" : "border-jules-gray/20 hover:border-jules-accent"}
      `}
      onClick={() => onSelectionChange(repository.id, !isSelected)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) =>
          onSelectionChange(repository.id, !!checked)
        }
        className={cn("mt-1", isSelected && "!border-white")}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center gap-2">
            {repository.private ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium truncate text-white">
              {repository.name}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs text-white">
              {repository.private ? "Private" : "Public"}
            </Badge>
          </div>
        </div>

        <p className="text-xs text-jules-gray mb-1">{repository.fullName}</p>

        {repository.description && (
          <p className="text-sm text-jules-gray line-clamp-2">
            {repository.description}
          </p>
        )}
      </div>

      {isSelected && (
        <div className="flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-jules-accent flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
