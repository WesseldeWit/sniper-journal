#!/bin/zsh
# Dubbelklik op dit bestand om Sniper Journal te starten op deze Mac.
# De app opent in je browser. Laat dit venster open staan zolang je de app gebruikt.
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
cd "$(dirname "$0")"

if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Sniper Journal draait al. De browser wordt geopend."
  open "http://localhost:5173"
  exit 0
fi

echo "Sniper Journal start. Sluit dit venster om de app te stoppen."
(sleep 2 && open "http://localhost:5173") &
npm run dev -- --strictPort
