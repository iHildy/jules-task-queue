# Converting to GitHub App User Access Token (OAuth During Installation)

## Overview

This document outlines the steps to convert our Jules Task Queue system to use GitHub App user access tokens that are generated automatically when users install the app. This approach ensures Jules bot responds to our automated label changes since these tokens act as the user who authorized the app.

NOTE: WE DO NOT NEED TO BE BACKWARDS COMPATIBLE WITH THE CURRENT APPROACH. WE CAN JUST USE THE USER ACCESS TOKEN APPROACH.

## Security Considerations

- User access tokens expire after 8 hours (configurable)
- Refresh tokens expire after 6 months
- Tokens must be stored securely (environment variables, encrypted database)
- Implement token refresh logic for long-running operations

## TODO List

### Phase 1: GitHub App Configuration

- [ ] **Enable OAuth during installation**
  - Go to GitHub App settings: https://github.com/settings/apps/[YOUR_APP_NAME]
  - Check "Request user authorization (OAuth) during installation"
  - Set callback URL to: `https://your-domain.com/api/auth/callback/github`
  - Save changes

- [ ] **Configure token expiration (Recommended)**
  - In GitHub App settings → Optional Features
  - Enable "User-to-server token expiration" for improved security
  - This makes tokens expire after 8 hours with 6-month refresh tokens

### Phase 2: Database Schema Updates

- [ ] **Add user token storage to database**

  ```sql
  -- Add to existing tables or create new table
  ALTER TABLE github_app_installations ADD COLUMN user_access_token TEXT;
  ALTER TABLE github_app_installations ADD COLUMN refresh_token TEXT;
  ALTER TABLE github_app_installations ADD COLUMN token_expires_at TIMESTAMP;
  ALTER TABLE github_app_installations ADD COLUMN refresh_token_expires_at TIMESTAMP;
  ```

- [ ] **Create Prisma migration**
  ```bash
  pnpm prisma migrate dev --name add_user_tokens
  ```

### Phase 3: OAuth Callback Implementation

- [ ] **Create OAuth callback endpoint**
  - File: `src/app/api/auth/callback/github/route.ts`
  - Handle the `code` parameter from GitHub
  - Exchange code for user access token
  - Store tokens in database with installation ID
  - Redirect user to success page

- [ ] **Implement token exchange logic**
  ```typescript
  // Exchange code for tokens
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({
      client_id: env.GITHUB_APP_CLIENT_ID,
      client_secret: env.GITHUB_APP_CLIENT_SECRET,
      code: code,
      redirect_uri: "https://your-domain.com/api/auth/callback/github",
    }),
  });
  ```

### Phase 4: Token Management System

- [ ] **Create token manager service**
  - File: `src/lib/token-manager.ts`
  - Methods for storing, retrieving, and refreshing tokens
  - Automatic token refresh when expired
  - Secure token encryption/decryption

- [ ] **Implement token refresh logic**
  ```typescript
  async function refreshUserToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_token_expires_in: number;
  }> {
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({
          client_id: env.GITHUB_APP_CLIENT_ID,
          client_secret: env.GITHUB_APP_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      },
    );
    return response.json();
  }
  ```

### Phase 5: Update Jules Retry System

- [ ] **Modify retry logic to use user tokens**
  - Update `src/lib/jules.ts` `processTaskRetry` function
  - Get user token from database for installation
  - Use user token for label operations instead of installation token
  - Handle token refresh if expired

- [ ] **Update GitHub client**
  - Modify `src/lib/github.ts` to accept user tokens
  - Create methods that use user tokens for label operations
  - Maintain backward compatibility with installation tokens

### Phase 6: Installation Webhook Updates

- [ ] **Update installation webhook handler**
  - File: `src/app/api/webhooks/github-app/route.ts`
  - Store installation ID when app is installed
  - Note: User tokens will be generated via OAuth callback, not webhook

- [ ] **Handle installation removal**
  - Clean up stored tokens when app is uninstalled
  - Remove from database

### Phase 7: Error Handling & Fallbacks

- [ ] **Implement graceful fallbacks**
  - If user token is missing/expired, fall back to installation token
  - Log warnings when falling back (Jules may not respond)
  - Provide clear error messages for token issues

- [ ] **Add token validation**
  - Validate tokens before use
  - Check expiration times
  - Handle 401/403 errors from GitHub API

### Phase 8: Testing & Validation

- [ ] **Test OAuth flow**
  - Install app and verify OAuth redirect works
  - Confirm tokens are stored in database
  - Test token refresh functionality

- [ ] **Test Jules integration**
  - Create test issue with `jules-queue` label
  - Run retry process with user token
  - Verify Jules responds to label changes

- [ ] **Test token expiration**
  - Simulate expired tokens
  - Verify refresh logic works
  - Test fallback to installation tokens

### Phase 9: Security & Monitoring

- [ ] **Add token encryption**
  - Encrypt tokens before storing in database
  - Use environment variables for encryption keys
  - Implement secure token rotation

- [ ] **Add monitoring**
  - Log token usage and refresh events
  - Monitor for token errors
  - Alert on token expiration issues

- [ ] **Add token cleanup**
  - Remove expired refresh tokens
  - Clean up unused installations
  - Regular database maintenance

### Phase 10: Documentation & Deployment

- [ ] **Update documentation**
  - Update `README.md` with new setup instructions
  - Document OAuth flow for users
  - Add troubleshooting guide

- [ ] **Environment variables**

  ```bash
  # Add to .env.local
  GITHUB_APP_CLIENT_ID=your_client_id
  GITHUB_APP_CLIENT_SECRET=your_client_secret
  GITHUB_APP_CALLBACK_URL=https://your-domain.com/api/auth/callback/github
  TOKEN_ENCRYPTION_KEY=your_encryption_key
  ```

- [ ] **Deploy and test**
  - Deploy to production
  - Test full OAuth flow
  - Monitor for issues

## Files to Create/Modify

### New Files:

- `src/app/api/auth/callback/github/route.ts` - OAuth callback handler
- `src/lib/token-manager.ts` - Token management service
- `prisma/migrations/[timestamp]_add_user_tokens.sql` - Database migration

### Files to Modify:

- `src/lib/jules.ts` - Update retry logic
- `src/lib/github.ts` - Add user token support
- `src/app/api/webhooks/github-app/route.ts` - Handle installations
- `prisma/schema.prisma` - Add token fields
- `README.md` - Update documentation

## Rollback Plan

If issues arise, we can:

1. Disable OAuth during installation in GitHub App settings
2. Revert to installation token approach
3. Keep user token code as fallback option

## Success Criteria

- [ ] Users can install app and automatically get user access tokens
- [ ] Jules bot responds to automated label changes
- [ ] Token refresh works automatically
- [ ] System gracefully handles token expiration
- [ ] No manual intervention required for token management
