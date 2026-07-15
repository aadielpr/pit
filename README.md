# pit — pi state in the tmux window title

A tiny pi extension + tmux plugin that shows whether the pi coding agent in a
window is **working**, **complete**, or **idle**, right next to the window
title in the tmux status bar.

- working   → `⠶` (static, no animation)
- complete  → `●` (task finished on an unfocused window)
- idle      → `π`
- no pi in that window → nothing

State is per-window: each tmux window that runs its own pi gets its own marker.
One pi per window works as you'd expect; if you ever split a window into panes,
the marker still tracks the window's pi (not whichever pane is active).

Each pi window is also renamed to **"Pi"** (with `automatic-rename` disabled
for it while pi owns it), so every pi window is labeled "Pi".

## How it works

The extension (`extensions/pi-tmux-state.ts`) subscribes to pi lifecycle events
and writes one per-window tmux option (`@pi-state`) onto its own window.

There is **no timer and no per-frame update** — "working" is a single static
glyph, so the status line isn't churned every tick. When a task finishes on a
window that isn't currently focused, the state becomes `complete` (shown as
`●`); the first time that window is visited again, the tmux plugin's global
`after-select-window` hook resets it back to `idle` (`π`). That hook also
fires for `next-window` / `previous-window` / `last-window`, so it covers
every usual way of switching windows.

The tmux plugin (`pi-tmux.tmux`) sets `window-status-format` to render the
marker before the existing `#W` title, reading `@pi-state`.

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

That's it. Run `pi` in a window and submit a prompt — the window title shows
`⠶` while busy, then `π` when idle (or `●` if you weren't looking and switch
back to it).

## Notes / caveats

- The marker colors follow your existing `window-status-current-style` /
  `window-status-style` (current window amber, others muted).
- If pi is killed hard (e.g. `pkill pi`) mid-task, its last state can stick on
  that window. A normal exit (`/exit`) cleans up. Closing the window removes
  the options entirely (they're window-scoped).
- You can change glyphs by editing the format in `pi-tmux.tmux`.