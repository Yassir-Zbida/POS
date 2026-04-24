/** OpenAPI 3 document for Swagger UI (`/api/docs/openapi`). Paths are under the `servers[0].url` base (`/api`). */

const pathParams = (...names: string[]) =>
  names.map((name) => ({
    name,
    in: "path" as const,
    required: true,
    schema: { type: "string" as const },
  }));

const pub: [] = [];

const r = {
  ok: { "200": { description: "OK" } },
  created: { "201": { description: "Created" } },
  badRequest: { "400": { description: "Bad request" } },
  unauthorized: { "401": { description: "Unauthorized" } },
  forbidden: { "403": { description: "Forbidden" } },
  notFound: { "404": { description: "Not found" } },
  conflict: { "409": { description: "Conflict" } },
} as const;

function op(
  tag: string,
  summary: string,
  methodResponses: Record<string, { description: string }>,
  extra?: { parameters?: ReturnType<typeof pathParams>; security?: typeof pub },
) {
  const base: Record<string, unknown> = {
    tags: [tag],
    summary,
    responses: methodResponses,
  };
  if (extra?.parameters?.length) base.parameters = extra.parameters;
  if (extra?.security !== undefined) base.security = extra.security;
  return base;
}

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "saas-pos API",
    version: "1.0.0",
    description:
      "Authentication, health, platform admin, manager, and docs metadata. v1 tenant routes are documented in a follow-up commit.",
  },
  servers: [{ url: "http://localhost:3000/api" }],
  tags: [
    { name: "Auth", description: "Login, tokens, password flows, current user" },
    { name: "Health", description: "Liveness and database checks" },
    { name: "Docs", description: "OpenAPI JSON (access may be restricted by environment)" },
    { name: "Admin", description: "Platform admin" },
    { name: "Manager", description: "Store manager / staff management" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/forgot-password": {
      post: op("Auth", "Request password reset email", { ...r.ok, ...r.badRequest }, { security: pub }),
    },
    "/auth/login": {
      post: op("Auth", "Authenticate user", { "200": { description: "Authenticated" }, ...r.unauthorized }, { security: pub }),
    },
    "/auth/logout": {
      post: op("Auth", "Logout and revoke refresh token", r.ok),
    },
    "/auth/me": {
      get: op("Auth", "Get current user", r.ok),
    },
    "/auth/refresh": {
      post: op("Auth", "Refresh access token", { "200": { description: "Rotated" } }, { security: pub }),
    },
    "/auth/reset-password": {
      post: op("Auth", "Complete password reset with token", { ...r.ok, ...r.badRequest }, { security: pub }),
    },
    "/admin/audit-logs": {
      get: op("Admin", "List audit logs", { ...r.ok, ...r.forbidden }),
    },
    "/admin/managers/{id}/subscription-status": {
      patch: op("Admin", "Update manager subscription status", { ...r.ok, ...r.forbidden, ...r.notFound }, {
        parameters: pathParams("id"),
      }),
    },
    "/admin/users": {
      get: op("Admin", "List all users", { ...r.ok, ...r.forbidden }),
    },
    "/admin/users/{id}/status": {
      patch: op("Admin", "Update user status", { ...r.ok, ...r.forbidden, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/docs/openapi": {
      get: op("Docs", "OpenAPI 3 JSON document for this API", r.ok),
    },
    "/health": {
      get: op("Health", "Liveness probe", { ...r.ok }, { security: pub }),
    },
    "/health/db": {
      get: op("Health", "Database connectivity check", { ...r.ok }, { security: pub }),
    },
    "/manager/cashiers": {
      get: op("Manager", "List manager cashiers", { ...r.ok, ...r.forbidden }),
      post: op("Manager", "Create cashier", { ...r.created, ...r.forbidden }),
    },
    "/manager/cashiers/{id}/status": {
      patch: op("Manager", "Update cashier status", { ...r.ok, ...r.forbidden, ...r.notFound }, { parameters: pathParams("id") }),
    },
  },
} as const;
