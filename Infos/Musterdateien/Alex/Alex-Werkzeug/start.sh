#!/bin/bash
# Startet alex_brandschutz.py mit dem python.org-Python (Automator hat einen schmalen PATH).
DIR="$(cd "$(dirname "$0")" && pwd)"
for PY in /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 \
          /usr/local/bin/python3 /opt/homebrew/bin/python3 /usr/bin/python3; do
    if [ -x "$PY" ]; then
        exec "$PY" "$DIR/alex_brandschutz.py" "$@"
    fi
done
osascript -e 'display alert "Alex Brandschutzordnungen" message "Kein python3 gefunden." as critical'
exit 1
