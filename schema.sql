-- if you choose a different name for the table,
-- make sure to change the env variable as shown in `.env.example`

CREATE TABLE IF NOT EXISTS usages (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "rpm" INTEGER NOT NULL,
  "rpd" INTEGER NOT NULL,
  "tpm" INTEGER,
  "tpd" INTEGER,
  "ash" INTEGER,
  "asd" INTEGER,
  "owner" UUID NOT NULL,
  "lastDay" INTEGER NOT NULL,
  "lastMinute" INTEGER NOT NULL
)
