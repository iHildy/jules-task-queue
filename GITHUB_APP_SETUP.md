# GitHub App Setup Guide for Jules Task Queue

This guide provides step-by-step instructions for creating, configuring, and deploying the necessary GitHub App to allow the Jules Task Queue system to interact with your GitHub repositories.

## Table of Contents
1.  [Introduction](#1-introduction)
2.  [Creating the GitHub App](#2-creating-the-github-app)
    *   [Navigation](#navigation)
    *   [Initial App Registration](#initial-app-registration)
    *   [Webhook Configuration](#webhook-configuration)
    *   [Permissions Configuration](#permissions-configuration)
    *   [Event Subscriptions](#event-subscriptions)
    *   [Installation Settings](#installation-settings)
3.  [Generating Private Key & Noting IDs](#3-generating-private-key--noting-ids)
    *   [Generate Private Key](#generate-private-key)
    *   [Note App ID](#note-app-id)
4.  [Installing the GitHub App](#4-installing-the-github-app)
    *   [Installation Process](#installation-process)
    *   [Finding the Installation ID (Optional but Recommended)](#finding-the-installation-id-optional-but-recommended)
5.  [Environment Variable Setup](#5-environment-variable-setup)
    *   [Required Variables](#required-variables)
    *   [`.env.example` Reference](#envexample-reference)
6.  [Application URL Configuration](#6-application-url-configuration)
    *   [Setting `NEXT_PUBLIC_APP_URL`](#setting-next_public_app_url)
    *   [Updating GitHub App URLs](#updating-github-app-urls)
7.  [Platform-Specific Deployment Notes](#7-platform-specific-deployment-notes)
    *   [General](#general)
    *   [Vercel](#vercel)
    *   [Docker (Self-Hosting)](#docker-self-hosting)
    *   [Firebase](#firebase)
8.  [Testing and Troubleshooting](#8-testing-and-troubleshooting)
    *   [Installation Flow Test](#installation-flow-test)
    *   [Webhook Delivery](#webhook-delivery)
    *   [API Interactions](#api-interactions)
    *   [Common Issues](#common-issues)

---

## 1. Introduction

The Jules Task Queue uses a GitHub App to securely interact with the GitHub API. This provides more granular permissions and better control compared to using Personal Access Tokens. This guide will walk you through setting up your own GitHub App for your self-hosted instance.

## 2. Creating the GitHub App

### Navigation
1.  Go to your GitHub Settings:
    *   Click on your profile picture in the top-right corner.
    *   Select "Settings".
2.  In the left sidebar, scroll down and click "Developer settings".
3.  Select "GitHub Apps".
4.  Click the "New GitHub App" button.

### Initial App Registration
*   **GitHub App name:**
    *   Choose a unique and descriptive name (e.g., "Jules Task Processor - MyOrg", "MyProjectJulesQueue").
    *   This name will be visible to users when they install the app.
*   **Homepage URL:**
    *   Enter the URL where your application will be hosted (e.g., `https://jules.example.com`).
    *   This can also be your organization's website or the GitHub repository URL if a dedicated homepage isn't available yet.
*   **Identifying and authorizing users:**
    *   **Callback URL:** This will be your application's callback endpoint. Set it to:
        `https://<your-app-url>/api/github/callback`
        (Replace `<your-app-url>` with your actual application's public URL, which you will define in `NEXT_PUBLIC_APP_URL`). You might update this later once your app is deployed.
    *   **Setup URL:** (Optional but Recommended for the "Link GitHub Repository" button flow)
        This URL is where users are redirected after installing the app. Set it to the same as your Callback URL:
        `https://<your-app-url>/api/github/callback`
        Alternatively, if you want a pre-installation page: `https://<your-app-url>/github-setup-initiate` (you would need to build this page). For most direct setups, the callback URL is fine.
    *   Uncheck "Expire user authorization tokens".

### Webhook Configuration
*   **Active:** Check this box to enable webhooks.
*   **Webhook URL:**
    *   Enter your application's webhook handler endpoint:
        `https://<your-app-url>/api/webhooks/github`
        (Replace `<your-app-url>` with your actual application's public URL).
*   **Webhook secret:**
    *   Generate a strong, random string (e.g., using a password manager or `openssl rand -hex 20`).
    *   **Important:** Save this secret. You will use it for the `GITHUB_WEBHOOK_SECRET` environment variable in your application.

### Permissions Configuration
Scroll down to the "Permissions" section. Grant the following permissions:

*   **Repository permissions:**
    *   **Issues:** Access: `Read & write`.
        *   *Reason: To read issue details, labels, and comments, and to create comments and modify labels.*
    *   **Contents:** Access: `Read-only`.
        *   *Reason: Required for some operations like checking repository accessibility and potentially for future features involving code analysis. If not strictly needed now, it's a safe default.*
    *   **Metadata:** Access: `Read-only`.
        *   *Reason: This is a base permission, often granted by default, allowing the app to access basic repository information.*
    *   **(Optional) Pull Requests:** Access: `Read & write`.
        *   *Reason: If you plan to extend the application to interact with Pull Request comments or labels in the future.*

*   **Organization permissions:**
    *   Generally, no organization permissions are needed if the app is installed on specific repositories.

*   **Account permissions:**
    *   No account permissions are typically needed for this server-to-server application.

### Event Subscriptions
Scroll to the "Subscribe to events" section. Select the following events:

*   [x] **Installation:**
    *   *Reason: To detect when the app is installed or uninstalled from an account or repository, which is useful for managing `installation_id`s.*
*   [x] **Installation repositories:**
    *   *Reason: To detect when repositories are added to or removed from an existing installation.*
*   [x] **Issues:**
    *   *Reason: For events like issue opened, edited, closed, labeled, unlabeled, etc.*
*   [x] **Issue comment:**
    *   *Reason: For events like comment created, edited, or deleted.*

### Installation Settings
*   **Where can this GitHub App be installed?:**
    *   **Only on this account:** If the app will only be used for repositories owned by the same account (user or organization) that is creating the app. This is typical for a self-hosted setup.
    *   **Any account:** If you intend for any GitHub user or organization to install your app (less common for a private, self-hosted instance unless you plan to offer it as a wider service).

Finally, click **"Create GitHub App"** at the bottom of the page.

## 3. Generating Private Key & Noting IDs

After your GitHub App is created, you will be redirected to its settings page.

### Generate Private Key
1.  Scroll down to the "Private keys" section.
2.  Click **"Generate a private key"**.
3.  A `.pem` file will be downloaded (e.g., `your-app-name.YYYY-MM-DD.private-key.pem`).
4.  **Crucial:** Store this `.pem` file in a very secure location. It's like a password for your GitHub App.
5.  You will need the **contents** of this file for the `GITHUB_APP_PRIVATE_KEY` environment variable.

### Note App ID
1.  On your GitHub App's settings page (General tab), find the **"App ID"**. It's a numerical value.
2.  Copy this App ID. You will use it for the `GITHUB_APP_ID` environment variable.

## 4. Installing the GitHub App

### Installation Process
1.  On your GitHub App's settings page, click "Install App" in the left sidebar.
2.  Select the account (your user account or an organization) where you want to install the app.
3.  Choose which repositories the app should have access to:
    *   **All repositories:** Grants access to all current and future repositories for the selected account.
    *   **Only select repositories:** Allows you to choose specific repositories. This is generally recommended for better security.
4.  Click "Install". GitHub will then redirect you to the "Setup URL" you configured earlier (e.g., `https://<your-app-url>/api/github/callback`).

### Finding the Installation ID (Optional but Recommended)
When the app is installed, GitHub assigns an `installation_id` for that specific installation (e.g., if you install it on your user account, that's one installation; if on an organization, that's another).

*   **From Webhook Payloads:** The `installation_id` is included in every webhook event payload sent by the app (e.g., `payload.installation.id`). The application is designed to extract this at runtime.
*   **From Setup URL:** When redirected to your "Setup URL" after installation (e.g., `https://<your-app-url>/api/github/callback`), GitHub includes an `installation_id` as a query parameter. Your callback handler should capture this.
*   **Manually (if needed for `GITHUB_APP_INSTALLATION_ID`):**
    1.  Go to GitHub Settings > Applications.
    2.  Under "Installed GitHub Apps", click "Configure" next to your app for the specific installation.
    3.  The URL in your browser will look something like: `https://github.com/settings/installations/<YOUR_INSTALLATION_ID>`.
    4.  This `<YOUR_INSTALLATION_ID>` is the value you might use for the `GITHUB_APP_INSTALLATION_ID` environment variable if you intend to target only this single installation globally in your app and it's not derived from webhooks for every operation.

For most dynamic operations triggered by webhooks, the application should use the `installation_id` from the webhook payload. The `GITHUB_APP_INSTALLATION_ID` environment variable is useful if you have background jobs or scripts that need to act on behalf of a known, single installation.

## 5. Environment Variable Setup

Your application requires the following environment variables related to the GitHub App. Set these in your `.env` file for local development or in your hosting provider's environment variable settings.

### Required Variables
*   `GITHUB_APP_ID`: The App ID you noted earlier.
*   `GITHUB_APP_PRIVATE_KEY`: The full content of the `.pem` private key file.
    *   **Important:** When setting this as an environment variable (especially in hosting platforms), you might need to format it as a single line with `\n` representing newline characters.
    *   Example: `"-----BEGIN RSA PRIVATE KEY-----\nMIICXgIBAAKBgQD9pZ...rest of key...\n-----END RSA PRIVATE KEY-----"`
*   `GITHUB_WEBHOOK_SECRET`: The webhook secret you generated during app creation.
*   `GITHUB_APP_INSTALLATION_ID` (Optional): The specific Installation ID if your application is intended to primarily target one installation and you are not relying solely on webhook-derived IDs for all operations. If your application handles multiple installations or always uses IDs from webhooks, this might be left unset.
*   `NEXT_PUBLIC_APP_URL`: The publicly accessible base URL of your deployed application (e.g., `https://jules.example.com`). This is used to construct callback URLs for GitHub.

### `.env.example` Reference
Refer to your project's `.env.example` file for the exact variable names:
```env
# .env.example snippet
GITHUB_APP_ID="your_app_id"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT_HERE\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_INSTALLATION_ID="your_app_installation_id" # Optional
GITHUB_WEBHOOK_SECRET="your_webhook_secret_here"
NEXT_PUBLIC_APP_URL="http://localhost:3000" # Change for production
```

## 6. Application URL Configuration

### Setting `NEXT_PUBLIC_APP_URL`
Ensure the `NEXT_PUBLIC_APP_URL` environment variable is set correctly to the root URL where your Jules Task Queue application is publicly accessible.
*   **Local Development:** `http://localhost:3000` (or your local port)
*   **Production:** `https://your-actual-domain.com`

### Updating GitHub App URLs
After your application is deployed and you have a stable public URL, ensure your GitHub App settings are updated:
1.  Go to GitHub Settings > Developer settings > GitHub Apps > Your App > Edit.
2.  Update the following fields if they differ from your initial setup:
    *   **Homepage URL**
    *   **Callback URL:** `NEXT_PUBLIC_APP_URL/api/github/callback`
    *   **Setup URL:** `NEXT_PUBLIC_APP_URL/api/github/callback` (or your custom setup initiation page)
    *   **Webhook URL:** `NEXT_PUBLIC_APP_URL/api/webhooks/github`
3.  Save changes.

## 7. Platform-Specific Deployment Notes

### General
*   Ensure all environment variables listed above are correctly set in your deployment environment.
*   The private key (`GITHUB_APP_PRIVATE_KEY`) is sensitive. Handle it securely. Many platforms offer "secrets management" for such variables.

### Vercel
*   Add the environment variables in your Vercel project settings (Settings > Environment Variables).
*   For `GITHUB_APP_PRIVATE_KEY`, paste the entire key content. Vercel handles multi-line variables well.
*   Your `NEXT_PUBLIC_APP_URL` will be your Vercel deployment URL (e.g., `https://your-project.vercel.app`).

### Docker (Self-Hosting)
*   Provide the environment variables to your Docker container, typically through a `.env` file that is sourced by your `docker-compose.yml` or passed directly in the `docker run` command.
*   Ensure `NEXT_PUBLIC_APP_URL` points to the public URL that routes to your Docker container.

### Firebase
*   Set the environment variables as Firebase secrets using the Firebase CLI:
    ```bash
    firebase apphosting:secrets:set GITHUB_APP_ID
    # ...and so on for GITHUB_APP_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET, etc.
    # For GITHUB_APP_PRIVATE_KEY, you might need to ensure it's passed as a single string with \n characters.
    ```
*   Your `NEXT_PUBLIC_APP_URL` will be your Firebase App Hosting URL (e.g., `https://your-backend-id--your-project-id.us-central1.hosted.app`).
*   Refer to the `FIREBASE.md` guide for details on `apphosting.yaml` secret configuration.

## 8. Testing and Troubleshooting

### Installation Flow Test
1.  Ensure your application is running and accessible at `NEXT_PUBLIC_APP_URL`.
2.  On your application's landing page, click the "Link GitHub Repository" button.
3.  This should redirect you to GitHub to install or configure your GitHub App.
4.  Complete the installation/configuration on GitHub.
5.  You should be redirected back to your application's `/api/github/callback` endpoint, which should then redirect to a success page (e.g., `/success`).

### Webhook Delivery
1.  In your GitHub App's settings page, go to "Advanced".
2.  Here you can see recent webhook deliveries. Check for successful (2xx status codes) deliveries to your **Webhook URL**.
3.  If there are failures, inspect the payload and your application logs for errors.

### API Interactions
1.  Trigger actions that would cause your app to interact with the GitHub API (e.g., labeling an issue in a repository where the app is installed).
2.  Check your application logs for successful API calls or any authentication/permission errors.

### Common Issues
*   **"Invalid PEM format" or Private Key errors:**
    *   Ensure the `GITHUB_APP_PRIVATE_KEY` environment variable contains the *exact and complete* content of the `.pem` file, including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines.
    *   Ensure newline characters (`\n`) are correctly preserved or represented if storing as a single-line string.
*   **Webhook signature mismatch:**
    *   Verify that `GITHUB_WEBHOOK_SECRET` in your application exactly matches the secret configured in your GitHub App's webhook settings.
*   **403 Forbidden errors from GitHub API:**
    *   Double-check the "Permissions" configured for your GitHub App. Ensure it has the necessary permissions for the actions it's trying to perform.
    *   Ensure the `installation_id` being used is correct and the app is installed on the target repository with those permissions.
*   **Redirect URI Mismatch (for Callback/Setup URL):**
    *   Ensure the "Callback URL" and "Setup URL" in your GitHub App settings *exactly* match the URL your application expects (including `http` vs `https`). `NEXT_PUBLIC_APP_URL` must be accurate.
*   **App not installed on repository:**
    *   Ensure the GitHub App has been explicitly installed on the repository you are testing against and given access.

This guide should provide a solid foundation for setting up your GitHub App. Refer to the official GitHub documentation for more in-depth details on GitHub Apps if needed.
