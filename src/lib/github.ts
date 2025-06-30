import { env } from "@/lib/env";
import { Octokit } from "@octokit/rest";
import { createAppAuth, AppAuth } from "@octokit/auth-app";

/**
 * GitHub API client singleton
 */
class GitHubClient {
  private static instance: GitHubClient;
  private appOctokit: Octokit; // Authenticates as the app itself
  private installationOctokit: Octokit | undefined; // Authenticates as a specific installation

  private constructor() {
    const privateKey = env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");

    this.appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID,
        privateKey: privateKey,
      },
      userAgent: "jules-task-queue/0.1.0",
    });

    // If a specific installation ID is provided via env, pre-authenticate for it.
    if (env.GITHUB_APP_INSTALLATION_ID) {
      const installationId = parseInt(env.GITHUB_APP_INSTALLATION_ID, 10);
      if (!isNaN(installationId)) {
        this.getInstallationOctokit(installationId)
          .then(octokit => {
            this.installationOctokit = octokit;
            console.log(`GitHubClient initialized for installation ID: ${installationId}`);
          })
          .catch(error => {
            console.error(`Failed to initialize GitHubClient for installation ID ${installationId}:`, error);
          });
      } else {
        console.warn("Invalid GITHUB_APP_INSTALLATION_ID provided in environment.");
      }
    }
  }

  public static getInstance(): GitHubClient {
    if (!GitHubClient.instance) {
      GitHubClient.instance = new GitHubClient();
    }
    return GitHubClient.instance;
  }

  /**
   * Get the raw Octokit client for advanced operations
   * @deprecated Prefer using methods that ensure proper installation context,
   * or use getInstallationOctokit(installationId) for specific operations.
   * This method returns the base app client or a pre-configured installation client.
   */
  public getOctokit(): Octokit {
    return this.installationOctokit || this.appOctokit;
  }

  /**
   * Check if repository exists and is accessible using a specific installation's context.
   * If installationId is not provided, it attempts to use the default configured installation.
   */
  public async checkRepository(owner: string, repo: string, installationId?: number): Promise<boolean> {
    try {
      const octokit = installationId ? await this.getInstallationOctokit(installationId) : this.getDefaultOctokit();
      await octokit.rest.repos.get({ owner, repo });
      return true;
    } catch (error) {
      console.error(`Repository ${owner}/${repo} not accessible (installationId: ${installationId || 'default'}):`, error);
      return false;
    }
  }

  /**
   * Get issue details by number using a specific installation's context.
   * If installationId is not provided, it attempts to use the default configured installation.
   */
  public async getIssue(owner: string, repo: string, issue_number: number, installationId?: number) {
    try {
      const octokit = installationId ? await this.getInstallationOctokit(installationId) : this.getDefaultOctokit();
      const response = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Failed to get issue ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all comments for an issue using a specific installation's context.
   * If installationId is not provided, it attempts to use the default configured installation.
   */
  public async getIssueComments(
    owner: string,
    repo: string,
    issue_number: number,
    installationId?: number,
  ) {
    try {
      const octokit = installationId ? await this.getInstallationOctokit(installationId) : this.getDefaultOctokit();
      const response = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Failed to get comments for ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get comments from a specific bot user using a specific installation's context.
   */
  public async getBotComments(
    owner: string,
    repo: string,
    issue_number: number,
    botUsername: string,
    installationId?: number,
  ) {
    const comments = await this.getIssueComments(owner, repo, issue_number, installationId);
    return comments.filter(
      (comment) =>
        comment.user?.login === botUsername ||
        comment.user?.login.includes(botUsername.replace("[bot]", "")),
    );
  }

  /**
   * Create a comment on an issue using a specific installation's context.
   */
  public async createComment(
    owner: string,
    repo: string,
    issue_number: number,
    body: string,
    installationId?: number,
  ) {
    try {
      const octokit = installationId ? await this.getInstallationOctokit(installationId) : this.getDefaultOctokit();
      const response = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body,
      });
      console.log(`Created comment on ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'})`);
      return response.data;
    } catch (error) {
      console.error(
        `Failed to create comment on ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Add an emoji reaction to a comment using a specific installation's context.
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
    try {
      const octokit = installationId ? await this.getInstallationOctokit(installationId) : this.getDefaultOctokit();
      const response = await octokit.rest.reactions.createForIssueComment({
        owner,
        repo,
        comment_id,
        content,
      });
      console.log(
        `Added ${content} reaction to comment ${comment_id} on ${owner}/${repo} (installationId: ${installationId || 'default'})`,
      );
      return response.data;
    } catch (error) {
      console.error(
        `Failed to add reaction to comment ${comment_id} on ${owner}/${repo} (installationId: ${installationId || 'default'}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a quote reply comment using a specific installation's context.
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
   * Add a label to an issue using a specific installation's context.
   */
  public async addLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string,
    installationId?: number,
  ) {
    try {
      const octokit = installationId ? await this.getInstallationOctokit(installationId) : this.getDefaultOctokit();
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number,
        labels: [label],
      });
      console.log(`Added label '${label}' to ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'})`);
    } catch (error) {
      console.error(
        `Failed to add label '${label}' to ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove a label from an issue using a specific installation's context.
   */
  public async removeLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string,
    installationId?: number,
  ) {
    try {
      const octokit = installationId ? await this.getInstallationOctokit(installationId) : this.getDefaultOctokit();
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number,
        name: label,
      });
      console.log(
        `Removed label '${label}' from ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'})`,
      );
    } catch (error) {
      // If label doesn't exist, that's fine
      if (
        error instanceof Error &&
        error.message.includes("Label does not exist")
      ) {
        console.log(
          `Label '${label}' doesn't exist on ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'})`,
        );
        return;
      }
      console.error(
        `Failed to remove label '${label}' from ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if an issue has a specific label using a specific installation's context.
   */
  public async hasLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string,
    installationId?: number,
  ): Promise<boolean> {
    try {
      // getIssue will use the appropriate octokit instance
      const issue = await this.getIssue(owner, repo, issue_number, installationId);
      return (
        issue.labels?.some((l) =>
          typeof l === "string" ? l === label : l.name === label,
        ) ?? false
      );
    } catch (error) {
      console.error(
        `Failed to check label '${label}' on ${owner}/${repo}#${issue_number} (installationId: ${installationId || 'default'}):`,
        error,
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
    addLabel: string,
  ) {
    try {
      // Remove the old label and add the new one
      await Promise.all([
        this.removeLabel(owner, repo, issue_number, removeLabel),
        this.addLabel(owner, repo, issue_number, addLabel),
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
}

// Export singleton instance
export const githubClient = GitHubClient.getInstance();

// Export types and utilities
export { GitHubClient };
export type { Octokit };
