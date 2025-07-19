import { isJulesBot } from "./jules";

describe("isJulesBot", () => {
  it('should return true for "google-labs-jules"', () => {
    expect(isJulesBot("google-labs-jules")).toBe(true);
  });

  it('should return true for "google-labs-jules[bot]"', () => {
    expect(isJulesBot("google-labs-jules[bot]")).toBe(true);
  });

  it('should return true for "GOOGLE-LABS-JULES" (case-insensitive)', () => {
    expect(isJulesBot("GOOGLE-LABS-JULES")).toBe(true);
  });

  it('should return false for "not-google-labs-jules"', () => {
    expect(isJulesBot("not-google-labs-jules")).toBe(false);
  });

  it('should return false for "google-labs-jules-imposter"', () => {
    expect(isJulesBot("google-labs-jules-imposter")).toBe(false);
  });

  it("should return false for a partial match", () => {
    expect(isJulesBot("a-google-labs-jules-b")).toBe(false);
  });

  it("should return false for an empty string", () => {
    expect(isJulesBot("")).toBe(false);
  });
});
