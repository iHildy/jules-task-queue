/**
 * Check GitHub Installations Script
 */

import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Set up paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Add the root directory to the module path
process.chdir(rootDir);

// Set environment variable to skip validation for script
process.env.SKIP_ENV_VALIDATION = "true";

/**
 * Main execution function
 */
async function checkInstallations() {
  try {
    console.log("🔍 Checking GitHub installations...");

    // Import Prisma client directly
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();

    try {
      // Check all installations
      const installations = await db.gitHubInstallation.findMany({
        include: {
          repositories: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      console.log(`📊 Found ${installations.length} GitHub installations`);

      if (installations.length > 0) {
        console.log("\n📋 Installations:");
        installations.forEach((installation) => {
          console.log(
            `  - Installation ${installation.id}: ${installation.accountLogin} (${installation.accountType})`,
          );
          console.log(
            `    Target: ${installation.targetType}, Selection: ${installation.repositorySelection}`,
          );
          console.log(
            `    Suspended: ${installation.suspendedAt ? "Yes" : "No"}`,
          );
          console.log(`    Repositories: ${installation.repositories.length}`);

          if (installation.repositories.length > 0) {
            console.log("    Repository list:");
            installation.repositories.forEach((repo) => {
              console.log(
                `      - ${repo.fullName} (${repo.removedAt ? "Removed" : "Active"})`,
              );
            });
          }
        });
      } else {
        console.log("❌ No GitHub installations found in database.");
        console.log(
          "   This explains why the GitHub app authentication is failing.",
        );
      }
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    console.error("❌ Error checking installations:", error);
    process.exit(1);
  }
}

// Execute the check
checkInstallations();
