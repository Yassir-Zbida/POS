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
      "Full HTTP API for saas-pos: auth, health, admin, manager, and v1 POS/catalog/inventory routes. Most routes require a Bearer access token.",
  },
  servers: [{ url: "http://localhost:3000/api" }],
  tags: [
    { name: "Auth", description: "Login, tokens, password flows, current user" },
    { name: "Health", description: "Liveness and database checks" },
    { name: "Docs", description: "OpenAPI JSON (access may be restricted by environment)" },
    { name: "Admin", description: "Platform admin" },
    { name: "Manager", description: "Store manager / staff management" },
    { name: "v1 — Auth", description: "SRS-aligned auth: register, PIN, OTP; mirrors /api/auth routes" },
    { name: "v1 — Hardware", description: "Printer settings snapshot (ESC/POS is client-side)" },
    { name: "v1 — Business & locations", description: "Tenant business profile and sites" },
    { name: "v1 — Catalog", description: "Categories, products, variants, attributes" },
    { name: "v1 — Customers & suppliers", description: "CRM and purchasing parties" },
    { name: "v1 — Inventory", description: "Stock movements, adjustments, alerts" },
    { name: "v1 — Purchasing", description: "Purchase orders and receiving" },
    { name: "v1 — POS", description: "Sales, sessions, parked carts, discounts" },
    { name: "v1 — Reports & notifications", description: "Reporting and in-app notifications" },
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
    "/v1/auth/forgot-password": {
      post: op("v1 — Auth", "Request password reset email (alias of /auth/forgot-password)", { ...r.ok, ...r.badRequest }, { security: pub }),
    },
    "/v1/auth/login": {
      post: op("v1 — Auth", "Authenticate with email and password", { "200": { description: "Authenticated" }, ...r.unauthorized }, { security: pub }),
    },
    "/v1/auth/logout": {
      post: op("v1 — Auth", "Logout (alias of /auth/logout)", r.ok),
    },
    "/v1/auth/me": {
      get: op("v1 — Auth", "Current user (alias of /auth/me)", r.ok),
    },
    "/v1/auth/otp/send": {
      post: op("v1 — Auth", "Send email or SMS OTP", { ...r.ok, ...r.badRequest }, { security: pub }),
    },
    "/v1/auth/otp/verify": {
      post: op(
        "v1 — Auth",
        "Verify OTP; optional issueSession+rememberMe with purpose LOGIN and channel EMAIL returns JWTs",
        { ...r.ok, ...r.unauthorized },
        { security: pub },
      ),
    },
    "/v1/auth/pin": {
      post: op("v1 — Auth", "Login with email + PIN", { "200": { description: "Authenticated" }, ...r.unauthorized }, { security: pub }),
    },
    "/v1/auth/refresh": {
      post: op("v1 — Auth", "Refresh tokens (alias of /auth/refresh)", { "200": { description: "Rotated" } }, { security: pub }),
    },
    "/v1/auth/register": {
      post: op("v1 — Auth", "Register business + owner (manager) account", { ...r.created, ...r.badRequest, ...r.conflict }, { security: pub }),
    },
    "/v1/auth/reset-password": {
      post: op("v1 — Auth", "Complete password reset (alias of /auth/reset-password)", { ...r.ok, ...r.badRequest }, { security: pub }),
    },
    "/v1/auth/set-pin": {
      post: op("v1 — Auth", "Set checkout PIN for current user", r.ok),
    },
    "/v1/hardware/status": {
      get: op("v1 — Hardware", "Printer-related settings from business profile", r.ok),
    },
    "/v1/hardware/test-print": {
      post: op("v1 — Hardware", "Acknowledge test print (device-side printing)", r.ok),
    },
    "/v1/pos/search": {
      get: op("v1 — POS", "Product search for POS (alias of GET /v1/products with search params)", r.ok),
    },
    "/v1/products/import": {
      post: op("v1 — Catalog", "Bulk import products from CSV body", { ...r.created, ...r.badRequest, ...r.forbidden }),
    },
    "/v1/reports/dashboard": {
      get: op("v1 — Reports & notifications", "Dashboard KPI snapshot (revenue today, low stock, credit, sessions)", r.ok),
    },
    "/v1/attributes": {
      get: op("v1 — Catalog", "List attributes", r.ok),
      post: op("v1 — Catalog", "Create attribute", r.created),
    },
    "/v1/attributes/{id}": {
      get: op("v1 — Catalog", "Get attribute", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
      put: op("v1 — Catalog", "Update attribute", r.ok, { parameters: pathParams("id") }),
      delete: op("v1 — Catalog", "Delete attribute", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/v1/attributes/{id}/values": {
      post: op("v1 — Catalog", "Add attribute value", r.created, { parameters: pathParams("id") }),
    },
    "/v1/attributes/{id}/values/{valueId}": {
      put: op("v1 — Catalog", "Update attribute value", r.ok, { parameters: pathParams("id", "valueId") }),
      delete: op("v1 — Catalog", "Delete attribute value", { ...r.ok, ...r.notFound }, { parameters: pathParams("id", "valueId") }),
    },
    "/v1/business": {
      get: op("v1 — Business & locations", "Get business profile", r.ok),
      put: op("v1 — Business & locations", "Update business profile", r.ok),
    },
    "/v1/categories": {
      get: op("v1 — Catalog", "List categories", r.ok),
      post: op("v1 — Catalog", "Create category", r.created),
    },
    "/v1/categories/{id}": {
      get: op("v1 — Catalog", "Get category", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
      put: op("v1 — Catalog", "Update category", r.ok, { parameters: pathParams("id") }),
      delete: op("v1 — Catalog", "Delete category", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/v1/customers": {
      get: op("v1 — Customers & suppliers", "List customers", r.ok),
      post: op("v1 — Customers & suppliers", "Create customer", r.created),
    },
    "/v1/customers/{id}": {
      get: op("v1 — Customers & suppliers", "Get customer", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
      put: op("v1 — Customers & suppliers", "Update customer", r.ok, { parameters: pathParams("id") }),
      delete: op("v1 — Customers & suppliers", "Delete customer", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/v1/customers/{id}/credit": {
      get: op("v1 — Customers & suppliers", "Get customer credit balance", r.ok, { parameters: pathParams("id") }),
      post: op("v1 — Customers & suppliers", "Adjust or record customer credit", r.ok, { parameters: pathParams("id") }),
    },
    "/v1/discounts/coupons": {
      get: op("v1 — POS", "List discount coupons", r.ok),
      post: op("v1 — POS", "Create discount coupon", r.created),
    },
    "/v1/discounts/coupons/{id}": {
      get: op("v1 — POS", "Get discount coupon", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
      put: op("v1 — POS", "Update discount coupon", r.ok, { parameters: pathParams("id") }),
      delete: op("v1 — POS", "Delete discount coupon", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/v1/discounts/validate": {
      post: op("v1 — POS", "Validate a discount or coupon for the cart", r.ok),
    },
    "/v1/inventory/adjust": {
      post: op("v1 — Inventory", "Adjust inventory (manual stock change)", r.ok),
    },
    "/v1/inventory/low-stock": {
      get: op("v1 — Inventory", "List low-stock items", r.ok),
    },
    "/v1/inventory/movements": {
      get: op("v1 — Inventory", "List inventory movements", r.ok),
    },
    "/v1/locations": {
      get: op("v1 — Business & locations", "List locations", r.ok),
      post: op("v1 — Business & locations", "Create location", r.created),
    },
    "/v1/locations/{id}": {
      get: op("v1 — Business & locations", "Get location", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
      put: op("v1 — Business & locations", "Update location", r.ok, { parameters: pathParams("id") }),
      delete: op("v1 — Business & locations", "Delete location", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/v1/notifications": {
      get: op("v1 — Reports & notifications", "List notifications", r.ok),
    },
    "/v1/notifications/read-all": {
      patch: op("v1 — Reports & notifications", "Mark all notifications as read", r.ok),
    },
    "/v1/notifications/{id}/read": {
      patch: op("v1 — Reports & notifications", "Mark one notification as read", r.ok, { parameters: pathParams("id") }),
    },
    "/v1/pos/parked-carts": {
      get: op("v1 — POS", "List parked carts", r.ok),
      post: op("v1 — POS", "Create parked cart", r.created),
    },
    "/v1/pos/parked-carts/{id}": {
      get: op("v1 — POS", "Get parked cart", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
      delete: op("v1 — POS", "Delete parked cart", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/v1/products": {
      get: op("v1 — Catalog", "List products", r.ok),
      post: op("v1 — Catalog", "Create product", r.created),
    },
    "/v1/products/{id}": {
      get: op("v1 — Catalog", "Get product", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
      put: op("v1 — Catalog", "Update product", r.ok, { parameters: pathParams("id") }),
      delete: op("v1 — Catalog", "Delete product", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/v1/products/{id}/variants": {
      get: op("v1 — Catalog", "List product variants", r.ok, { parameters: pathParams("id") }),
      post: op("v1 — Catalog", "Create product variant", r.created, { parameters: pathParams("id") }),
    },
    "/v1/products/{id}/variants/{variantId}": {
      get: op("v1 — Catalog", "Get product variant", { ...r.ok, ...r.notFound }, { parameters: pathParams("id", "variantId") }),
      put: op("v1 — Catalog", "Update product variant", r.ok, { parameters: pathParams("id", "variantId") }),
      delete: op("v1 — Catalog", "Delete product variant", { ...r.ok, ...r.notFound }, { parameters: pathParams("id", "variantId") }),
    },
    "/v1/purchase-orders": {
      get: op("v1 — Purchasing", "List purchase orders", r.ok),
      post: op("v1 — Purchasing", "Create purchase order", r.created),
    },
    "/v1/purchase-orders/{id}": {
      get: op("v1 — Purchasing", "Get purchase order", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
      put: op("v1 — Purchasing", "Update purchase order", r.ok, { parameters: pathParams("id") }),
    },
    "/v1/purchase-orders/{id}/receive": {
      post: op("v1 — Purchasing", "Receive stock against a purchase order", r.ok, { parameters: pathParams("id") }),
    },
    "/v1/reports/customers": {
      get: op("v1 — Reports & notifications", "Customer report (?format=csv for export)", r.ok),
    },
    "/v1/reports/inventory": {
      get: op("v1 — Reports & notifications", "Inventory report (?format=csv for export)", r.ok),
    },
    "/v1/reports/sales": {
      get: op("v1 — Reports & notifications", "Sales report (?format=csv for export)", r.ok),
    },
    "/v1/sales": {
      get: op("v1 — POS", "List sales", r.ok),
      post: op(
        "v1 — POS",
        "Create sale (checkout); optional loyaltyPointsToRedeem with customerId",
        { ...r.created, ...r.badRequest, ...r.conflict },
      ),
    },
    "/v1/sales/{id}": {
      get: op("v1 — POS", "Get sale", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/v1/sales/{id}/refund": {
      post: op("v1 — POS", "Refund a sale", r.ok, { parameters: pathParams("id") }),
    },
    "/v1/sessions": {
      get: op("v1 — POS", "List register/cashier sessions", r.ok),
      post: op("v1 — POS", "Open session", r.created),
    },
    "/v1/sessions/{id}": {
      get: op("v1 — POS", "Get session", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
    "/v1/sessions/{id}/close": {
      post: op("v1 — POS", "Close session", r.ok, { parameters: pathParams("id") }),
    },
    "/v1/sessions/{id}/movements": {
      get: op("v1 — POS", "List session cash movements", r.ok, { parameters: pathParams("id") }),
      post: op("v1 — POS", "Record session cash movement", { ...r.created, ...r.badRequest }, { parameters: pathParams("id") }),
    },
    "/v1/suppliers": {
      get: op("v1 — Customers & suppliers", "List suppliers", r.ok),
      post: op("v1 — Customers & suppliers", "Create supplier", r.created),
    },
    "/v1/suppliers/{id}": {
      get: op("v1 — Customers & suppliers", "Get supplier", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
      put: op("v1 — Customers & suppliers", "Update supplier", r.ok, { parameters: pathParams("id") }),
      delete: op("v1 — Customers & suppliers", "Delete supplier", { ...r.ok, ...r.notFound }, { parameters: pathParams("id") }),
    },
  },
} as const;
