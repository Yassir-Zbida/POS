import { z } from "zod";

export const credentialsBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

export const forgotPasswordBodySchema = z.object({
  email: z.string().email(),
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(256),
});
