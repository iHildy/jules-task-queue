# GitHub App Setup Guide

This guide walks you through creating and configuring a GitHub App for Jules Task Queue.

## Overview

GitHub Apps provide a more secure and scalable way to integrate with GitHub repositories compared to personal access tokens. With a GitHub App:

- Users can install your app on specific repositories
- The app only gets permissions for repositories where it's installed
- Webhooks are automatically configured when the app is installed
- Token management is handled automatically

## Prerequisites

- GitHub account with permission to create apps (personal or organization)
- Access to your Jules Task Queue deployment URL
- Basic understanding of GitHub Apps and webhooks

## Step 1: Create the GitHub App

### 1.1 Navigate to GitHub App Settings

**For Personal Account:**
1. Go to [GitHub Settings](https://github.com/settings/profile)
2. Click "Developer settings" in the left sidebar
3. Click "GitHub Apps"
4. Click "New GitHub App"

**For Organization:**
1. Go to your organization settings
2. Click "Developer settings" in the left sidebar  
3. Click "GitHub Apps"
4. Click "New GitHub App"

### 1.2 Configure Basic Information

**GitHub App name:** `Jules Task Queue` (or your preferred name)

**Description:** 
```
Automated task queue management for Jules bot interactions. Monitors issue labels and manages task processing workflows.
```

**Homepage URL:** 
```
https://github.com/iHildy/jules-task-queue
```

**User authorization callback URL:** 
```
https://your-domain.com/github-app/success
```

*This URL is where users will be redirected after successfully installing your GitHub App. The Jules Task Queue app includes a styled success page that provides next steps and usage instructions.*

Replace `your-domain.com` with your actual deployment URL:
- **Vercel**: `https://your-app-name.vercel.app/github-app/success`
- **Firebase**: `https://your-backend-id--your-project-id.us-central1.hosted.app/github-app/success`
- **Self-hosted**: `https://your-domain.com/github-app/success`

### 1.3 Configure Post-installation Setup

**Setup URL (optional):** 
```
https://your-domain.com/github-app/success
```

**Post-installation Options:**
- ✅ **Redirect on update** - Redirect users to the 'Setup URL' after installations are updated (e.g. repositories added/removed)

**User Authorization Options:**
- ✅ **Expire user authorization tokens** - Provides a `refresh_token` for updated access tokens when they expire
- ⬜ **Request user authorization (OAuth) during installation** - Leave unchecked unless you need user-level permissions
- ⬜ **Enable Device Flow** - Leave unchecked unless you need device-based authentication

### 1.4 Configure Webhook Settings

**Webhook URL:**
```
https://your-domain.com/api/webhooks/github-app
```

Replace `your-domain.com` with your actual deployment URL:
- **Vercel**: `https://your-app-name.vercel.app/api/webhooks/github-app`
- **Firebase**: `https://your-backend-id--your-project-id.us-central1.hosted.app/api/webhooks/github-app`
- **Self-hosted**: `https://your-domain.com/api/webhooks/github-app`

**Webhook secret:** Generate a strong random string (save this for later)
```bash
# Generate a webhook secret
openssl rand -hex 32
```

**SSL verification:** ✅ **Enable SSL verification** (Recommended for production)

### 1.5 Configure Permissions

Set the following permissions for your GitHub App:

#### Repository Permissions
- **Issues**: `Read and write`
  - *Reason: Read issue details, add comments, manage labels*
- **Metadata**: `Read` *(Required by GitHub)*
  - *Reason: Access basic repository information and validate repository access*

#### Organization Permissions
*(None required)*

#### User Permissions  
*(None required)*

### 1.6 Configure Events

Subscribe to the following events:

- **Issues** ✅
  - *Reason: Detect when 'jules' or 'jules-queue' labels are added/removed*
- **Issue comments** ✅
  - *Reason: Monitor Jules bot interactions and comment processing*

### 1.7 Configure Installation

**Where can this GitHub App be installed?**
- Select "Any account" for public use
- Select "Only on this account" for personal/organization use only

### 1.8 Create the App

Click "Create GitHub App" to create your app.

## Step 2: Generate and Download Private Key

After creating the app:

1. Scroll down to the "Private keys" section
2. Click "Generate a private key"
3. A `.pem` file will be downloaded to your computer
4. **Keep this file secure** - it's used to authenticate your app

## Step 3: Note Important Values

After creating the app, note down these values (you'll need them for configuration):

1. **App ID**: Found at the top of your app's settings page
2. **Client ID**: Found in the "About" section
3. **Client Secret**: Click "Generate a new client secret" in the "Client secrets" section
4. **Webhook Secret**: The secret you generated in step 1.3
5. **Private Key**: The `.pem` file you downloaded

## Step 4: Configure Your Application

### 4.1 Environment Variables

Add these environment variables to your deployment:

```bash
# GitHub App Configuration
GITHUB_APP_ID="123456"                    # Your App ID
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...your private key content...
-----END RSA PRIVATE KEY-----"            # Content of your .pem file
GITHUB_APP_WEBHOOK_SECRET="your-webhook-secret"
GITHUB_APP_CLIENT_ID="Iv1.your-client-id"
GITHUB_APP_CLIENT_SECRET="your-client-secret"
```

### 4.2 Private Key Formatting

The private key needs special formatting for environment variables:

**Option 1: Base64 Encode (Recommended)**
```bash
# Encode your private key
base64 -i your-app-name.private-key.pem

# Use the encoded value
GITHUB_APP_PRIVATE_KEY="LS0tLS1CRUdJTi..."
```

**Option 2: Inline with Newlines**
```bash
# Replace actual newlines with \n
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"
```

### 4.3 Platform-Specific Configuration

#### Vercel
1. Go to your project settings → Environment Variables
2. Add each environment variable
3. Redeploy your application

#### Firebase App Hosting
```bash
# Set each secret
firebase apphosting:secrets:set GITHUB_APP_ID
firebase apphosting:secrets:set GITHUB_APP_PRIVATE_KEY
firebase apphosting:secrets:set GITHUB_APP_WEBHOOK_SECRET
firebase apphosting:secrets:set GITHUB_APP_CLIENT_ID
firebase apphosting:secrets:set GITHUB_APP_CLIENT_SECRET

# Deploy
firebase deploy --only apphosting
```

#### Self-Hosted
Add to your `.env` file or environment:
```bash
GITHUB_APP_ID="123456"
GITHUB_APP_PRIVATE_KEY="your-private-key-here"
GITHUB_APP_WEBHOOK_SECRET="your-webhook-secret"
GITHUB_APP_CLIENT_ID="Iv1.your-client-id"
GITHUB_APP_CLIENT_SECRET="your-client-secret"
```

## Step 5: Test the Setup

### 5.1 Install the App

1. Go to your GitHub App's public page: `https://github.com/apps/your-app-name`
2. Click "Install"
3. Choose which repositories to install it on
4. Complete the installation

### 5.2 Test Webhook Delivery

1. Check your app's webhook deliveries in GitHub:
   - Go to your app settings
   - Click "Advanced" → "Recent Deliveries"
   - You should see installation events

2. Check your application logs for webhook processing

### 5.3 Test Issue Processing

1. Create a test issue in a repository where your app is installed
2. Add the "jules" label to the issue
3. Check that:
   - The webhook is received and processed
   - A task is created in your database
   - The system processes Jules bot comments correctly

## Step 6: Monitor and Maintain

### 6.1 Monitor Webhook Deliveries

Regularly check your GitHub App's webhook deliveries for failures:
1. Go to your app settings
2. Click "Advanced" → "Recent Deliveries"
3. Investigate any failed deliveries

### 6.2 Monitor App Installations

Track which repositories have your app installed:
1. Use the `/api/admin/installations` endpoint (if implemented)
2. Check your database's `github_installations` table
3. Monitor installation/uninstallation events in your logs

### 6.3 Update Permissions

If you need to add new permissions:
1. Update your GitHub App's permissions in settings
2. Users will need to approve the new permissions
3. Test with updated permissions

## Troubleshooting

### Common Issues

#### Webhook Not Receiving Events
- Verify webhook URL is accessible from GitHub
- Check webhook secret matches your configuration
- Ensure app is installed on the target repository
- Check GitHub's webhook delivery logs

#### Authentication Failures
- Verify private key format (no extra whitespace, correct newlines)
- Check App ID matches your configuration
- Ensure app has required permissions
- Verify installation is active (not suspended)

#### Permission Errors
- Check app has required repository permissions
- Verify app is installed on the target repository
- Ensure repository is not in a suspended installation

### Debug Commands

Test your GitHub App configuration:

```bash
# Test app authentication
curl -H "Authorization: Bearer $(your-jwt-token)" \
     https://api.github.com/app

# Test installation access
curl -H "Authorization: Bearer $(installation-token)" \
     https://api.github.com/installation/repositories

# Test webhook endpoint
curl -X GET https://your-domain.com/api/webhooks/github-app
```

### Getting Help

If you encounter issues:

1. Check the [GitHub Apps documentation](https://docs.github.com/en/developers/apps)
2. Review your application logs for error messages
3. Test webhook deliveries using GitHub's interface
4. Verify your environment variables are correctly set

## Security Best Practices

1. **Private Key Security**
   - Never commit private keys to version control
   - Use secure environment variable storage
   - Rotate keys periodically

2. **Webhook Security**
   - Always verify webhook signatures
   - Use strong webhook secrets
   - Validate payload structure

3. **Permission Minimization**
   - Only request necessary permissions
   - Review permissions regularly
   - Use installation-specific tokens

4. **Monitoring**
   - Monitor webhook delivery failures
   - Log authentication failures
   - Alert on suspicious activity

## Next Steps

After setting up your GitHub App:

1. **Public Listing**: Consider making your app publicly available in the GitHub Marketplace
2. **Enhanced Features**: Add OAuth user authentication for personalized experiences
3. **Analytics**: Implement usage analytics and monitoring
4. **Documentation**: Create user-facing documentation for app installation and usage