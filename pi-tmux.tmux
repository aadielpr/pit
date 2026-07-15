#!/usr/bin/env bash
# pi-tmux: show pi coding agent state in the tmux window title.
#
# Requires the companion pi extension (extensions/pi-tmux-state.ts) which sets
# one per-window tmux user option on the window a pi is running in:
#   @pi-state  -> "working" | "complete" | "idle"   (unset on windows with no pi)
#
# This script prepends a marker to the window title in the status bar:
#   working   -> ⠶ (static, no animation)
#   complete  -> ● (task finished on an unfocused window)
#   idle      -> π
#   no pi     -> nothing (title shows just #W as before)
#
# "Visited" reset: the global after-select-window hook below resets the
# just-activated window's @pi-state from "complete" back to "idle" (π) the
# moment the user switches to it. after-select-window also fires for
# next-window / previous-window / last-window, so it covers every usual way of
# switching windows. It only acts when @pi-state is exactly "complete", so an
# in-flight "working" window is never touched.
#
# The extension also renames each pi window to "Pi", so #W shows "Pi".
#
# Install: source this file from your tmux.conf, e.g.
#   run-shell "/path/to/pit/pi-tmux.tmux"
# or drop it under your tpm plugin dir.

# Marker per @pi-state.  Each branch emits the full window entry
# (marker + #W) so we can colour the whole thing per-state.
# complete → green; working/idle → inherit theme colours.
_PI_MARKER='#{?#{==:#{@pi-state},working},⠶ #W ,#{?#{==:#{@pi-state},complete},#[fg=colour148] #W #[fg=default],#{?#{==:#{@pi-state},idle},π #W ,#W }}}'

tmux set-window-option -g window-status-current-format "${_PI_MARKER}"
tmux set-window-option -g window-status-format         "${_PI_MARKER}"

# When the user switches into a "complete" window, clear it back to "idle".
# The command is quoted as one tmux token group so if-shell gets a single arg.
tmux set-hook -g after-select-window \
  "if-shell -F '#{==:#{@pi-state},complete}' 'set-option -w @pi-state idle'"

unset _PI_MARKER
