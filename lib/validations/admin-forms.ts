import { z } from "zod";

/** Aligned with merchant forms + APIs — digits, spaces, + ( ) - */
export const PHONE_RE = /^[+()\d\s-]{0,32}$/;

/** POST /api/admin/merchants — step “account” */
export const merchantCreateAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "nameRequired" })
      .min(2, { message: "nameMin" })
      .max(191),
    email: z
      .string()
      .trim()
      .min(1, { message: "emailRequired" })
      .email({ message: "emailInvalid" })
      .max(191),
    phone: z.string().trim().max(32),
    password: z
      .string()
      .min(1, { message: "passwordRequired" })
      .min(8, { message: "passwordMin" })
      .max(128),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.phone.length > 0 && !PHONE_RE.test(data.phone)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "phoneInvalid" });
    }
    if (data.password.length >= 8) {
      if (data.confirmPassword.length === 0) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "confirmRequired" });
      } else if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "confirmMismatch" });
      }
    } else if (data.confirmPassword.length > 0) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "confirmMismatch" });
    }
  });

/** PUT /api/admin/merchants/[id] — profile fields */
export const merchantEditFormSchema = z.object({
  name: z.string().trim().min(2, { message: "nameMin" }).max(191),
  phone: z.string().trim().max(32),
}).superRefine((data, ctx) => {
  if (data.phone.length > 0 && !PHONE_RE.test(data.phone)) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "phoneInvalid" });
  }
});

/** PUT /api/admin/users/[id] */
export const adminUserEditFormSchema = z
  .object({
    name: z.string().trim().max(191),
    phone: z.string().trim().max(32),
  })
  .superRefine((data, ctx) => {
    if (data.name.length > 0 && data.name.length < 2) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "nameMin" });
    }
    if (data.phone.length > 0 && !PHONE_RE.test(data.phone)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "phoneInvalid" });
    }
  });

/** POST /api/admin/merchants/[id]/staff */
export const addStaffFormSchema = z
  .object({
    name: z.string().trim().min(2, { message: "nameMin" }).max(191),
    email: z.string().trim().email({ message: "emailInvalid" }).max(191),
    phone: z.string().trim().max(32),
    password: z.string().min(8, { message: "passwordMin" }).max(128),
    lockPin: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (data.phone.length > 0 && !PHONE_RE.test(data.phone)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "phoneInvalid" });
    }
    if (data.lockPin.length > 0 && !/^\d{4}$/.test(data.lockPin)) {
      ctx.addIssue({ code: "custom", path: ["lockPin"], message: "lockPinInvalid" });
    }
  });

export type MerchantCreateAccountInput = z.infer<typeof merchantCreateAccountSchema>;

/** Collect first issue per field path for inline messages */
export function zodIssuesToFieldMap(err: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (typeof key !== "string" || map[key]) continue;
    map[key] = typeof issue.message === "string" ? issue.message : "invalid";
  }
  return map;
}
