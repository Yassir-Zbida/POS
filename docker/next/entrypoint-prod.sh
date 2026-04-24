#!/bin/sh
set -e
echo "[docker] Applying Prisma migrations…"
npx prisma migrate deploy
echo "[docker] Starting production server…"
exec "$@"
