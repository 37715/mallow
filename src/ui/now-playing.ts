import { icon } from "@/ui/icons";
import type { Track } from "@/data/tracks";

/**
 * A small chip that names the piece when it starts, then goes away.
 *
 * Ellis, 2026-09-08: *"have a little player icon show briefly when a new track
 * comes on showing the name."*
 *
 * **It shows and it leaves, and the leaving is the whole design.** A permanent
 * now-playing readout is a media player; this is a café that occasionally
 * mentions what is on. It also has to survive the one thing a music chip in an
 * idle game will definitely do, which is appear while somebody is mid-tap on
 * something else — so it is `pointer-events: none` and sits out of the way of
 * the HUD rather than over it.
 *
 * The music fades in over twelve seconds (`audio/soundtrack.ts`), so this
 * deliberately arrives a few seconds *late*: naming a track before it is
 * audible reads as a bug. By the time the chip is up there is something to
 * hear.
 */

/** How long the chip stays up once it has arrived. */
const HOLD_MS = 5200;
/** How late it arrives after the track starts — see the note above. */
const LEAD_IN_MS = 3500;

export interface NowPlaying {
  show(track: Track): void;
  dispose(): void;
}

export function createNowPlaying(root: HTMLElement): NowPlaying {
  const chip = document.createElement("div");
  chip.className = "now-playing";
  // `#ui-root` is `pointer-events: none` so gestures reach the café; anything
  // that wants taps has to opt in, and this deliberately does not (§9).
  chip.dataset.overlay = "";

  const art = document.createElement("span");
  art.className = "now-playing-icon";
  art.appendChild(icon("note"));

  const text = document.createElement("span");
  text.className = "now-playing-text";
  const title = document.createElement("span");
  title.className = "now-playing-title";
  const artist = document.createElement("span");
  artist.className = "now-playing-artist";
  text.append(title, artist);

  chip.append(art, text);
  root.appendChild(chip);

  let showTimer: number | null = null;
  let hideTimer: number | null = null;

  function clear(): void {
    if (showTimer !== null) window.clearTimeout(showTimer);
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    showTimer = null;
    hideTimer = null;
  }

  return {
    show(track) {
      clear();
      showTimer = window.setTimeout(() => {
        title.textContent = track.title;
        // The artist is the reason this exists at all — a title with nobody's
        // name on it credits nothing.
        artist.textContent = track.artist;
        chip.classList.add("open");
        hideTimer = window.setTimeout(() => chip.classList.remove("open"), HOLD_MS);
      }, LEAD_IN_MS);
    },
    dispose() {
      clear();
      chip.remove();
    },
  };
}
