#!/bin/sh
set -e
echo "[docker] Applying Prisma migrations…"
npx prisma migrate deploy

echo "[docker] Seeding demo users (manager + cashier)…"
if npx prisma db seed; then
  echo "[docker] Seed OK — you can log in with manager@pos.hssabaty.com / Test1234!"
else
  echo "[docker] Seed failed (non-fatal). Run manually: docker compose exec app npm run prisma:seed"
fi

echo "[docker] Starting Next.js…"
exec "$@"
