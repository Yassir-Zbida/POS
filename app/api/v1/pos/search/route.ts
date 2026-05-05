import { GET as productsGet } from "@/app/api/v1/products/route";

/** GET /api/v1/pos/search?q=…&categoryId=…&barcode=… — same catalog search as GET /api/v1/products (POS alias). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? url.searchParams.get("search") ?? "";
  const inner = new URL("http://internal/api/v1/products");
  inner.searchParams.set("search", q);
  // POS search context: cashier may access catalog for checkout even when
  // explicit catalog page access is disabled.
  inner.searchParams.set("forPos", "true");
  for (const key of ["categoryId", "barcode", "lowStock", "page", "limit"]) {
    const v = url.searchParams.get(key);
    if (v != null) inner.searchParams.set(key, v);
  }
  return productsGet(
    new Request(inner.toString(), {
      method: "GET",
      headers: request.headers,
    }),
  );
}
