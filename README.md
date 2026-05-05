# Hssabaty POS (saas-pos)

Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, Prisma, MySQL 8, Docker.

---

## Quick start — run everything with Docker (one command)

From the project root:

```bash
docker compose up --build
```

Or with **GNU Make**:

```bash
make up
```

Or the helper script:

```bash
chmod +x scripts/docker-up.sh   # once
./scripts/docker-up.sh
```

**Detached (background):**

```bash
docker compose up --build -d
# or
make up-bg
```

What this starts:

| Service | URL / port |
|--------|------------|
| **App** | [http://localhost:3000](http://localhost:3000) |
| **Adminer** (DB UI) | [http://localhost:8088](http://localhost:8088) — server `mysql`, user `saas_pos_user`, password `saas_pos_password`, DB `saas_pos_db` |
| **MySQL** (host access) | `127.0.0.1:3307` |

On first boot the **app container** runs `prisma migrate deploy`, then **`prisma db seed`** (demo users), then starts Next.js in dev mode.

**Log in after `make up` (demo accounts):**

| Role | Email | Password |
|------|-------|----------|
| Manager | `manager@pos.hssabaty.com` | `Test1234!` |
| Staff | `cashier@pos.hssabaty.com` | `Test1234!` |

If login returns **401**, the DB is empty or seed failed — run:

```bash
docker compose exec app npm run prisma:seed
```

**Stop:**

```bash
docker compose down
# or
make down
```

**If you see “container name … is already in use”** (leftover containers from an older `saas-pos-*` setup):

```bash
make clean-legacy
make up
```

Compose now names containers from the project (`hssabaty-pos-dev-*`) instead of fixed global names, so this should not recur.

---

## Production-style deploy (Docker)

Builds the app (`next build`) and runs `next start` + migrations.

1. Set strong secrets (example):

   ```bash
   export JWT_SECRET="your-long-random-secret"
   export NEXTAUTH_SECRET="another-long-secret"
   ```

2. Start:

   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   # or
   make prod
   ```

3. Open [http://localhost:3000](http://localhost:3000).

For real deployments, point `DATABASE_URL` at a managed MySQL instance, set `APP_URL` / SMTP env vars, and use a reverse proxy (TLS) in front of the app. Adjust `docker-compose.prod.yml` to your provider’s patterns (secrets, networks, replicas).

---

## Auto-deploy on merge to `main` (GitHub Actions)

This repo includes `.github/workflows/deploy-main.yml` to run on every push to `main`:

1. CI check on GitHub runner (`npm ci`, `npm run lint`, `npm run build`)
2. SSH deploy to your host (pull latest code, install, migrate, build, restart)

Configure these repository secrets in GitHub:

- `DEPLOY_HOST`: server IP or domain
- `DEPLOY_USER`: SSH user
- `DEPLOY_SSH_KEY`: private SSH key (PEM/OpenSSH)
- `DEPLOY_PORT`: optional SSH port (default `22`)
- `DEPLOY_APP_DIR`: absolute path of your app on host
- `DEPLOY_RESTART_CMD`: restart command on host

Example restart commands:

- PM2: `pm2 restart hssabaty-pos || pm2 start npm --name hssabaty-pos -- start`
- Docker Compose prod: `docker compose -f docker-compose.prod.yml up -d --build`

---

## Local development without Docker (optional)

1. Start only MySQL:

   ```bash
   docker compose up -d mysql
   ```

2. Copy env and use **host** DB URL (port **3307**):

   ```bash
   cp .env.example .env
   ```

   Ensure `DATABASE_URL` uses `127.0.0.1:3307` (see comments in `.env.example`).

3. Install, migrate, dev:

   ```bash
   npm install
   npx prisma migrate dev
   npm run dev
   ```

---

## Stack & structure

- **Stack:** Next.js 15, React, TypeScript, Tailwind, Prisma, MySQL, Docker.
- **Folders:** `app/` (routes + API), `components/`, `features/`, `lib/`, `store/`, `prisma/`, `docker/`, `docs/`.

---

## Useful commands

```bash
npm install
npm run dev
npm run lint
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:studio
npm run prisma:seed
```

---

## Prisma (manual)

```bash
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
```

- Prisma on the **host** → `DATABASE_URL` with `127.0.0.1:3307`.
- Prisma **inside** the Docker `app` service → compose sets `mysql:3306` (you do not need to change this manually).

---

## API documentation

- Endpoints: `docs/API.md`
- OpenAPI: `GET /api/docs/openapi`
- Swagger UI: [http://localhost:3000/fr/docs](http://localhost:3000/fr/docs) (also `/en/docs`, `/ar/docs`)

Docs access: open in `development`; other environments may require an ADMIN bearer token.

---

## Test accounts (seed)

```bash
npm run prisma:seed
```

Creates/updates (for dashboard testing):

| Role | Email | Password |
|------|-------|----------|
| Manager | `manager@pos.hssabaty.com` | `Test1234!` |
| Staff (cashier) | `cashier@pos.hssabaty.com` | `Test1234!` |

Run seed from the host with `DATABASE_URL` on `127.0.0.1:3307`, or `docker compose exec app npm run prisma:seed` when the stack is up.

---

## Structure initiale (référence)

Structure initiale d'un SaaS POS avec Next.js 15, Prisma, MySQL et Docker. Les sections ci-dessus décrivent le démarrage **Docker en une commande** et un flux **production** minimal.
