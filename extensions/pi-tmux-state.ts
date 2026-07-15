// pi-tmux-state: mirror pi's working/idle state into tmux window options.
//
// Sets two per-window tmux user options on the window this pi lives in:
//   @pi-state  -> "working" | "idle"
//   @pi-frame  -> current spinner frame (braille char) while working
//
// The companion tmux plugin (pi-tmux.tmux) reads these in window-status-format
// to draw a spinner while pi is busy and an idle dot when it's done.
//
// No-op when pi is not running inside tmux ($TMUX_PANE unset).

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawnSync } from "node:child_process";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const TICK_MS = 200;

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

  let timer: ReturnType<typeof setInterval> | null = null;
  let frameIdx = 0;

  // Pane -> window. Recomputed each call; cheap local IPC, and survives the
  // rare case of the pane being moved to another window.
  function windowId(): string | null {
    const id = tmux(["display", "-p", "-t", paneId, "#{window_id}"]).trim();
    return id || null;
  }

  // Attached clients of this pane's session — the status line is only drawn for
  // them, so they're the ones we need to refresh to make changes visible.
  function clients(): string[] {
    const sess = tmux(["display", "-p", "-t", paneId, "#{session_name}"]).trim();
    if (!sess) return [];
    return tmux(["list-clients", "-t", sess, "-F", "#{client_name}"])
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // One tmux invocation: set @pi-state (and optionally @pi-frame), then refresh
  // every attached clients' status line so the change shows up immediately
  // instead of waiting for status-interval.
  function apply(state: "working" | "idle", frame?: string) {
    const w = windowId();
    if (!w) return;
    const args = ["set-option", "-w", "-t", w, "@pi-state", state];
    if (frame) args.push(";", "set-option", "-w", "-t", w, "@pi-frame", frame);
    for (const c of clients()) args.push(";", "refresh-client", "-S", "-t", c);
    tmux(args);
  }

  function clearState() {
    const w = windowId();
    if (!w) return;
    const args = [
      "set-option", "-w", "-u", "-t", w, "@pi-state",
      ";", "set-option", "-w", "-u", "-t", w, "@pi-frame",
    ];
    for (const c of clients()) args.push(";", "refresh-client", "-S", "-t", c);
    tmux(args);
  }

  function startSpin() {
    if (timer) return;
    timer = setInterval(() => {
      frameIdx = (frameIdx + 1) % FRAMES.length;
      apply("working", FRAMES[frameIdx]);
    }, TICK_MS);
  }

  function stopSpin() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  pi.on("session_start", async () => {
    apply("idle");
  });

  pi.on("agent_start", async () => {
    frameIdx = 0;
    apply("working", FRAMES[0]);
    startSpin();
  });

  // Fires when pi will not continue on its own (no retry/compaction/follow-up
  // left), i.e. it's truly done with the last prompt.
  pi.on("agent_settled", async () => {
    stopSpin();
    apply("idle");
  });

  pi.on("session_shutdown", async () => {
    stopSpin();
    clearState();
  });
}