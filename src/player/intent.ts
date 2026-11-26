/**
 * How the next player opens (UX §5 "Player"): playing from ▶ and "Play from this post", paused from
 * a tap on a picture or a tile. Read once by the player that opens next; a reload or a link plays.
 */
let nextPaused = false;

export function openPaused(paused: boolean): void {
  nextPaused = paused;
}

export function takePaused(): boolean {
  const p = nextPaused;
  nextPaused = false;
  return p;
}
