import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ROLES } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

const rowSchema = z.object({
  nameFr: z.string().min(1),
  sku: z.string().min(1),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().min(1),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  barcode: z.string().optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  vatRate: z.coerce.number().min(0).max(100).optional(),
});

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

/** POST /api/v1/products/import — bulk create from CSV (text body). Header: nameFr,sku,price,stock,categoryId[,nameEn,barcode,minStock,vatRate] */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (!requireRole(auth.user.role, [ROLES.ADMIN, ROLES.MANAGER])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await request.text();
    if (!raw.trim()) {
      return NextResponse.json({ error: "Expected CSV body" }, { status: 400 });
    }

    const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must include a header row and at least one data row" }, { status: 400 });
    }

    const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
    const required = ["namefr", "sku", "price", "stock", "categoryid"];
    for (const col of required) {
      if (!header.includes(col)) {
        return NextResponse.json({ error: `Missing CSV column: ${col}` }, { status: 400 });
      }
    }

    const created: string[] = [];
    const errors: { line: number; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]!);
      const row: Record<string, string> = {};
      header.forEach((h, j) => {
        row[h] = cells[j] ?? "";
      });

      const parsed = rowSchema.safeParse({
        nameFr: row.namefr,
        sku: row.sku,
        price: row.price,
        stock: row.stock,
        categoryId: row.categoryid,
        nameEn: row.nameen || undefined,
        nameAr: row.namear || undefined,
        barcode: row.barcode || undefined,
        minStock: row.minstock || undefined,
        vatRate: row.vatrate || undefined,
      });

      if (!parsed.success) {
        errors.push({ line: i + 1, error: parsed.error.issues.map((e) => e.message).join("; ") });
        continue;
      }

      try {
        const cat = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
        if (!cat) {
          errors.push({ line: i + 1, error: "categoryId not found" });
          continue;
        }

        const existingSku = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
        if (existingSku) {
          errors.push({ line: i + 1, error: `SKU already exists: ${parsed.data.sku}` });
          continue;
        }

        if (parsed.data.barcode) {
          const existingBc = await prisma.product.findUnique({ where: { barcode: parsed.data.barcode } });
          if (existingBc) {
            errors.push({ line: i + 1, error: `Barcode already exists: ${parsed.data.barcode}` });
            continue;
          }
        }

        const p = await prisma.product.create({
          data: {
            type: "SIMPLE",
            nameFr: parsed.data.nameFr,
            nameEn: parsed.data.nameEn,
            nameAr: parsed.data.nameAr,
            sku: parsed.data.sku,
            barcode: parsed.data.barcode,
            price: parsed.data.price,
            stock: parsed.data.stock,
            minStock: parsed.data.minStock ?? 0,
            vatRate: parsed.data.vatRate ?? 20,
            categoryId: parsed.data.categoryId,
          },
        });
        created.push(p.id);

        await writeAuditLog({
          actorUserId: auth.user.id,
          action: "PRODUCT_IMPORTED",
          targetType: "PRODUCT",
          targetId: p.id,
          metadata: { sku: p.sku, line: i + 1 },
        });
      } catch (e) {
        errors.push({ line: i + 1, error: e instanceof Error ? e.message : "create failed" });
      }
    }

    return NextResponse.json(
      { created: created.length, productIds: created, errors },
      { status: errors.length && !created.length ? 422 : 201 },
    );
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "POST /api/v1/products/import");
  }
}
