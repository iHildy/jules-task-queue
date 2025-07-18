import { isJulesBot } from "./jules";

describe("isJulesBot", () => {
  it("should return true for exact matches", () => {
    expect(isJulesBot("google-labs-jules[bot]")).toBe(true);
    expect(isJulesBot("google-labs-jules")).toBe(true);
  });

  it("should return true for case-insensitive matches", () => {
    expect(isJulesBot("GOOGLE-LABS-JULES[BOT]")).toBe(true);
    expect(isJulesBot("Google-Labs-Jules")).toBe(true);
  });

  it("should return false for partial matches", () => {
    expect(isJulesBot("google-labs-jules-1")).toBe(false);
    expect(isJulesBot("another-bot")).toBe(false);
  });

  it("should return false for empty strings", () => {
    expect(isJulesBot("")).toBe(false);
  });
});
