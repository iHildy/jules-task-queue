<div align="center">
  <img src="public/julesQueue.jpg" alt="Jules Task Queue Logo" width="120" />
  <h1 align="center">Jules Task Queue</h1>
  <p align="center">
    An overengineered, enterprise-grade, open-source task queue for Jules power users.
    <br />
    <a href="https://julesqueue.hildy.io/">Visit Site</a>
    ·
    <a href="https://github.com/iHildy/jules-task-queue/issues/new?assignees=&labels=bug&template=bug_report.md&title=">Report Bug</a>
    ·
    <a href="https://github.com/iHildy/jules-task-queue/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=">Request Feature</a>
  </p>
  <p align="center">
    <a href="https://github.com/iHildy/jules-task-queue/blob/main/LICENSE"><img src="https://img.shields.io/github/license/iHildy/jules-task-queue?style=for-the-badge" /></a>
    <a href="https://github.com/iHildy/jules-task-queue/stargazers"><img src="https://img.shields.io/github/stars/iHildy/jules-task-queue?style=for-the-badge" /></a>
    <a href="https://github.com/iHildy/jules-task-queue/issues"><img src="https://img.shields.io/github/issues/iHildy/jules-task-queue?style=for-the-badge" /></a>
  </p>
</div>

---

Jules Task Queue is a GitHub-integrated service that solves the "5 concurrent task" bottleneck when using the Google Labs - Jules AI coding assistant. It automatically queues tasks when Jules hits its limit and retries them later, allowing you to seamlessly utilize your full daily quota.

## The Problem: The 5-Task Bottleneck

> "Jules gives you 60 tasks per day but only 5 concurrent slots. So you're constantly babysitting the queue, manually re-adding labels every time it hits the limit. There has to be a better way."
> — Every Jules power user, probably

This tool is the better way. It transforms Jules from a tool you have to manage into a true "set it and forget it" automation partner.

## ✨ Features

- **🤖 Task Status Detection**: Automatically detects when Jules is at capacity and intelligently queues new tasks.
- **🔄 Auto-Retry Logic**: 30-minute retry cycles with intelligent label swapping and failure recovery.
- **🚀 Easy Self-Hosting**: Deploy with one click to Vercel, Firebase, or use the provided Docker Compose setup.
- **🔐 GitHub Native**: Secure webhook integration with signature verification and comprehensive audit logging.
- **🔒 Type Safe**: End-to-end TypeScript with tRPC and Zod validation for bulletproof deployments.
- **⚙️ Zero Config (Hosted)**: Install the GitHub App and you're done. No complex setup required.

## 🚀 Getting Started

You can use our hosted version for a zero-config setup or deploy your own instance.

### Hosted Version (Recommended)

1.  **Install the GitHub App**: Click the button below and authorize it for the repositories you want to use.
2.  **Add the `jules` label** to any GitHub issue to start processing.

<div align="center" style="margin: 2rem 0;">
  <a href="https://github.com/apps/jules-task-queue/installations/new">
    <img src="https://img.shields.io/badge/Install_GitHub_App-24292f?style=for-the-badge&logo=github&logoColor=white" alt="Install GitHub App" />
  </a>
</div>

### Self-Hosting

Deploy your own instance with one click:

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FiHildy%2Fjules-task-queue&env=DATABASE_URL,NEXT_PUBLIC_GITHUB_APP_ID,GITHUB_APP_PRIVATE_KEY,GITHUB_APP_WEBHOOK_SECRET,CRON_SECRET&envDescription=See%20the%20github%20repo%20.env.example%20file%20for%20the%20variables%20to%20add.&envLink=https%3A%2F%2Fgithub.com%2FiHildy%2Fjules-task-queue%2Fblob%2Fmain%2F.env.example&project-name=jules-task-queue&repository-name=jules-task-queue)
[![Deploy to Firebase](https://img.shields.io/badge/Deploy%20to-Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)](https://julesqueue.hildy.io/)

For detailed instructions on self-hosting with **Docker**, **Vercel**, or **Firebase**, please see our documentation:

- [**SELF_HOSTING.md**](./SELF_HOSTING.md)
- [**GITHUB_APP_SETUP.md**](./GITHUB_APP_SETUP.md)
- [**FIREBASE.md**](./FIREBASE.md)

## 🛠️ How It Works

The system is designed to be a robust, hands-off automation layer on top of your existing GitHub workflow.

```mermaid
graph TD
    A["User adds 'jules' label to GitHub issue"] --> B["GitHub webhook triggers"]
    B --> C["Create/Update JulesTask in database"]
    C --> D["Start 60-second timer"]
    D --> E["Timer expires - Check for Jules bot comments"]
    E --> F{"Jules bot commented?"}
    F -->|No| G["End - Jules probably working or no response yet"]
    F -->|Yes| H{"Comment type?"}
    H -->|"You are currently at your concurrent task limit"| I["Task Limit Reached"]
    H -->|"When finished, you will see another comment"| J["Jules Started Working"]
    H -->|Other comment| G

    I --> K["Mark JulesTask.flaggedForRetry = true"]
    K --> L["Remove 'jules' label from GitHub issue"]
    L --> M["Add 'jules-queue' label to GitHub issue"]
    M --> N["Task queued for retry"]

    J --> O["Jules is actively working"]
    O --> P["End - Success path"]

    Q["Cron job runs every 30 minutes"] --> R["Find all JulesTask where flaggedForRetry = true"]
    R --> S{"Any flagged tasks?"}
    S -->|No| T["End cron cycle"]
    S -->|Yes| U["For each flagged task"]
    U --> V{"Issue has 'Human' label?"}
    V -->|Yes| W["Skip this task"]
    V -->|No| X["Remove 'jules-queue' label"]
    X --> Y["Add 'jules' label back"]
    Y --> Z["Set flaggedForRetry = false"]
    Z --> AA["Increment retryCount"]
    AA --> BB["Update lastRetryAt timestamp"]
    BB --> CC["Jules bot will see label and try again"]
    CC --> D

    W --> DD{"More tasks?"}
    BB --> DD
    DD -->|Yes| U
    DD -->|No| T

    style A fill:#e1f5fe
    style I fill:#ffebee
    style J fill:#e8f5e8
    style Q fill:#fff3e0
    style CC fill:#e1f5fe
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/iHildy/jules-task-queue/issues).

Please read the [**CONTRIBUTING.md**](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 📢 Disclaimer

Jules Task Queue is an independent productivity tool created by the developer community. We are not affiliated with Jules, Google, or Google Labs in any way. Jules Task Queue simply helps you manage your Jules task queue more efficiently.
