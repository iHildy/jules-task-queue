// Utility helpers for safe number/BigInt interop
// Keep IDs as BigInt; only convert issue numbers or bounded small integers.

/** Max safe integer as BigInt for comparisons */
export const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Safely convert a BigInt to number when guaranteed to fit.
 * Throws if the value exceeds Number.MAX_SAFE_INTEGER.
 */
export function toSafeNumber(bi: bigint): number {
  if (bi > MAX_SAFE_INTEGER_BIGINT || bi < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error("BigInt value is out of safe number range");
  }
  return Number(bi);
}

/** Whether a bigint can be safely represented as a JS number */
export function isSafeNumberBigInt(bi: bigint): boolean {
  return bi <= MAX_SAFE_INTEGER_BIGINT && bi >= BigInt(Number.MIN_SAFE_INTEGER);
}

/** Parse possibly string/number/bigint into bigint. */
export function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  // value could be decimal string
  return BigInt(value);
}
