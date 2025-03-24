import { z } from "zod";
import { Database, modelList, modelUsageSchema } from "./database.ts";

type DeltaUsage = {
  requests: number;
  tokens: number;
};

export class UsageTracker {
  constructor(private database: Database) {}

  async trackUsage(name: string, owner: string, deltaUsage: DeltaUsage) {
    const modelData = await this.database.getUsageOf(owner, name) ??
      defaultModelUsage(name, owner);
    resetTimings(modelData);

    modelData.rpm += deltaUsage.requests;
    modelData.rpd += deltaUsage.requests;
    modelData.tpm = modelData.tpm !== null
      ? modelData.tpm + deltaUsage.tokens
      : null;
    modelData.tpd = modelData.tpd !== null
      ? modelData.tpd + deltaUsage.tokens
      : null;

    await this.database.saveUsage(modelData);
    return modelData;
  }

  async getUsageOf(
    owner: string,
    name: string,
  ): Promise<z.infer<typeof modelUsageSchema>> {
    return (await this.database.getUsageOf(owner, name)) ??
      defaultModelUsage(name, owner);
  }

  getUsages(owner: string): Promise<z.infer<typeof modelUsageSchema>[]> {
    return this.database.getUsages(owner);
  }

  deleteowner(owner: string) {
    return this.database.removeUsagesOf(owner);
  }

  deleteUsage(owner: string, name: string) {
    return this.database.removeUsage(owner, name);
  }

  deleteUsages(owner: string, names: string[]) {
    return this.database.removeUsages(owner, names);
  }
}

export function defaultModelUsage(
  name: string,
  owner: string,
): z.infer<typeof modelUsageSchema> {
  const now = Math.floor(Date.now() / 1000);
  const modelData = modelList.getModel(name)!;
  return {
    id: crypto.randomUUID(),
    name: name,

    rpm: 0,
    rpd: 0,
    tpm: modelData.tpm === null ? null : 0,
    tpd: modelData.tpd === null ? null : 0,
    ash: modelData.ash === null ? null : 0,
    asd: modelData.asd === null ? null : 0,

    owner: owner,
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
    return defaultModelUsage(usage.name, usage.owner);
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
