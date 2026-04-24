import { z } from "zod";

export const registerBusinessSchema = z.object({
  businessName: z.string().min(1).max(200),
  ownerName: z.string().min(1).max(200),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .refine((p) => /[A-Z]/.test(p), "Password must contain at least one uppercase letter")
    .refine((p) => /[0-9]/.test(p), "Password must contain at least one number"),
  phone: z.string().max(32).optional(),
  city: z.string().max(120).optional(),
  ice: z.string().max(64).optional(),
  businessType: z.enum(["PERFUME", "CLOTHING", "SUPERMARKET", "OTHER"]).optional(),
});

export const pinLoginSchema = z.object({
  email: z.string().email(),
  pin: z.string().regex(/^\d{4,8}$/),
  rememberMe: z.boolean().optional(),
});

export const setPinSchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/),
});
