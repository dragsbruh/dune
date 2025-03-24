-- export const modelDataSchema = z.strictObject({
--   name: z.string(),
--   rpm: z.number().int().positive(),
--   rpd: z.number().int().positive(),
--   tpm: z.number().int().positive(),
--   tpd: z.number().int().positive().nullable(),
--   ash: z.number().int().positive().nullable(),
--   asd: z.number().int().positive().nullable(),
-- })

-- export const modelSchema = modelDataSchema.extend({
--   id: z.string().uuid(), // primary key
--   lastDay: z.number().int().positive(), // seconds
--   lastMinute: z.number().int().positive(), // seconds
-- })

CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rpm INTEGER NOT NULL,
  rpd INTEGER NOT NULL,
  tpm INTEGER,
  tpd INTEGER,
  ash INTEGER,
  asd INTEGER,
  user UUID NOT NULL,
  last_day INTEGER NOT NULL,
  last_minute INTEGER NOT NULL
)
