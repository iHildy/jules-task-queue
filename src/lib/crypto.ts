import { env } from "@/lib/env";
import crypto from "crypto";
import logger from "@/lib/logger";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex"),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string | null {
  try {
    if (!env.TOKEN_ENCRYPTION_KEY) {
      logger.error("TOKEN_ENCRYPTION_KEY is not configured");
      return null;
    }

    if (!text || typeof text !== "string") {
      logger.error("Invalid input: text must be a non-empty string");
      return null;
    }

    if (!text.includes(":")) {
      logger.error("Invalid input format: missing ':' delimiter");
      return null;
    }

    const textParts = text.split(":");
    if (textParts.length < 2) {
      logger.error("Invalid input format: insufficient parts after split");
      return null;
    }

    const ivHex = textParts[0];
    const encryptedHex = textParts.slice(1).join(":");

    if (!ivHex || !encryptedHex) {
      logger.error("Invalid input format: missing IV or encrypted text");
      return null;
    }

    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");

    if (iv.length !== IV_LENGTH) {
      logger.error(
        `Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`,
      );
      return null;
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex"),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : "Unknown error";
    logger.error(`Decryption failed: ${errorMessage}`);
    return null;
  }
}
