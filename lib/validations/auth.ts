import { z } from "zod";

export const credentialsBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});
