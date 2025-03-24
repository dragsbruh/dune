import 'jsr:@std/dotenv/load'
import { z } from 'npm:zod'

export const envSchema = z.object({
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string(),
  SUPABASE_TABLE_NAME: z.string(),
  ADMIN: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>
export const env = envSchema.parse(Deno.env.toObject())
export default env;