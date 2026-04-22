# saas-pos

Structure initiale d'un SaaS POS avec Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, Prisma, MySQL et Docker.

## Stack

- Next.js 15 + React
- TypeScript
- Tailwind CSS
- shadcn/ui (configuration de base)
- Prisma ORM
- MySQL 8
- Docker + Docker Compose

## Structure

- `app/`: routes App Router + API (`auth`, `admin`, `manager`, `health`)
- `components/`: UI, layout, forms, dashboard, POS, shared
- `features/`: modules métier (actions/services/schemas/hooks/types)
- `lib/`: utilitaires partagés (auth, rbac, audit, prisma)
- `store/`: stores Zustand
- `prisma/`: schema + seed
- `docs/`: documentation API
- `docker/`: Dockerfile Next.js + init SQL MySQL

## Commandes utiles

```bash
npm install
npm run dev
npm run lint
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:studio
npm run prisma:seed
```

## Lancement avec Docker

```bash
docker compose up --build
```

Application: [http://localhost:3000](http://localhost:3000)
Adminer: [http://localhost:8080](http://localhost:8080)
MySQL: `localhost:3307`

## Prisma

1. Copier l'environnement:

```bash
cp .env.example .env
```

2. Générer le client Prisma:

```bash
npm run prisma:generate
```

3. Lancer une migration:

```bash
npm run prisma:migrate -- --name init
```

> Si vous exécutez Prisma depuis le host, utilisez `localhost:3307` dans `DATABASE_URL`.
> Si vous exécutez Prisma depuis le container app, utilisez `mysql:3306`.

## API Documentation

Documentation des endpoints: `docs/API.md`

OpenAPI JSON: `GET /api/docs/openapi`
Swagger UI: [http://localhost:3000/fr/docs](http://localhost:3000/fr/docs) (ou `/en/docs`, `/ar/docs` selon la langue)

Docs protection:
- `development`: open access
- other environments: ADMIN bearer token required
