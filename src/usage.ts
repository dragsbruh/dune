import { z } from "zod";
import { Database, modelList, modelUsageSchema } from "./database.ts";

type DeltaUsage = {
  requests: number;
  tokens: number;
};

export class UsageTracker {
  constructor(private database: Database) {}

  async trackUsage(name: string, user: string, deltaUsage: DeltaUsage) {
    const modelData = await this.database.getUsageOf(user, name) ??
      defaultModelUsage(name, user);
    resetTimings(modelData);

    modelData.rpm += deltaUsage.requests;
    modelData.rpd += deltaUsage.requests;
    modelData.tpm = modelData.tpm
      ? modelData.tpm + deltaUsage.tokens
      : deltaUsage.tokens;
    modelData.tpd = modelData.tpd
      ? modelData.tpd + deltaUsage.tokens
      : deltaUsage.tokens;

    await this.database.saveModel(modelData);
    return modelData;
  }

  async getUsageOf(
    user: string,
    name: string,
  ): Promise<z.infer<typeof modelUsageSchema>> {
    return (await this.database.getUsageOf(user, name)) ??
      defaultModelUsage(name, user);
  }

  getUsages(user: string): Promise<z.infer<typeof modelUsageSchema>[]> {
    return this.database.getUsages(user);
  }

  deleteUser(user: string) {
    return this.database.removeUsagesOf(user);
  }

  deleteUsage(user: string, name: string) {
    return this.database.removeUsage(user, name);
  }

  deleteUsages(user: string, names: string[]) {
    return this.database.removeUsages(user, names);
  }
}

export function defaultModelUsage(
  name: string,
  user: string,
): z.infer<typeof modelUsageSchema> {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: crypto.randomUUID(),
    name: name,
    rpm: 0,
    rpd: 0,
    tpm: 0,
    tpd: 0,
    ash: 0,
    asd: 0,
    user: user,
    lastDay: now,
    lastMinute: now,
  };
}

function resetTimings(model: z.infer<typeof modelUsageSchema>): void {
  const now = Math.floor(Date.now() / 1000);
  if (now - model.lastMinute > 60) {
    model.lastMinute = now;
    model.rpm = 0;
    model.tpm = 0;
  }
  if (now - model.lastDay > 60 * 60 * 24) {
    model.lastDay = now;
    model.rpd = 0;
    model.tpd = 0;
  }
}

type RemainingUsage = {
  name: string;
  rpm: number;
  rpd: number;
  tpm: number | null;
  tpd: number | null;
  ash: number | null;
  asd: number | null;
};

export function getRemaining(
  usage: z.infer<typeof modelUsageSchema>,
): RemainingUsage {
  resetTimings(usage);
  const model = modelList.getModel(usage.name);
  if (!model) {
    return defaultModelUsage(usage.name, usage.user);
  }
  return {
    name: usage.name,
    rpm: model.rpm - usage.rpm,
    rpd: model.rpd - usage.rpd,
    tpm: model.tpm && usage.tpm ? model.tpm - usage.tpm : null,
    tpd: model.tpd && usage.tpd ? model.tpd - usage.tpd : null,
    ash: model.ash && usage.ash ? model.ash - usage.ash : null,
    asd: model.asd && usage.asd ? model.asd - usage.asd : null,
  };
}
