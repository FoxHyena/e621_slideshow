/**
 * Posts on your blacklist you chose to see this visit ("Show it" on a post's page), so the picture
 * viewer opened from that page shows them too. Kept in memory only: a reload hides them again.
 */
export const revealed = new Set<number>();
