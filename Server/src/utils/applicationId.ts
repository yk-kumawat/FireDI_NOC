import crypto from "crypto";

/**
 * Generates a collision-safe application ID in the format FNO-YYYY-XXXXXXXX.
 * Uses 4 cryptographically random bytes (8 hex chars) for uniqueness.
 */
export const generateApplicationId = (): string => {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `FNO-${year}-${random}`;
};
