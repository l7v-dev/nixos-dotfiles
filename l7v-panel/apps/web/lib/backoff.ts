/**
 * Computes the exponential back-off delay in seconds for the given attempt number.
 * Pure function — no side effects.
 *
 * attempt: 1-based attempt number (1 = first retry)
 * Returns: delay in seconds, clamped to [1, 30], monotonically non-decreasing.
 */
export function computeBackoff(attempt: number): number {
    const base = 1;
    const cap = 30;
    const delay = base * Math.pow(2, attempt - 1);
    return Math.min(Math.max(delay, base), cap);
}
