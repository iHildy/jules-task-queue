# Contributing to Jules Task Queue

First off, thank you for considering contributing! It's people like you that make open source such a great community. We welcome any and all contributions.

## Code of Conduct

This project and everyone participating in it is governed by a [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md). By participating, you are expected to uphold this code. Please report unacceptable behavior.

## How Can I Contribute?

There are many ways to contribute, from writing tutorials or blog posts, improving the documentation, submitting bug reports and feature requests or writing code which can be incorporated into the main project.

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/ihildy/jules-task-queue/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/ihildy/jules-task-queue/issues/new?assignees=&labels=bug&template=bug_report.md&title=). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

- **Ensure the enhancement was not already suggested** by searching on GitHub under [Issues](https://github.com/ihildy/jules-task-queue/issues).
- If you're unable to find an open issue, [open a new one](https://github.com/ihildy/jules-task-queue/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=). Provide a clear description of the enhancement and its potential benefits.

### Pull Requests

We love pull requests. Here's a quick guide:

1.  **Fork the repo** and create your branch from `main`.
2.  **Set up your development environment** (see below).
3.  **Make your changes**.
4.  **Ensure the test suite passes**. Run `pnpm lint`, `pnpm build`, and `pnpm format` to make sure your changes follow our style guide and don't break anything.
5.  **Commit your changes** using a descriptive commit message.
6.  **Push to your fork** and submit a pull request.

## Development Setup

Ready to start coding? Here's how to get the project running locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [pnpm](https://pnpm.io/installation)
- [Docker](https://www.docker.com/get-started/) (for running a local database)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/ihildy/jules-task-queue.git
    cd jules-task-queue
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Set up the database:**
    The easiest way to get a database running is with Docker. (Or you can run a supabase instance [easily](https://supabase.com/docs/guides/local-development/cli/getting-started?queryGroups=platform&platform=linux))

    ```bash
    docker-compose up -d
    ```

    This will start a PostgreSQL container.

4.  **Configure Environment Variables:**
    Copy the example environment file and fill in the required values.

    ```bash
    cp .env.example .env
    ```

    You will need to set `DATABASE_URL` to point to your local Docker container:
    `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"`
    You will also need to [create a GitHub App](https://github.com/ihildy/jules-task-queue/blob/main/GITHUB_APP_SETUP.md) and fill in the corresponding `GITHUB_APP_*` variables.

5.  **Run Database Migrations:**

    ```bash
    pnpm db:migrate
    ```

6.  **Start the development server:**
    ```bash
    pnpm dev
    ```
    The application will be available at `http://localhost:3000`.

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature").
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...").
- Limit the first line to 72 characters or less.
- Reference issues and pull requests liberally after the first line.

### Code Style

- We use [Prettier](https://prettier.io/) for code formatting and [ESLint](https://eslint.org/) for linting.
- Before committing, run `pnpm format` and `pnpm lint --fix` to automatically format and fix any issues. The project also uses `lint-staged` to automatically format code before committing.

Thank you for your contribution!
