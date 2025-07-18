import { describe, it, expect, vi } from "vitest";
import { checkJulesComments } from "../jules";
import { githubClient } from "../github";
import type { GitHubComment, GitHubEvent } from "@/types";

vi.mock("../github");

const owner = "test-owner";
const repo = "test-repo";
const issueNumber = 123;

describe("checkJulesComments", () => {
  it("should correctly identify a 'task limit' comment", async () => {
    const comments: GitHubComment[] = [
      {
        id: 1,
        body: "You are currently at your concurrent task limit.",
        user: { login: "google-labs-jules[bot]" },
        created_at: new Date().toISOString(),
      },
    ];
    const events: GitHubEvent[] = [];

    vi.mocked(githubClient.getIssueComments).mockResolvedValue(comments);
    vi.mocked(githubClient.getIssueEvents).mockResolvedValue(events);

    const result = await checkJulesComments(owner, repo, issueNumber);

    expect(result.action).toBe("task_limit");
    expect(result.comment?.body).toContain("concurrent task limit");
  });

  it("should correctly identify a 'working' comment", async () => {
    const comments: GitHubComment[] = [
      {
        id: 1,
        body: "When finished, you will see another comment.",
        user: { login: "google-labs-jules[bot]" },
        created_at: new Date().toISOString(),
      },
    ];
    const events: GitHubEvent[] = [];

    vi.mocked(githubClient.getIssueComments).mockResolvedValue(comments);
    vi.mocked(githubClient.getIssueEvents).mockResolvedValue(events);

    const result = await checkJulesComments(owner, repo, issueNumber);

    expect(result.action).toBe("working");
    expect(result.comment?.body).toContain("When finished");
  });

  it("should return 'no_action' when no Jules comments are found", async () => {
    const comments: GitHubComment[] = [
      {
        id: 1,
        body: "This is a comment from a different user.",
        user: { login: "not-jules" },
        created_at: new Date().toISOString(),
      },
    ];
    const events: GitHubEvent[] = [];

    vi.mocked(githubClient.getIssueComments).mockResolvedValue(comments);
    vi.mocked(githubClient.getIssueEvents).mockResolvedValue(events);

    const result = await checkJulesComments(owner, repo, issueNumber);

    expect(result.action).toBe("no_action");
  });

  it("should only consider comments made after the 'jules' label was added", async () => {
    const comments: GitHubComment[] = [
      {
        id: 1,
        body: "You are currently at your concurrent task limit.",
        user: { login: "google-labs-jules[bot]" },
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      },
      {
        id: 2,
        body: "When finished, you will see another comment.",
        user: { login: "google-labs-jules[bot]" },
        created_at: new Date().toISOString(), // now
      },
    ];
    const events: GitHubEvent[] = [
      {
        id: 1,
        event: "labeled",
        label: { name: "jules" },
        created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 minutes ago
      },
    ];

    vi.mocked(githubClient.getIssueComments).mockResolvedValue(comments);
    vi.mocked(githubClient.getIssueEvents).mockResolvedValue(events);

    const result = await checkJulesComments(owner, repo, issueNumber);

    expect(result.action).toBe("working");
  });
});
