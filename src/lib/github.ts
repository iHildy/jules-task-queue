import { githubAppClient, userOwnedGithubAppClient } from "@/lib/github-app";
import { installationService } from "@/lib/installation-service";
import type { Octokit } from "@octokit/rest";

/**
 * GitHub API client (now using GitHub App only)
 */
class GitHubClient {
  private static instance: GitHubClient;

  private constructor() {}

  public static getInstance(): GitHubClient {
    if (!GitHubClient.instance) {
      GitHubClient.instance = new GitHubClient();
    }
    return GitHubClient.instance;
  }

  /**
   * Get a GitHub App client authenticated as the user
   */
  public async getUserOwnedGitHubAppClient(installationId: number) {
    return userOwnedGithubAppClient(installationId);
  }

  /**
   * Get the raw GitHub App client for advanced operations
   */
  public getGitHubAppClient() {
    return githubAppClient;
  }

  /**
   * Check if repository exists and is accessible through any installation
   */
  public async checkRepository(owner: string, repo: string): Promise<boolean> {
    return installationService.isRepositoryAccessible(owner, repo);
  }

  /**
   * Get issue details
   */
  public async getIssue(
    owner: string,
    repo: string,
    issue_number: number,
    installationId?: number,
  ) {
    const response = await githubAppClient.getIssue(
      owner,
      repo,
      issue_number,
      installationId,
    );
    return response.data;
  }

  /**
   * Get all comments for an issue
   */
  public async getIssueComments(
    owner: string,
    repo: string,
    issue_number: number,
    installationId?: number,
  ) {
    const response = await githubAppClient.getIssueComments(
      owner,
      repo,
      issue_number,
      installationId,
    );
    return response.data;
  }

  /**
   * Get comments from a specific bot user
   */
  public async getBotComments(
    owner: string,
    repo: string,
    issue_number: number,
    botUsername: string,
  ) {
    const comments = await this.getIssueComments(owner, repo, issue_number);
    return comments.filter(
      (comment) =>
        comment.user?.login === botUsername ||
        comment.user?.login.includes(botUsername.replace("[bot]", "")),
    );
  }

  /**
   * Create a comment on an issue
   */
  public async createComment(
    owner: string,
    repo: string,
    issue_number: number,
    body: string,
    installationId?: number,
  ) {
    const response = await githubAppClient.createComment(
      owner,
      repo,
      issue_number,
      body,
      installationId,
    );
    console.log(`Created comment on ${owner}/${repo}#${issue_number}`);
    return response.data;
  }

  /**
   * Add an emoji reaction to a comment
   */
  public async addReactionToComment(
    owner: string,
    repo: string,
    comment_id: number,
    content:
      | "+1"
      | "-1"
      | "laugh"
      | "confused"
      | "heart"
      | "hooray"
      | "rocket"
      | "eyes",
    installationId?: number,
  ) {
    const response = await githubAppClient.addReactionToComment(
      owner,
      repo,
      comment_id,
      content,
      installationId,
    );
    console.log(
      `Added ${content} reaction to comment ${comment_id} on ${owner}/${repo}`,
    );
    return response.data;
  }

  /**
   * Create a quote reply comment
   */
  public async createQuoteReply(
    owner: string,
    repo: string,
    issue_number: number,
    originalComment: string,
    replyText: string,
    originalAuthor?: string,
    installationId?: number,
  ) {
    const quotedText = originalComment
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");

    const authorText = originalAuthor ? `@${originalAuthor} ` : "";
    const body = `${authorText}${quotedText}\n\n${replyText}`;

    return this.createComment(owner, repo, issue_number, body, installationId);
  }

  /**
   * Add a label to an issue
   */
  public async addLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string,
    installationId?: number,
  ) {
    await githubAppClient.addLabel(
      owner,
      repo,
      issue_number,
      label,
      installationId,
    );
    console.log(`Added label '${label}' to ${owner}/${repo}#${issue_number}`);
  }

  /**
   * Remove a label from an issue
   */
  public async removeLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string,
    installationId?: number,
  ) {
    try {
      await githubAppClient.removeLabel(
        owner,
        repo,
        issue_number,
        label,
        installationId,
      );
      console.log(
        `Removed label '${label}' from ${owner}/${repo}#${issue_number}`,
      );
    } catch (error: unknown) {
      // If label doesn't exist, that's fine
      if (
        error instanceof Error &&
        error.message.includes("Label does not exist")
      ) {
        console.log(
          `Label '${label}' doesn't exist on ${owner}/${repo}#${issue_number}`,
        );
        return;
      }
      throw error;
    }
  }

  /**
   * Check if an issue has a specific label
   */
  public async hasLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string,
  ): Promise<boolean> {
    try {
      const issue = await this.getIssue(owner, repo, issue_number);
      return (
        issue.labels?.some((l) =>
          typeof l === "string" ? l === label : l.name === label,
        ) ?? false
      );
    } catch (error) {
      console.error(
        `Failed to check label '${label}' on ${owner}/${repo}#${issue_number}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Swap labels on an issue (remove one, add another)
   */
  public async swapLabels(
    owner: string,
    repo: string,
    issue_number: number,
    removeLabel: string,
    addLabel: string,
    installationId?: number,
  ) {
    try {
      // Remove the old label and add the new one
      await Promise.all([
        this.removeLabel(
          owner,
          repo,
          issue_number,
          removeLabel,
          installationId,
        ),
        this.addLabel(owner, repo, issue_number, addLabel, installationId),
      ]);
      console.log(
        `Swapped labels: '${removeLabel}' -> '${addLabel}' on ${owner}/${repo}#${issue_number}`,
      );
    } catch (error) {
      console.error(
        `Failed to swap labels on ${owner}/${repo}#${issue_number}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Parse repository information from a GitHub URL or full name
   */
  public static parseRepoInfo(
    repoString: string,
  ): { owner: string; repo: string } | null {
    // Handle format: "owner/repo"
    if (repoString.includes("/") && !repoString.includes("github.com")) {
      const [owner, repo] = repoString.split("/");
      if (owner && repo) {
        return { owner, repo };
      }
    }

    // Handle GitHub URLs
    const githubUrlRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoString.match(githubUrlRegex);
    if (match) {
      return { owner: match[1]!, repo: match[2]! };
    }

    return null;
  }

  /**
   * Star a repository for the authenticated user
   */
  public async starRepository(
    octokit: Octokit,
    owner: string,
    repo: string,
  ): Promise<void> {
    await octokit.request("PUT /user/starred/{owner}/{repo}", {
      owner,
      repo,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  }

  /**
   * Check if a repository is starred by the authenticated user
   */
  public async checkIfRepositoryIsStarred(
    octokit: Octokit,
    owner: string,
    repo: string,
  ): Promise<boolean> {
    try {
      await octokit.request("GET /user/starred/{owner}/{repo}", {
        owner,
        repo,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      return true;
    } catch (error: unknown) {
      // Octokit throws an error for non-2xx status codes, 404 is expected if not starred
      if (error instanceof Error && error.message.includes("Not Found")) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if a user has starred a specific repository (passive check)
   * Uses the installation token to check the user's starred repositories
   */
  public async checkIfUserStarredRepository(
    octokit: Octokit,
    username: string,
    targetOwner: string,
    targetRepo: string,
  ): Promise<boolean> {
    try {
      // Use the GitHub API to get the user's starred repositories
      // We'll paginate through them to find the target repository
      let page = 1;
      const perPage = 100; // Maximum per page

      while (true) {
        const response = await octokit.request(
          "GET /users/{username}/starred",
          {
            username,
            per_page: perPage,
            page,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );

        // Check if the target repository is in this page
        const foundRepo = response.data.find(
          (item: {
            repo?: { owner?: { login?: string }; name?: string };
            owner?: { login?: string };
            name?: string;
          }) => {
            // Handle both formats: direct repo object or starred_at + repo object
            const repo = item.repo || item;
            return (
              repo.owner?.login?.toLowerCase() === targetOwner.toLowerCase() &&
              repo.name?.toLowerCase() === targetRepo.toLowerCase()
            );
          },
        );

        if (foundRepo) {
          return true;
        }

        // If we got less than the full page, we've reached the end
        if (response.data.length < perPage) {
          break;
        }

        page++;
      }

      return false;
    } catch (error) {
      console.error("Failed to check user starred repositories:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const githubClient = GitHubClient.getInstance();

// Export types and utilities
export { GitHubClient };
export type { Octokit };
