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

- [ ] **Enable OAuth during installation** (Manual step: Go to GitHub App settings, check "Request user authorization (OAuth) during installation", set callback URL to `https://your-domain.com/api/auth/callback/github`, and save changes.)

- [ ] **Configure token expiration (Recommended)** (Manual step: In GitHub App settings → Optional Features, enable "User-to-server token expiration".)

### Phase 2: Database Schema Updates

- [x] **Add user token storage to database - VIA THE PRISMA SCHEMA FILE**

  ```sql
  -- Add to existing tables or create new table
  ALTER TABLE github_app_installations ADD COLUMN user_access_token TEXT;
  ALTER TABLE github_app_installations ADD COLUMN refresh_token TEXT;
  ALTER TABLE github_app_installations ADD COLUMN token_expires_at TIMESTAMP;
  ALTER TABLE github_app_installations ADD COLUMN refresh_token_expires_at TIMESTAMP;
  ```

- [x] **Create Prisma migration**
  ```bash
  pnpm prisma migrate dev --name add_user_tokens
  ```

### Phase 3: OAuth Callback Implementation

- [x] **Create OAuth callback endpoint**
  - File: `src/app/api/auth/callback/github/route.ts`
  - Handle the `code` parameter from GitHub
  - Exchange code for user access token
  - Store tokens in database with installation ID
  - Redirect user to success page

- [x] **Implement token exchange logic**
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

- [x] **Create token manager service**
  - File: `src/lib/token-manager.ts`
  - Methods for storing, retrieving, and refreshing tokens
  - Automatic token refresh when expired
  - Secure token encryption/decryption

- [x] **Implement token refresh logic**
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

- [x] **Modify retry logic to use user tokens**
  - Update `src/lib/jules.ts` `processTaskRetry` function
  - Get user token from database for installation
  - Use user token for label operations instead of installation token
  - Handle token refresh if expired

- [x] **Update GitHub client**
  - Modify `src/lib/github.ts` to accept user tokens
  - Create methods that use user tokens for label operations
  - Maintain backward compatibility with installation tokens

### Phase 6: Installation Webhook Updates

- [x] **Update installation webhook handler**
  - File: `src/app/api/webhooks/github-app/route.ts`
  - Store installation ID when app is installed
  - Note: User tokens will be generated via OAuth callback, not webhook

- [x] **Handle installation removal**
  - Clean up stored tokens when app is uninstalled
  - Remove from database

### Phase 7: Error Handling & Fallbacks

- [x] **Implement graceful fallbacks**
  - If user token is missing/expired, fall back to installation token
  - Log warnings when falling back (Jules may not respond)
  - Provide clear error messages for token issues

- [x] **Add token validation**
  - Validate tokens before use
  - Check expiration times
  - Handle 401/403 errors from GitHub API

### Phase 8: Testing & Validation

- [ ] **Test OAuth flow** (Manual step: Install app and verify OAuth redirect works, confirm tokens are stored in database, test token refresh functionality)

- [ ] **Test Jules integration** (Manual step: Create test issue with `jules-queue` label, run retry process with user token, verify Jules responds to label changes)

- [ ] **Test token expiration** (Manual step: Simulate expired tokens, verify refresh logic works, test fallback to installation tokens)

### Phase 9: Security & Monitoring

- [x] **Add token encryption**

- [ ] **Add token cleanup** (Partially done: Handled reactively when refresh token is bad. Proactive cleanup of truly expired refresh tokens (e.g., via a cron job) is a potential missing piece.)\*\*
  - Encrypt tokens before storing in database
  - Use environment variables for encryption keys
  - Implement secure token rotation

- [ ] **Add token cleanup**
  - Remove expired refresh tokens

### Phase 10: Documentation & Deployment

- [ ] **Update documentation** (Manual step: Update `README.md` with new setup instructions, document OAuth flow for users, add troubleshooting guide)

- [ ] **Environment variables** (Manual step: Add `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_CALLBACK_URL`, `TOKEN_ENCRYPTION_KEY` to `.env.local`)

- [ ] **Deploy and test** (Manual step: Deploy to production, test full OAuth flow, monitor for issues)

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

## Success Criteria

- [ ] Users can install app and automatically get user access tokens (Manual verification required)
- [ ] Jules bot responds to automated label changes (Manual verification required)
- [x] Token refresh works automatically (Logic implemented, manual verification required)
- [x] System gracefully handles token expiration (Logic implemented, manual verification required)
- [ ] No manual intervention required for token management (Logic implemented, but proactive cleanup for expired refresh tokens is a potential missing piece, manual verification required)
