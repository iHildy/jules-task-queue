import { JULES_BOT_USERNAMES, TASK_LIMIT_PATTERNS, WORKING_PATTERNS } from "@/config/jules";
import { analyzeComment, isJulesBot, isTaskLimitComment, isWorkingComment } from "@/lib/jules";
import type { GitHubComment } from "@/types";

describe("Jules Bot Identification", () => {
  it("should identify Jules bot usernames", () => {
    expect(isJulesBot("google-labs-jules[bot]")).toBe(true);
    expect(isJulesBot("google-labs-jules")).toBe(true);
    expect(isJulesBot("some-other-user")).toBe(false);
  });
});

describe("Comment Type Detection", () => {
  it("should detect task limit comments", () => {
    expect(isTaskLimitComment("You are currently at your concurrent task limit")).toBe(true);
    expect(isTaskLimitComment("I'm currently at my concurrent task limit")).toBe(true);
    expect(isTaskLimitComment("I am at my task limit")).toBe(true);
    expect(isTaskLimitComment("This is a regular comment")).toBe(false);
  });

  it("should detect working comments", () => {
    expect(isWorkingComment("When finished, you will see another comment")).toBe(true);
    expect(isWorkingComment("I'm on it")).toBe(true);
    expect(isWorkingComment("I will start working on this")).toBe(true);
    expect(isWorkingComment("This is a regular comment")).toBe(false);
  });
});

describe("Comment Analysis", () => {
  it("should correctly classify a task limit comment", () => {
    const comment: GitHubComment = {
      id: 1,
      body: "I'm currently at my concurrent task limit",
      user: { login: "google-labs-jules[bot]" },
      created_at: new Date().toISOString(),
    };
    const analysis = analyzeComment(comment);
    expect(analysis.classification).toBe("task_limit");
    expect(analysis.confidence).toBeGreaterThan(0.5);
  });

  it("should correctly classify a working comment", () => {
    const comment: GitHubComment = {
      id: 1,
      body: "I'm on it",
      user: { login: "google-labs-jules[bot]" },
      created_at: new Date().toISOString(),
    };
    const analysis = analyzeComment(comment);
    expect(analysis.classification).toBe("working");
    expect(analysis.confidence).toBeGreaterThan(0.6);
  });

  it("should classify an unknown comment", () => {
    const comment: GitHubComment = {
      id: 1,
      body: "This is a regular comment",
      user: { login: "google-labs-jules[bot]" },
      created_at: new Date().toISOString(),
    };
    const analysis = analyzeComment(comment);
    expect(analysis.classification).toBe("unknown");
    expect(analysis.confidence).toBe(0);
  });
});
