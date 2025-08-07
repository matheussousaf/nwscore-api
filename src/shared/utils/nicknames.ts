/* eslint-disable @typescript-eslint/no-unused-vars */
export function normalizeNick(nick: string): string {
  return nick.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
}

export function areNicknamesEqual(
  a: string,
  b: string,
  threshold?: number,
): boolean {
  const normalizedA = normalizeNick(a);
  const normalizedB = normalizeNick(b);
  
  // If no threshold provided, use adaptive threshold
  if (threshold === undefined) {
    const minLength = Math.min(normalizedA.length, normalizedB.length);
    const maxLength = Math.max(normalizedA.length, normalizedB.length);
    
    // For very short strings (1-2 chars), be very strict
    if (minLength <= 2) {
      threshold = 0; // Only exact matches
    }
    // For short strings (3-4 chars), be strict
    else if (minLength <= 4) {
      threshold = 1; // Allow only 1 character difference
    }
    // For medium strings (5-6 chars), be moderately strict
    else if (minLength <= 6) {
      threshold = 2; // Allow 2 character differences
    }
    // For longer strings, be slightly more permissive but still strict
    else {
      threshold = Math.min(3, Math.floor(minLength * 0.3)); // Max 30% of min length, capped at 3
    }
  }
  
  const distance = levenshtein(normalizedA, normalizedB);
  return distance <= threshold;
}
