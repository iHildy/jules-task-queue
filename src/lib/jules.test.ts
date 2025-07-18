import { isJulesBot } from "./jules";

describe("isJulesBot", () => {
  it("should return true for Jules's username", () => {
    expect(isJulesBot("google-labs-jules[bot]")).toBe(true);
  });

  it("should return true for Jules's username without [bot]", () => {
    expect(isJulesBot("google-labs-jules")).toBe(true);
  });

  it("should return false for other usernames", () => {
    expect(isJulesBot("other-user")).toBe(false);
  });
});
