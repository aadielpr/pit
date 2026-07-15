#!/usr/bin/env bash
# pi-tmux: show pi coding agent state in the tmux window title.
#
# Requires the companion pi extension (extensions/pi-tmux-state.ts) which sets
# two per-window tmux options on the window a pi is running in:
#   @pi-state  -> "working" | "idle"   (unset on windows with no pi)
#   @pi-frame  -> current spinner frame (braille) while working
#
# This script prepends a marker to the window title in the status bar:
#   working -> animated braille spinner (driven by the extension)
#   idle    -> ●
#   no pi   -> nothing (title shows just #W as before)
#
# Install: source this file from your tmux.conf, e.g.
#   run-shell "/path/to/pit/pi-tmux.tmux"
# or drop it under your tpm plugin dir.

# Marker: working shows the current frame; idle shows a dot; otherwise empty.
# Keep the existing "#W " title after the marker.
_PI_MARKER='#{?#{==:#{@pi-state},working},#{@pi-frame},#{?#{==:#{@pi-state},idle},●,}}'

tmux set-window-option -g window-status-current-format "${_PI_MARKER} #W "
tmux set-window-option -g window-status-format         "${_PI_MARKER} #W "

unset _PI_MARKER