import { env } from "@/lib/env";
import { Octokit } from "@octokit/rest";

/**
 * GitHub API client singleton
 */
class GitHubClient {
  private static instance: GitHubClient;
  private octokit: Octokit;

  private constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN,
      userAgent: "jules-task-queue/0.1.0",
    });
  }

  public static getInstance(): GitHubClient {
    if (!GitHubClient.instance) {
      GitHubClient.instance = new GitHubClient();
    }
    return GitHubClient.instance;
  }

  /**
   * Get the raw Octokit client for advanced operations
   */
  public getOctokit(): Octokit {
    return this.octokit;
  }

  /**
   * Check if repository exists and is accessible
   */
  public async checkRepository(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({ owner, repo });
      return true;
    } catch (error) {
      console.error(`Repository ${owner}/${repo} not accessible:`, error);
      return false;
    }
  }

  /**
   * Get issue details by number
   */
  public async getIssue(owner: string, repo: string, issue_number: number) {
    try {
      const response = await this.octokit.rest.issues.get({
        owner,
        repo,
        issue_number,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Failed to get issue ${owner}/${repo}#${issue_number}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all comments for an issue
   */
  public async getIssueComments(
    owner: string,
    repo: string,
    issue_number: number
  ) {
    try {
      const response = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Failed to get comments for ${owner}/${repo}#${issue_number}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get comments from a specific bot user (like google-labs-jules[bot])
   */
  public async getBotComments(
    owner: string,
    repo: string,
    issue_number: number,
    botUsername: string
  ) {
    const comments = await this.getIssueComments(owner, repo, issue_number);
    return comments.filter(
      (comment) =>
        comment.user?.login === botUsername ||
        comment.user?.login.includes(botUsername.replace("[bot]", ""))
    );
  }

  /**
   * Create a comment on an issue
   */
  public async createComment(
    owner: string,
    repo: string,
    issue_number: number,
    body: string
  ) {
    try {
      const response = await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body,
      });
      console.log(`Created comment on ${owner}/${repo}#${issue_number}`);
      return response.data;
    } catch (error) {
      console.error(
        `Failed to create comment on ${owner}/${repo}#${issue_number}:`,
        error
      );
      throw error;
    }
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
      | "eyes"
  ) {
    try {
      const response = await this.octokit.rest.reactions.createForIssueComment({
        owner,
        repo,
        comment_id,
        content,
      });
      console.log(
        `Added ${content} reaction to comment ${comment_id} on ${owner}/${repo}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Failed to add reaction to comment ${comment_id} on ${owner}/${repo}:`,
        error
      );
      throw error;
    }
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
    originalAuthor?: string
  ) {
    const quotedText = originalComment
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");

    const authorText = originalAuthor ? `@${originalAuthor} ` : "";
    const body = `${authorText}${quotedText}\n\n${replyText}`;

    return this.createComment(owner, repo, issue_number, body);
  }

  /**
   * Add a label to an issue
   */
  public async addLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string
  ) {
    try {
      await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number,
        labels: [label],
      });
      console.log(`Added label '${label}' to ${owner}/${repo}#${issue_number}`);
    } catch (error) {
      console.error(
        `Failed to add label '${label}' to ${owner}/${repo}#${issue_number}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Remove a label from an issue
   */
  public async removeLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string
  ) {
    try {
      await this.octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number,
        name: label,
      });
      console.log(
        `Removed label '${label}' from ${owner}/${repo}#${issue_number}`
      );
    } catch (error) {
      // If label doesn't exist, that's fine
      if (
        error instanceof Error &&
        error.message.includes("Label does not exist")
      ) {
        console.log(
          `Label '${label}' doesn't exist on ${owner}/${repo}#${issue_number}`
        );
        return;
      }
      console.error(
        `Failed to remove label '${label}' from ${owner}/${repo}#${issue_number}:`,
        error
      );
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
    label: string
  ): Promise<boolean> {
    try {
      const issue = await this.getIssue(owner, repo, issue_number);
      return (
        issue.labels?.some((l) =>
          typeof l === "string" ? l === label : l.name === label
        ) ?? false
      );
    } catch (error) {
      console.error(
        `Failed to check label '${label}' on ${owner}/${repo}#${issue_number}:`,
        error
      );
      return false;
    }
  }

  /**
   * Swap labels on an issue (remove one, add another)
   * Useful for jules -> jules-queue transitions
   */
  public async swapLabels(
    owner: string,
    repo: string,
    issue_number: number,
    removeLabel: string,
    addLabel: string
  ) {
    try {
      // Remove the old label and add the new one
      await Promise.all([
        this.removeLabel(owner, repo, issue_number, removeLabel),
        this.addLabel(owner, repo, issue_number, addLabel),
      ]);
      console.log(
        `Swapped labels: '${removeLabel}' -> '${addLabel}' on ${owner}/${repo}#${issue_number}`
      );
    } catch (error) {
      console.error(
        `Failed to swap labels on ${owner}/${repo}#${issue_number}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Parse repository information from a GitHub URL or full name
   */
  public static parseRepoInfo(
    repoString: string
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
}

// Export singleton instance
export const githubClient = GitHubClient.getInstance();

// Export types and utilities
export { GitHubClient };
export type { Octokit };
