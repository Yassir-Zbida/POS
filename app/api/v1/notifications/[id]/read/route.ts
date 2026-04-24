import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { databaseUnavailableResponse, internalErrorResponse, isDatabaseConnectionError } from "@/lib/api-route-errors";

/** PATCH /api/v1/notifications/[id]/read — mark single notification as read */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (isDatabaseConnectionError(e)) return databaseUnavailableResponse();
    return internalErrorResponse(e, "PATCH /api/v1/notifications/[id]/read");
  }
}
