import { env } from "@/lib/env";
import crypto from "crypto";
import logger from "@/lib/logger";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
// Guard against undefined or invalid key during static analysis/build
const KEY = Buffer.from(env.TOKEN_ENCRYPTION_KEY || "", "hex");

/**
 * Encrypts a string using AES-256-CBC.
 * The output format is "iv:encryptedText".
 * @param text The string to encrypt.
 * @returns The encrypted string.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a string that was encrypted with the encrypt function.
 * @param text The encrypted string ("iv:encryptedText").
 * @returns The decrypted string, or null if decryption fails.
 */
export function decrypt(text: string): string | null {
  try {
    if (!text || typeof text !== "string" || !text.includes(":")) {
      logger.error("Invalid input format for decryption");
      return null;
    }

    const parts = text.split(":");
    if (parts.length !== 2) {
      logger.error("Invalid encrypted text format");
      return null;
    }

    const [ivHex, encryptedHex] = parts;
    if (!ivHex || !encryptedHex) {
      logger.error("IV or encrypted text is missing");
      return null;
    }

    const iv = Buffer.from(ivHex, "hex");
    if (iv.length !== IV_LENGTH) {
      logger.error(
        `Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`,
      );
      return null;
    }

    const encryptedText = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);
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
