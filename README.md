# pit — pi state in the tmux window title

A tiny pi extension + tmux plugin that shows whether the pi coding agent in a
window is **working** or **idle**, right next to the window title in the tmux
status bar.

- working → animated braille spinner (`⠋ ⠙ ⠹ …`)
- idle    → `●`
- no pi in that window → nothing

State is per-window: each tmux window that runs its own pi gets its own marker.
One pi per window works as you'd expect; if you ever split a window into panes,
the marker still tracks the window's pi (not whichever pane is active).

## How it works

The extension (`extensions/pi-tmux-state.ts`) subscribes to pi lifecycle events
and writes two per-window tmux options (`@pi-state`, `@pi-frame`) onto its own
window. While working it advances the frame ~5×/s and asks tmux to refresh the
status line, so the spinner animates without touching your `status-interval`.

The tmux plugin (`pi-tmux.tmux`) just sets `window-status-format` to render the
marker before the existing `#W` title, reading those per-window options.

## Install

### 1. Enable the pi extension

```sh
mkdir -p ~/.pi/agent/extensions
ln -s "$PWD/extensions/pi-tmux-state.ts" ~/.pi/agent/extensions/pi-tmux-state.ts
```

Then start (or `/reload`) pi inside tmux. If pi is running in a tmux pane it
will start mirroring state automatically; outside tmux it does nothing.

### 2. Source the tmux plugin

Add to `~/.config/tmux/tmux.conf` (after your existing `window-status-*` lines):

```tmux
run-shell "/Users/gbmnx/gbmnx/dev/pit/pi-tmux.tmux"
```

Then `prefix r` (or `tmux source-file ~/.config/tmux/tmux.conf`) to load it.

That's it. Run `pi` in a window and submit a prompt — the window title shows a
spinner; when the agent finishes it turns into `●`.

## Notes / caveats

- The marker colors follow your existing `window-status-current-style` /
  `window-status-style` (current window amber, others muted).
- If pi is killed hard (e.g. `pkill pi`) mid-task, its last state can stick on
  that window. A normal exit (`/exit`) cleans up. Closing the window removes
  the options entirely (they're window-scoped).
- You can change glyphs by editing the format in `pi-tmux.tmux` and the
  `FRAMES` array in the extension.