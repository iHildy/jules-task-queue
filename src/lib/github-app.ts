import { env, hasGitHubApp } from "@/lib/env";
import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

/**
 * GitHub App client for installation-based authentication
 */
class GitHubAppClient {
  private static instance: GitHubAppClient | null = null;
  private app: App | null = null;
  private installationTokenCache = new Map<
    number,
    { token: string; expiresAt: Date }
  >();

  private constructor() {
    if (hasGitHubApp()) {
      this.app = new App({
        appId: env.NEXT_PUBLIC_GITHUB_APP_ID!,
        privateKey: env.GITHUB_APP_PRIVATE_KEY!,
        webhooks: {
          secret: env.GITHUB_APP_WEBHOOK_SECRET || "",
        },
      });
    }
  }

  public static getInstance(): GitHubAppClient {
    if (!GitHubAppClient.instance) {
      GitHubAppClient.instance = new GitHubAppClient();
    }
    return GitHubAppClient.instance;
  }

  /**
   * Check if GitHub App is configured
   */
  public isConfigured(): boolean {
    return !!this.app;
  }

  /**
   * Get installation access token (cached for up to 1 hour)
   */
  public async getInstallationToken(installationId: number): Promise<string> {
    if (!this.app) {
      throw new Error("GitHub App not configured");
    }

    // Check cache first
    const cached = this.installationTokenCache.get(installationId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.token;
    }

    try {
      // Get new token
      const response = await this.app.octokit.request(
        "POST /app/installations/{installation_id}/access_tokens",
        {
          installation_id: installationId,
        },
      );

      // Cache token (expires 1 hour early for safety)
      const safeExpiresAt = new Date(response.data.expires_at);
      safeExpiresAt.setMinutes(safeExpiresAt.getMinutes() - 60);

      this.installationTokenCache.set(installationId, {
        token: response.data.token,
        expiresAt: safeExpiresAt,
      });

      return response.data.token;
    } catch (error) {
      console.error(
        `Failed to get installation token for ${installationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get Octokit instance for a specific installation
   */
  public async getInstallationOctokit(
    installationId: number,
  ): Promise<Octokit> {
    const token = await this.getInstallationToken(installationId);
    return new Octokit({
      auth: token,
      userAgent: "jules-task-queue/1.0.0",
    });
  }

  /**
   * Get all installations for the app
   */
  public async getInstallations() {
    if (!this.app) {
      throw new Error("GitHub App not configured");
    }

    try {
      const { data } = await this.app.octokit.request("GET /app/installations");
      return data;
    } catch (error) {
      console.error("Failed to get installations:", error);
      throw error;
    }
  }

  /**
   * Get repositories accessible by an installation
   */
  public async getInstallationRepositories(installationId: number) {
    if (!this.app) {
      throw new Error("GitHub App not configured");
    }

    try {
      const { data } = await this.app.octokit.request(
        "GET /installation/repositories",
        {
          installation_id: installationId,
        },
      );
      return data.repositories;
    } catch (error) {
      console.error(
        `Failed to get repositories for installation ${installationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find installation ID for a specific repository
   */
  public async findInstallationForRepo(
    owner: string,
    repo: string,
  ): Promise<number | null> {
    try {
      const installations = await this.getInstallations();

      for (const installation of installations) {
        const repositories = await this.getInstallationRepositories(
          installation.id,
        );
        const found = repositories.find(
          (r: { owner: { login: string }; name: string }) =>
            r.owner.login === owner && r.name === repo,
        );
        if (found) {
          return installation.id;
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to find installation for ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Check if repository is accessible through any installation
   */
  public async isRepositoryAccessible(
    owner: string,
    repo: string,
  ): Promise<boolean> {
    const installationId = await this.findInstallationForRepo(owner, repo);
    return installationId !== null;
  }

  /**
   * Get issue details using installation authentication
   */
  public async getIssue(
    owner: string,
    repo: string,
    issue_number: number,
    installationId?: number,
  ) {
    const instId =
      installationId || (await this.findInstallationForRepo(owner, repo));
    if (!instId) {
      throw new Error(`No installation found for repository ${owner}/${repo}`);
    }

    const octokit = await this.getInstallationOctokit(instId);
    return octokit.rest.issues.get({ owner, repo, issue_number });
  }

  /**
   * Get issue comments using installation authentication
   */
  public async getIssueComments(
    owner: string,
    repo: string,
    issue_number: number,
    installationId?: number,
  ) {
    const instId =
      installationId || (await this.findInstallationForRepo(owner, repo));
    if (!instId) {
      throw new Error(`No installation found for repository ${owner}/${repo}`);
    }

    const octokit = await this.getInstallationOctokit(instId);
    return octokit.rest.issues.listComments({ owner, repo, issue_number });
  }

  /**
   * Get issue events using installation authentication
   */
  public async getIssueEvents(
    owner: string,
    repo: string,
    issue_number: number,
    installationId?: number,
  ) {
    const instId =
      installationId || (await this.findInstallationForRepo(owner, repo));
    if (!instId) {
      throw new Error(`No installation found for repository ${owner}/${repo}`);
    }

    const octokit = await this.getInstallationOctokit(instId);
    return octokit.rest.issues.listEvents({ owner, repo, issue_number });
  }

  /**
   * Create a comment using installation authentication
   */
  public async createComment(
    owner: string,
    repo: string,
    issue_number: number,
    body: string,
    installationId?: number,
  ) {
    const instId =
      installationId || (await this.findInstallationForRepo(owner, repo));
    if (!instId) {
      throw new Error(`No installation found for repository ${owner}/${repo}`);
    }

    const octokit = await this.getInstallationOctokit(instId);
    return octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });
  }

  /**
   * Add a reaction to a comment using installation authentication
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
    const instId =
      installationId || (await this.findInstallationForRepo(owner, repo));
    if (!instId) {
      throw new Error(`No installation found for repository ${owner}/${repo}`);
    }

    const octokit = await this.getInstallationOctokit(instId);
    return octokit.rest.reactions.createForIssueComment({
      owner,
      repo,
      comment_id,
      content,
    });
  }

  /**
   * Add a label to an issue using installation authentication
   */
  public async addLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string,
    installationId?: number,
  ) {
    const instId =
      installationId || (await this.findInstallationForRepo(owner, repo));
    if (!instId) {
      throw new Error(`No installation found for repository ${owner}/${repo}`);
    }

    const octokit = await this.getInstallationOctokit(instId);
    return octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number,
      labels: [label],
    });
  }

  /**
   * Remove a label from an issue using installation authentication
   */
  public async removeLabel(
    owner: string,
    repo: string,
    issue_number: number,
    label: string,
    installationId?: number,
  ) {
    const instId =
      installationId || (await this.findInstallationForRepo(owner, repo));
    if (!instId) {
      throw new Error(`No installation found for repository ${owner}/${repo}`);
    }

    const octokit = await this.getInstallationOctokit(instId);
    return octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number,
      name: label,
    });
  }

  /**
   * Clear cached tokens (useful for testing or forced refresh)
   */
  public clearTokenCache(): void {
    this.installationTokenCache.clear();
  }

  /**
   * Get app information
   */
  public async getAppInfo() {
    if (!this.app) {
      throw new Error("GitHub App not configured");
    }

    try {
      const { data } = await this.app.octokit.request("GET /app");
      return data;
    } catch (error) {
      console.error("Failed to get app info:", error);
      throw error;
    }
  }

  /**
   * Get installation information including account details
   */
  public async getInstallationInfo(installationId: number) {
    if (!this.app) {
      throw new Error("GitHub App not configured");
    }

    try {
      const { data } = await this.app.octokit.request(
        "GET /app/installations/{installation_id}",
        {
          installation_id: installationId,
        },
      );
      return data;
    } catch (error) {
      console.error(
        `Failed to get installation info for ${installationId}:`,
        error,
      );
      throw error;
    }
  }
}

// Export singleton instance
export const githubAppClient = GitHubAppClient.getInstance();

export const userOwnedGithubAppClient = async (
  installationId: number,
): Promise<Octokit> => {
  const githubApp = GitHubAppClient.getInstance();
  const token = await githubApp.getInstallationToken(installationId);
  return new Octokit({
    auth: token,
    userAgent: "jules-task-queue/1.0.0",
  });
};

// Export types and utilities
export { GitHubAppClient };
export type { App };
