# GitHub App Migration Plan

This document outlines the migration from personal access tokens to a GitHub App architecture for Jules Task Queue.

## Current State Analysis

Currently, the project:
- Uses personal access tokens via `GITHUB_TOKEN` environment variable
- Requires manual webhook setup per repository
- Uses `@octokit/rest` for GitHub API interactions
- Processes "jules" and "jules-queue" label events on issues
- Has security concerns due to broad token permissions

## Migration Goals

- [x] Replace personal access tokens with GitHub App authentication
- [x] Automatically install webhooks when the app is installed
- [x] Reduce required permissions to specific scopes
- [x] Improve security for hosted deployments
- [x] Remove personal token support (no backward compatibility needed)
- [ ] Update all deployment guides and documentation

## Phase 1: GitHub App Setup & Infrastructure

### 1.1 GitHub App Creation
- [ ] Create GitHub App in GitHub Settings
  - [ ] Set app name: "Jules Task Queue" 
  - [ ] Set homepage URL to project repository
  - [ ] Set webhook URL to `/api/webhooks/github-app` (new endpoint)
  - [ ] Generate and securely store private key
  - [ ] Note App ID for configuration

### 1.2 GitHub App Permissions
- [ ] Configure minimal required permissions:
  - [ ] **Issues**: Read & Write (to read issues, add comments, manage labels)
  - [ ] **Repository metadata**: Read (to verify repository access)
  - [ ] **Webhooks**: Write (to automatically install webhooks)
- [ ] Configure webhook events:
  - [ ] Issues (for label events)
  - [ ] Installation (for app install/uninstall)

### 1.3 App Installation Flow
- [x] Create installation redirect endpoint at `/api/github-app/install`
- [x] Add GitHub App installation button to main landing page
- [x] Create installation success page at `/github-app/success`
- [x] Handle installation success/failure redirects

## Phase 2: Code Infrastructure Changes

### 2.1 Dependencies
- [x] Add GitHub App specific packages:
  ```bash
  pnpm add @octokit/app @octokit/auth-app @octokit/webhooks
  ```

### 2.2 Environment Variables
- [x] Add new environment variables:
  - [x] `GITHUB_APP_ID` - GitHub App ID
  - [x] `GITHUB_APP_PRIVATE_KEY` - GitHub App private key (base64 encoded)
  - [x] `GITHUB_APP_WEBHOOK_SECRET` - GitHub App webhook secret
  - [x] `GITHUB_APP_CLIENT_ID` - For OAuth flow (optional)
  - [x] `GITHUB_APP_CLIENT_SECRET` - For OAuth flow (optional)

### 2.3 GitHub Client Refactoring
- [x] Create new GitHub App client in `src/lib/github-app.ts`
- [x] Implement installation-based authentication
- [x] Add methods for:
  - [x] Getting installation access tokens
  - [x] Repository-specific API calls
  - [x] Installation management

### 2.4 Database Schema Updates
- [x] Create new tables:
  - [x] `GitHubInstallation` - Track app installations
  - [x] `InstallationRepository` - Track accessible repositories per installation
- [x] Update existing tables:
  - [x] Add `installationId` to `JulesTask` table for tracking

### 2.5 Webhook Handler Updates
- [x] Create new webhook endpoint: `/api/webhooks/github-app/route.ts`
- [x] Handle new webhook events:
  - [x] `installation` - App installed/uninstalled
  - [x] `installation_repositories` - Repository access changed
  - [x] `issues` - Existing issue label events (with installation context)
- [x] Update webhook verification for GitHub App

## Phase 3: Authentication & Authorization

### 3.1 Installation Management
- [x] Create `InstallationService` class:
  - [x] Track active installations
  - [x] Manage installation tokens (with caching)
  - [x] Handle installation lifecycle events

### 3.2 Repository Access Control
- [x] Implement repository-level access checks
- [x] Ensure tasks only process for installed repositories
- [x] Handle repository access revocation gracefully

### 3.3 Token Management
- [x] Implement installation token caching (1-hour expiry)
- [x] Add token refresh logic
- [x] Handle authentication failures gracefully

## Phase 4: API & Service Updates

### 4.1 GitHub Service Layer
- [x] Update `src/lib/github.ts` to use only GitHub App authentication
- [x] Add installation context to all GitHub API calls
- [x] Implement proper error handling for missing installations

### 4.2 Task Processing Updates
- [x] Update task processor to use installation-based authentication
- [x] Add installation validation before processing tasks
- [x] Handle cases where installation is removed mid-processing

### 4.3 Admin Panel Updates
- [x] Add installation management to admin panel
- [x] Show installation status per repository
- [x] Add installation health checks

## Phase 5: Deployment Configuration

### 5.1 Docker Setup
- [x] Update `docker-compose.yml` with new environment variables
- [x] Update Dockerfile if needed for new dependencies
- [x] Update `.env.example` with GitHub App variables

### 5.2 Vercel Setup
- [x] Update deployment button with new environment variables
- [ ] Test Vercel deployment with GitHub App configuration

### 5.3 Firebase Setup
- [x] Update `apphosting.yaml` with new environment variables
- [ ] Update Firebase Functions if they need GitHub App access
- [ ] Test Firebase deployment

## Phase 6: Documentation Updates

### 6.1 Setup Guides
- [x] Update `SELF_HOSTING.md`:
  - [x] Add GitHub App setup instructions
  - [x] Remove personal token option (no backward compatibility)
  - [x] Update webhook configuration steps
  - [x] Add GitHub App specific troubleshooting

- [x] Update `FIREBASE.md`:
  - [x] Replace personal token instructions with GitHub App setup
  - [x] Update environment variable configuration
  - [x] Update webhook setup (now automatic)

### 6.2 User Documentation
- [x] Create `GITHUB_APP_SETUP.md` with detailed GitHub App creation guide
- [ ] Update `README.md` with new setup flow
- [x] Update `API_DOCUMENTATION.md` with new endpoints
- [ ] Add installation flow documentation

### 6.3 Developer Documentation
- [ ] Document GitHub App architecture decisions
- [ ] Add authentication flow diagrams
- [ ] Document debugging and troubleshooting

## Phase 7: Testing & Validation

### 7.1 Testing Strategy
- [ ] Create test GitHub App for development
- [ ] Test installation flow on test repositories
- [ ] Validate webhook processing with GitHub App auth
- [ ] Test task processing end-to-end

### 7.2 Migration Testing
- [ ] Test both authentication methods work simultaneously
- [ ] Validate error handling for edge cases
- [ ] Test installation removal scenarios

### 7.3 Load Testing
- [ ] Test with multiple installations
- [ ] Validate token caching performance
- [ ] Test webhook processing under load

## Phase 8: Deployment & Migration

### 8.1 Staged Rollout
- [ ] Deploy to staging environment with GitHub App
- [ ] Test with internal repositories
- [ ] Gradually migrate test repositories

### 8.2 Production Deployment
- [ ] Deploy GitHub App support to production
- [ ] Create public GitHub App listing
- [ ] Update documentation links

### 8.3 User Migration
- [ ] Notify existing users of new installation method
- [ ] Provide migration timeline for personal token deprecation
- [ ] Create migration assistance documentation

## Phase 9: Cleanup & Optimization

### 9.1 Code Cleanup
- [ ] Remove personal token dependencies for hosted version
- [ ] Optimize installation token caching
- [ ] Remove deprecated code paths

### 9.2 Security Hardening
- [ ] Audit GitHub App permissions
- [ ] Validate webhook signature verification
- [ ] Review error message information disclosure

### 9.3 Performance Optimization
- [ ] Optimize installation queries
- [ ] Cache repository access checks
- [ ] Optimize webhook processing

## Implementation Priority

**High Priority (Phase 1-3):**
- GitHub App creation and basic infrastructure
- Core authentication changes
- Database schema updates

**Medium Priority (Phase 4-6):**
- Service layer updates
- Documentation updates
- Deployment configuration

**Low Priority (Phase 7-9):**
- Testing and validation
- Migration and cleanup
- Optimization

## Risk Mitigation

### Technical Risks
- **Token caching complexity**: Implement robust token refresh logic
- **Installation sync issues**: Add installation validation checks
- **Webhook processing failures**: Implement retry logic for failed installations

### Business Risks
- **User migration resistance**: Provide clear migration benefits and support
- **Self-hosted user impact**: Maintain personal token support for self-hosted deployments
- **Deployment complexity**: Provide comprehensive setup documentation

## Success Metrics

- [ ] Reduction in setup complexity for new users
- [ ] Automatic webhook installation success rate > 95%
- [ ] No increase in task processing failures
- [ ] Positive user feedback on installation experience
- [ ] Successful migration of existing hosted users

## Post-Migration Benefits

1. **Improved Security**: Minimal required permissions per installation
2. **Better UX**: One-click installation instead of manual token creation
3. **Automatic Setup**: Webhooks installed automatically
4. **Scalability**: Better suited for hosted service with multiple users
5. **Compliance**: Better audit trail and permission management