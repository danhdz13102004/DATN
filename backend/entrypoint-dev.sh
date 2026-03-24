#!/bin/bash
set -e

echo "=== RecruitPro Backend Dev Entrypoint ==="

# ── Background recompilation watcher ──────────
# spring-boot:run alone does NOT recompile when .java files change.
# This watcher detects source changes and runs mvn compile so devtools
# can pick up the new .class files in target/classes.
(
  # Initialize checksum baseline from CURRENT file state
  PREV_CHECKSUM=$(find /app/src -name '*.java' -exec md5sum {} + 2>/dev/null | sort | md5sum)

  while true; do
    sleep 3
    CURR_CHECKSUM=$(find /app/src -name '*.java' -exec md5sum {} + 2>/dev/null | sort | md5sum)

    if [ "$PREV_CHECKSUM" != "$CURR_CHECKSUM" ]; then
      echo "[watcher] Source change detected, recompiling..."
      # Brief delay to let IDEs finish multi-file saves
      sleep 1
      mvn compile -q 2>/dev/null || echo "[watcher] Compilation error (check logs)"
      PREV_CHECKSUM=$CURR_CHECKSUM
    fi
  done
) &

# ── Start Spring Boot with devtools ───────────
# fork=false so Docker env vars (SPRING_DEVTOOLS_*) are visible to the app JVM
mvn spring-boot:run -Dspring-boot.run.fork=false
