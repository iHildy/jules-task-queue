import { githubAppClient } from "@/lib/github-app";
import logger from "@/lib/logger";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner?: { login: string }; // Optional for installation webhooks
  private: boolean;
  html_url?: string;
  description?: string;
}

interface LabelDefinition {
  name: string;
  color: string;
  description: string;
}

/**
 * Jules label definitions with colors from globals.css
 */
const JULES_LABELS: LabelDefinition[] = [
  {
    name: "jules",
    color: "642cc2", // Jules-primary color from globals.css
    description: "Issues that Jules should process",
  },
  {
    name: "jules-queue",
    color: "00d3f2", // Jules-cyan color from globals.css
    description: "Issues queued for Jules processing",
  },
  {
    name: "jules-done",
    color: "e539a6", // Jules-done color
    description: "Tasks completed by Jules",
  },
];

/**
 * Create Jules labels in a single repository with proper error handling
 */
async function createJulesLabelsInRepository(
  owner: string,
  repo: string,
  installationId: number,
): Promise<void> {
  try {
    const octokit =
      await githubAppClient.getInstallationOctokit(installationId);

    for (const label of JULES_LABELS) {
      try {
        // Try to create the label
        await octokit.rest.issues.createLabel({
          owner,
          repo,
          name: label.name,
          color: label.color,
          description: label.description,
        });
        logger.info(`Created label '${label.name}' in ${owner}/${repo}`);
      } catch (error: unknown) {
        // If label already exists, that's fine
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          error.status === 422 &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response &&
          error.response.data &&
          typeof error.response.data === "object" &&
          "errors" in error.response.data &&
          Array.isArray(error.response.data.errors) &&
          error.response.data.errors[0]?.code === "already_exists"
        ) {
          logger.info(
            `Label '${label.name}' already exists in ${owner}/${repo}`,
          );
        } else {
          // Log other errors but don't fail the installation
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.warn(
            {
              error: errorMessage,
              owner,
              repo,
              label: label.name,
            },
            `Failed to create label in repository`,
          );
        }
      }
    }
  } catch (error: unknown) {
    // Log descriptive error as requested, but don't fail the installation
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        owner,
        repo,
        error: errorMessage,
      },
      "Failed to create Jules labels - ensure 'Issues: Write' permission",
    );
  }
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process repositories in chunks with rate limiting
 * GitHub's secondary rate limit is typically 5000 requests per hour for apps
 * We'll be conservative and process 10 repositories per batch with a 1 second delay
 */
async function processRepositoriesInChunks(
  repositories: Repository[],
  installationId: number,
  chunkSize: number = 10,
  delayMs: number = 1000,
): Promise<void> {
  logger.info(
    `Processing ${repositories.length} repositories in chunks of ${chunkSize} with ${delayMs}ms delay`,
  );

  for (let i = 0; i < repositories.length; i += chunkSize) {
    const chunk = repositories.slice(i, i + chunkSize);

    // Process chunk in parallel
    await Promise.all(
      chunk.map((repo) => {
        // Extract owner from full_name if owner object is not available (installation webhooks)
        const owner =
          repo.owner?.login || repo.full_name.split("/")[0] || "unknown";
        return createJulesLabelsInRepository(owner, repo.name, installationId);
      }),
    );

    // Add delay between chunks to respect rate limits (except for the last chunk)
    if (i + chunkSize < repositories.length) {
      logger.info(
        `Processed chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(repositories.length / chunkSize)}, waiting ${delayMs}ms...`,
      );
      await sleep(delayMs);
    }
  }

  logger.info(`Completed processing all ${repositories.length} repositories`);
}

/**
 * Create Jules labels for multiple repositories with rate limiting and chunking
 */
export async function createJulesLabelsForRepositories(
  repositories: Repository[],
  installationId: number,
): Promise<void> {
  if (repositories.length === 0) {
    logger.info("No repositories to process for label creation");
    return;
  }

  if (repositories.length === 1) {
    // Single repository - no need for chunking
    const repo = repositories[0];
    if (repo) {
      // Extract owner from full_name if owner object is not available (installation webhooks)
      const owner =
        repo.owner?.login || repo.full_name.split("/")[0] || "unknown";
      await createJulesLabelsInRepository(owner, repo.name, installationId);
    }
    return;
  }

  // Multiple repositories - use chunking and rate limiting
  await processRepositoriesInChunks(repositories, installationId);
}

/**
 * Create Jules labels for a single repository
 */
export async function createJulesLabelsForRepository(
  owner: string,
  repo: string,
  installationId: number,
): Promise<void> {
  await createJulesLabelsInRepository(owner, repo, installationId);
}

/**
 * Get the list of Jules labels that should be created
 */
export function getJulesLabels(): readonly LabelDefinition[] {
  return JULES_LABELS;
}
