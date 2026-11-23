/**
 * Hunter count for randomly assigned teams.
 *
 * A uniform split could deal a lone hunter against nineteen runners. Instead
 * the count follows roughly one hunter per three runners: at least two hunters
 * once there are enough players, growing slowly as the lobby fills. Which
 * players get the role is still shuffled, so only the membership is random.
 */
export function hunterCountFor(totalPlayers: number): number {
  if (totalPlayers < 2) return Math.max(0, totalPlayers);
  return Math.min(totalPlayers - 1, Math.max(2, Math.ceil(totalPlayers / 4)));
}
