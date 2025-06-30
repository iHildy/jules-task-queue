import { env, getAuthMethod } from "@/lib/env";
import { Octokit } from "@octokit/rest";
import { githubAppClient } from "@/lib/github-app";
import { githubClient as personalTokenClient } from "@/lib/github";

/**
 * Unified GitHub client that abstracts personal token vs GitHub App authentication
 */
class UnifiedGitHubClient {
  private static instance: UnifiedGitHubClient;

  private constructor() {}

  public static getInstance(): UnifiedGitHubClient {
    if (!UnifiedGitHubClient.instance) {
      UnifiedGitHubClient.instance = new UnifiedGitHubClient();
    }
    return UnifiedGitHubClient.instance;
  }

  /**
   * Get the appropriate client based on configuration
   */
  private getClient() {
    const authMethod = getAuthMethod();
    
    if (authMethod === 'github-app') {
      return githubAppClient;
    } else if (authMethod === 'personal-token') {
      return personalTokenClient;
    } else {
      throw new Error('No GitHub authentication method configured');
    }
  }

  /**
   * Check if repository exists and is accessible
   */
  public async checkRepository(owner: string, repo: string): Promise<boolean> {
    const authMethod = getAuthMethod();
    
    if (authMethod === 'github-app') {
      return githubAppClient.isRepositoryAccessible(owner, repo);
    } else if (authMethod === 'personal-token') {
      return personalTokenClient.checkRepository(owner, repo);
    }
    
    return false;
  }

  /**
   * Get issue details
   */
  public async getIssue(owner: string, repo: string, issue_number: number) {
    const authMethod = getAuthMethod();
    
    if (authMethod === 'github-app') {
      const response = await githubAppClient.getIssue(owner, repo, issue_number);
      return response.data;
    } else if (authMethod === 'personal-token') {
      return personalTokenClient.getIssue(owner, repo, issue_number);
    }
    
    throw new Error('No GitHub authentication method configured');
  }

  /**
   * Get all comments for an issue
   */
  public async getIssueComments(owner: string, repo: string, issue_number: number) {
    const authMethod = getAuthMethod();
    
    if (authMethod === 'github-app') {
      const response = await githubAppClient.getIssueComments(owner, repo, issue_number);
      return response.data;
    } else if (authMethod === 'personal-token') {
      return personalTokenClient.getIssueComments(owner, repo, issue_number);
    }
    
    throw new Error('No GitHub authentication method configured');
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
  ) {
    const authMethod = getAuthMethod();
    
    if (authMethod === 'github-app') {
      const response = await githubAppClient.createComment(owner, repo, issue_number, body);
      console.log(`Created comment on ${owner}/${repo}#${issue_number}`);
      return response.data;
    } else if (authMethod === 'personal-token') {
      return personalTokenClient.createComment(owner, repo, issue_number, body);
    }
    
    throw new Error('No GitHub authentication method configured');
  }

  /**
   * Add an emoji reaction to a comment
   */
  public async addReactionToComment(
    owner: string,
    repo: string,
    comment_id: number,
    content: "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes",
  ) {
    const authMethod = getAuthMethod();
    
    if (authMethod === 'github-app') {
      const response = await githubAppClient.addReactionToComment(owner, repo, comment_id, content);
      console.log(`Added ${content} reaction to comment ${comment_id} on ${owner}/${repo}`);
      return response.data;
    } else if (authMethod === 'personal-token') {
      return personalTokenClient.addReactionToComment(owner, repo, comment_id, content);
    }
    
    throw new Error('No GitHub authentication method configured');
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
    label: string,
  ) {
    const authMethod = getAuthMethod();
    
    if (authMethod === 'github-app') {
      await githubAppClient.addLabel(owner, repo, issue_number, label);
      console.log(`Added label '${label}' to ${owner}/${repo}#${issue_number}`);
    } else if (authMethod === 'personal-token') {
      return personalTokenClient.addLabel(owner, repo, issue_number, label);
    } else {
      throw new Error('No GitHub authentication method configured');
    }
  }

  /**
   * Remove a label from an issue
   */
  public async removeLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string,
  ) {
    const authMethod = getAuthMethod();
    
    if (authMethod === 'github-app') {
      try {
        await githubAppClient.removeLabel(owner, repo, issue_number, label);
        console.log(`Removed label '${label}' from ${owner}/${repo}#${issue_number}`);
      } catch (error: any) {
        // If label doesn't exist, that's fine
        if (error.message && error.message.includes("Label does not exist")) {
          console.log(`Label '${label}' doesn't exist on ${owner}/${repo}#${issue_number}`);
          return;
        }
        throw error;
      }
    } else if (authMethod === 'personal-token') {
      return personalTokenClient.removeLabel(owner, repo, issue_number, label);
    } else {
      throw new Error('No GitHub authentication method configured');
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

  /**
   * Get authentication method information
   */
  public getAuthInfo() {
    const authMethod = getAuthMethod();
    return {
      method: authMethod,
      isGitHubApp: authMethod === 'github-app',
      isPersonalToken: authMethod === 'personal-token',
      isConfigured: authMethod !== 'none',
    };
  }
}

// Export singleton instance
export const unifiedGithubClient = UnifiedGitHubClient.getInstance();

// Export class and types
export { UnifiedGitHubClient };
export type { Octokit };