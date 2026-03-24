/**
 * Simple AES-256-GCM encryption for storing sensitive data (agent wallet keys).
 * Uses Node.js built-in crypto module.
 *
 * The encryption key is derived from the ENCRYPTION_SECRET env var.
 * In production, use a proper KMS (AWS KMS, GCP KMS, etc.).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getSecret(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_SECRET environment variable is required for wallet encryption"
    );
  }
  return Buffer.from(secret, "utf-8");
}

/**
 * Encrypt a plaintext string. Returns a base64 string containing salt + iv + tag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(getSecret(), salt, 32);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Concatenate: salt (32) + iv (16) + tag (16) + ciphertext
  const result = Buffer.concat([salt, iv, tag, encrypted]);
  return result.toString("base64");
}

/**
 * Decrypt a base64 encrypted string back to plaintext.
 */
export function decrypt(encryptedBase64: string): string {
  const data = Buffer.from(encryptedBase64, "base64");

  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  );
  const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = scryptSync(getSecret(), salt, 32);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}
