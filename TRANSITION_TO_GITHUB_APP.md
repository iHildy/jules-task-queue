# Transition to GitHub App Authentication

This document outlines the steps to transition the application from using a GitHub Personal Access Token (PAT) to a GitHub App for authentication and interaction with the GitHub API. This change enhances security and provides more granular control over permissions.

## To-Do List

### 1. GitHub App Creation and Configuration
- [ ] **Register a new GitHub App:**
    - Go to your GitHub settings > Developer settings > GitHub Apps > New GitHub App.
    - **GitHub App name:** Choose a descriptive name (e.g., "Jules Task Queue Integration" or your project's name).
    - **Homepage URL:** Your application's homepage or repository URL.
    - **Callback URL:** Not strictly necessary for server-to-server interaction but can be set to your application's URL.
    - **Setup URL:** (Optional) Can be used to redirect users after installation.
    - **Webhook:**
        - [ ] **Active:** Check this box.
        - [ ] **Webhook URL:** Set this to `https://your-domain.com/api/webhooks/github` (replace `your-domain.com` with your actual domain).
        - [ ] **Webhook secret:** Generate a strong, random secret. This will be used as `GITHUB_WEBHOOK_SECRET` in your application's environment.
    - **Permissions:**
        - **Repository permissions:**
            - [ ] **Issues:** `Read & write`. (Needed to read issue details, comments, create comments, manage labels related to issues).
            - [ ] **Contents:** `Read-only`. (Needed if the app needs to access repository files or for cloning. Optional if only issue interaction is required, but good for future-proofing).
            - [ ] **Metadata:** `Read-only`. (Usually a default, allows access to basic repository information).
            - [ ] **Pull Requests:** `Read & write` (If the app will interact with Pull Request comments or labels in the future).
        - **Organization permissions:** (Typically not needed if installing per-repository).
        - **Account permissions:** (Typically not needed for server-to-server interaction).
    - **Subscribe to events:**
        - [ ] `Issues`: For events like issue opened, edited, closed, labeled, unlabeled, etc.
        - [ ] `Issue comment`: For events like comment created, edited, deleted.
        - [ ] `Installation`: To detect when the app is installed or uninstalled from a repository.
        - [ ] `Installation repositories`: To detect when repositories are added or removed from an installation.
    - **Where can this GitHub App be installed?:** Choose "Only on this account" or "Any account" depending on your needs. For self-hosting, "Only on this account" (the account that will own the repositories it interacts with) is often sufficient.
- [ ] **Generate a Private Key:**
    - After creating the app, navigate to the app's settings page.
    - Under "Private keys," click "Generate a private key."
    - Download the `.pem` file. This key is sensitive and should be stored securely. Its content will be used for the `GITHUB_APP_PRIVATE_KEY` environment variable.
- [ ] **Note Down App ID:**
    - On the app's settings page, find the "App ID". This will be used as the `GITHUB_APP_ID` environment variable.
- [ ] **Install the App:**
    - Install the GitHub App on the repositories you want it to access.
    - During or after installation, you might get an **Installation ID**. This ID is specific to each installation (e.g., for each organization or user account that installs the app). For self-hosting where the app interacts with repositories owned by the same account that created the app, there will be one primary installation ID. This might be needed for `GITHUB_APP_INSTALLATION_ID` if not dynamically fetched.

### 2. Code Modifications
- [ ] **Update Environment Variable Handling (`src/lib/env.ts`):**
    - [ ] Remove `GITHUB_TOKEN` from the Zod schema and environment typings.
    - [ ] Add `GITHUB_APP_ID` (string) to the schema.
    - [ ] Add `GITHUB_APP_PRIVATE_KEY` (string) to the schema.
    - [ ] Consider how `GITHUB_APP_INSTALLATION_ID` will be handled.
        - Option A: Add `GITHUB_APP_INSTALLATION_ID` (string, optional or required depending on strategy) to the schema if a single/primary installation is assumed for self-hosting.
        - Option B: Design the system to fetch/cache installation IDs based on webhook payloads (more flexible for multiple installations).
    - [ ] Update environment validation logic.
    - [ ] Update `.env.example` with the new GitHub App variables.
- [ ] **Refactor GitHub Client (`src/lib/github.ts`):**
    - [ ] Modify `GitHubClient` to use GitHub App authentication.
    - [ ] Update Octokit initialization to use `appId` and `privateKey`.
        ```typescript
        // Example snippet for Octokit v17+ with @octokit/auth-app
        // import { createAppAuth } from "@octokit/auth-app";
        // this.octokit = new Octokit({
        //   authStrategy: createAppAuth,
        //   auth: {
        //     appId: env.GITHUB_APP_ID,
        //     privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'), // Ensure newlines are correctly formatted
        //     installationId: env.GITHUB_APP_INSTALLATION_ID, // Or fetch dynamically
        //   },
        // });
        ```
        *Note: The exact Octokit initialization might vary based on the version and helper libraries used (e.g., `octokit.App` or `@octokit/auth-app`). Ensure it correctly handles generating installation access tokens.*
    - [ ] Ensure the `privateKey` is correctly formatted (e.g., replacing `\n` with actual newlines if stored as a single-line string).
    - [ ] If `GITHUB_APP_INSTALLATION_ID` is not set globally, modify methods to accept `installationId` or retrieve it from webhook payloads when operating in a webhook context.
    - [ ] Verify all existing methods (`checkRepository`, `getIssue`, `getIssueComments`, `createComment`, `addLabel`, etc.) function correctly with the new authentication.
- [ ] **Update Webhook Handler (`src/app/api/webhooks/github/route.ts`):**
    - [ ] The `GITHUB_WEBHOOK_SECRET` verification remains the same.
    - [ ] When processing webhook events (e.g., `issues`, `issue_comment`):
        - [ ] Extract the `installation.id` from the webhook payload. This is crucial.
        - [ ] Use this `installation.id` to get an installation-specific Octokit instance if API calls are made in response to the webhook.
            ```typescript
            // Example inside webhook handler
            // const installationId = payload.installation?.id;
            // if (!installationId) { /* ... handle error ... */ }
            // const installationOctokit = await githubClient.getInstallationOctokit(installationId);
            // await installationOctokit.issues.createComment(...);
            ```
        *This might involve adding a method to `GitHubClient` like `getInstallationOctokit(installationId: number): Promise<Octokit>`.*

### 3. Documentation Updates
- [ ] **`SELF_HOSTING.md`:**
    - [ ] Remove all references to `GITHUB_TOKEN`.
    - [ ] Add a detailed section: "Setting up GitHub App for Authentication".
        - [ ] Step-by-step guide on creating the GitHub App with screenshots or clear instructions.
        - [ ] Clearly list the **required permissions** (Issues: Read & write, Contents: Read-only, Metadata: Read-only) and **webhook events** (Issues, Issue comment, Installation, Installation repositories).
        - [ ] Explain how to generate and securely store the private key.
        - [ ] Explain where to find the App ID.
        - [ ] Explain how to install the app on target repositories.
    - [ ] Update the "Environment Variables" section:
        - [ ] Remove `GITHUB_TOKEN`.
        - [ ] Add `GITHUB_APP_ID`: "Your GitHub App's ID."
        - [ ] Add `GITHUB_APP_PRIVATE_KEY`: "The content of the .pem file generated for your GitHub App. Ensure to format it correctly (e.g., if pasting into a single line, replace newlines with `\n`)."
        - [ ] Add/Clarify `GITHUB_WEBHOOK_SECRET`: "The secret you configured for the GitHub App's webhook."
        - [ ] Explain `GITHUB_APP_INSTALLATION_ID` (if used): "The Installation ID of your GitHub App on your repository/organization. You can find this in the URL when configuring an installed GitHub App, or from the 'installation' webhook event payload."
- [ ] **`FIREBASE.MD`:**
    - [ ] Apply similar documentation changes as in `SELF_HOSTING.md` regarding GitHub App creation and environment variable configuration (Firebase secrets).
- [ ] **`README.md`:**
    - [ ] Review and update any setup or configuration sections that mention the old PAT method.
    - [ ] Briefly mention the use of a GitHub App for authentication.
- [ ] **`.env.example`:**
    - [ ] Remove `GITHUB_TOKEN`.
    - [ ] Add `GITHUB_APP_ID=""`.
    - [ ] Add `GITHUB_APP_PRIVATE_KEY=""`.
    - [ ] Add or update `GITHUB_WEBHOOK_SECRET=""`.
    - [ ] Add `GITHUB_APP_INSTALLATION_ID=""` (if applicable as a static config).

### 4. Testing
- [ ] **Local Development Testing:**
    - [ ] Configure a test GitHub App and install it on a test repository.
    - [ ] Set up local environment variables with the test App's credentials.
    - [ ] Test all functionalities:
        - [ ] Receiving and processing webhook events (e.g., labeling an issue should trigger the app).
        - [ ] API calls made by the app (e.g., creating a comment in response to an event).
        - [ ] Checking for Jules bot comments.
- [ ] **Staging/Production Environment Testing (if applicable):**
    - [ ] Deploy changes to a staging environment.
    - [ ] Configure with production GitHub App credentials (or a separate staging app).
    - [ ] Perform thorough end-to-end testing.

### 5. Deployment
- [ ] Merge changes to the main branch.
- [ ] Deploy the updated application.
- [ ] Ensure all users are informed about the new setup process if they are self-hosting.

### 6. Post-Transition
- [ ] Monitor application logs for any authentication or API interaction errors.
- [ ] (Optional) Consider adding a mechanism to automatically refresh installation tokens if not handled by the Octokit library version/setup in use (Octokit's `App` class usually handles this).

This transition will significantly improve the security posture of the application. Remember to handle the private key материал with extreme care.
