// pi-tmux-state: mirror pi's working/idle state into tmux window options.
//
// Sets one per-window tmux user option on the window this pi lives in:
//   @pi-state  -> "working" | "complete" | "idle"
//
// The companion tmux plugin (pi-tmux.tmux) reads @pi-state in
// window-status-format to draw a marker before the window title:
//   working   -> static braille glyph (no animation)
//   complete  -> ● (task finished on an unfocused window)
//   idle      -> π
//
// No timer, no per-frame updates: "working" is a single static glyph so the
// status line isn't churned every tick. When a task finishes on a window that
// isn't currently focused, the state becomes "complete" (shown as ●); the
// first time that window is visited again, the plugin's after-select-window
// hook resets it back to "idle" (π).
//
// The window is also renamed to "Pi" (with automatic-rename disabled for it
// while pi owns it), so every pi window is labeled "Pi".
//
// No-op when pi is not running inside tmux ($TMUX_PANE unset).

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawnSync } from "node:child_process";

function tmux(args: string[]): string {
  try {
    return spawnSync("tmux", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).stdout ?? "";
  } catch {
    return "";
  }
}

export default function (pi: ExtensionAPI) {
  const paneId = process.env.TMUX_PANE;
  if (!paneId) return; // not inside tmux

  // Pane -> window. Recomputed each call; cheap local IPC, and survives the
  // rare case of the pane being moved to another window.
  function windowId(): string | null {
    const id = tmux(["display", "-p", "-t", paneId, "#{window_id}"]).trim();
    return id || null;
  }

  // Is this pane's window the active window of its session right now?
  function windowActive(): boolean {
    return tmux(["display", "-p", "-t", paneId, "#{window_active}"]).trim() === "1";
  }

  function clients(): string[] {
    const sess = tmux(["display", "-p", "-t", paneId, "#{session_name}"]).trim();
    if (!sess) return [];
    return tmux(["list-clients", "-t", sess, "-F", "#{client_name}"])
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Set @pi-state on our window and refresh every attached client's status
  // line so the change shows up immediately (no reliance on status-interval).
  function setState(state: "working" | "complete" | "idle") {
    const w = windowId();
    if (!w) return;
    const args = ["set-option", "-w", "-t", w, "@pi-state", state];
    for (const c of clients()) args.push(";", "refresh-client", "-S", "-t", c);
    tmux(args);
  }

  // Name this window "Pi" and keep tmux from auto-renaming it based on shell
  // activity while pi owns it.
  function nameWindow() {
    const w = windowId();
    if (!w) return;
    const args = [
      "rename-window", "-t", w, "Pi",
      ";", "set-option", "-w", "-t", w, "automatic-rename", "off",
    ];
    for (const c of clients()) args.push(";", "refresh-client", "-S", "-t", c);
    tmux(args);
  }

  // Drop our marker and let tmux rename again. The visited-reset hook is
  // owned by the tmux plugin, so we leave it alone here.
  function clearState() {
    const w = windowId();
    if (!w) return;
    const args = [
      "set-option", "-w", "-u", "-t", w, "@pi-state",
      ";", "set-option", "-w", "-t", w, "automatic-rename", "on",
    ];
    for (const c of clients()) args.push(";", "refresh-client", "-S", "-t", c);
    tmux(args);
  }

  // The "visited complete window -> reset to idle" reset lives in the
  // companion tmux plugin (pi-tmux.tmux) as a single global after-select-window
  // hook. It is reliable across next/previous/last/select-window; a per-window
  // pane-focus-in hook only fires when focus-events is on and tracks terminal
  // focus rather than window switches.

  pi.on("session_start", async () => {
    nameWindow();
    setState("idle");
  });

  pi.on("agent_start", async () => {
    setState("working");
  });

  // Fires when pi will not continue on its own (no retry/compaction/follow-up
  // left), i.e. it's truly done with the last prompt. If the user is already
  // looking at this window, go straight to idle (π); otherwise mark it
  // complete (●) until they visit it.
  pi.on("agent_settled", async () => {
    setState(windowActive() ? "idle" : "complete");
  });

  pi.on("session_shutdown", async () => {
    clearState();
  });
}