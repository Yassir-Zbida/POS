export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "saas-pos API",
    version: "1.0.0",
    description: "Authentication, admin, and manager API for saas-pos.",
  },
  servers: [{ url: "http://localhost:3000/api" }],
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
    "/auth/login": {
      post: {
        summary: "Authenticate user",
        responses: { "200": { description: "Authenticated" }, "401": { description: "Invalid credentials" } },
      },
    },
    "/auth/refresh": { post: { summary: "Refresh access token", responses: { "200": { description: "Rotated" } } } },
    "/auth/logout": { post: { summary: "Logout and revoke refresh token", responses: { "200": { description: "Logged out" } } } },
    "/auth/me": { get: { summary: "Get current user", responses: { "200": { description: "Current user" } } } },
    "/admin/users": { get: { summary: "List all users", responses: { "200": { description: "Users list" }, "403": { description: "Forbidden" } } } },
    "/admin/users/{id}/status": { patch: { summary: "Update user status", responses: { "200": { description: "Updated" } } } },
    "/admin/managers/{id}/subscription-status": { patch: { summary: "Update manager subscription", responses: { "200": { description: "Updated" } } } },
    "/admin/audit-logs": { get: { summary: "Read audit logs", responses: { "200": { description: "Audit logs" } } } },
    "/manager/cashiers": { get: { summary: "List manager cashiers", responses: { "200": { description: "Cashiers" } } }, post: { summary: "Create cashier", responses: { "201": { description: "Created" } } } },
    "/manager/cashiers/{id}/status": { patch: { summary: "Update cashier status", responses: { "200": { description: "Updated" } } } },
  },
};
