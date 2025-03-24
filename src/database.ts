// deno-lint-ignore-file require-await
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js";

import { z } from "npm:zod";

export const modelDataSchema = z.strictObject({
  name: z.string(),
  rpm: z.number().int().positive(),
  rpd: z.number().int().positive(),
  tpm: z.number().int().positive().nullable(),
  tpd: z.number().int().positive().nullable(),
  ash: z.number().int().positive().nullable(),
  asd: z.number().int().positive().nullable(),
});

// usage done by the model
export const modelUsageSchema = modelDataSchema.extend({
  id: z.string().uuid(), // primary key
  lastDay: z.number().int().positive(), // seconds
  lastMinute: z.number().int().positive(), // seconds
  owner: z.string().uuid(),
});

export interface Database {
  saveUsage(model: z.infer<typeof modelUsageSchema>): Promise<void>;
  getUsages(owner: string): Promise<z.infer<typeof modelUsageSchema>[]>;
  getUsageOf(
    owner: string,
    name: string,
  ): Promise<z.infer<typeof modelUsageSchema> | null>;
  removeUsage(owner: string, name: string): Promise<void>;
  removeUsages(owner: string, names: string[]): Promise<void>;
  removeUsagesOf(owner: string): Promise<void>;
}

export class SupabaseDatabase implements Database {
  private supabase: SupabaseClient;
  public readonly tableName: string;
  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_KEY")!,
    );
    this.tableName = Deno.env.get("SUPABASE_TABLE_NAME")!;
  }

  async saveUsage(model: z.infer<typeof modelUsageSchema>): Promise<void> {
    const result = await this.supabase.from(this.tableName).upsert(model);
    if (result.error) {
      throw result.error;
    }
  }

  async getUsages(owner: string): Promise<z.infer<typeof modelUsageSchema>[]> {
    const result = await this.supabase.from(this.tableName).select("*").eq(
      "owner",
      owner,
    );
    if (result.error) {
      return [];
    }
    return await z.array(modelUsageSchema).parseAsync(result.data);
  }

  async getUsageOf(
    owner: string,
    name: string,
  ): Promise<z.infer<typeof modelUsageSchema> | null> {
    const result = await this.supabase.from(this.tableName).select("*").eq(
      "owner",
      owner,
    ).eq("name", name).limit(1).single();
    if (result.error) {
      return null;
    }
    return await modelUsageSchema.parseAsync(result.data);
  }

  async removeUsage(owner: string, name: string): Promise<void> {
    await this.supabase.from(this.tableName).delete().eq(
      "owner",
      owner,
    ).eq("name", name);
  }

  async removeUsages(owner: string, names: string[]): Promise<void> {
    await this.supabase.from(this.tableName).delete().eq(
      "owner",
      owner,
    ).in("name", names);
  }

  async removeUsagesOf(owner: string): Promise<void> {
    await this.supabase.from(this.tableName).delete().eq(
      "owner",
      owner,
    );
  }
}

export class DevDatabase implements Database {
  private usages: z.infer<typeof modelUsageSchema>[] = [];

  async saveUsage(model: z.infer<typeof modelUsageSchema>) {
    // update if already exists
    const existing = this.usages.find((usage) => usage.id === model.id);
    if (existing) {
      Object.assign(existing, model);
    } else {
      this.usages.push(model);
    }
  }

  async getUsageOf(owner: string, name: string) {
    return this.usages.find((model) =>
      model.owner === owner && model.name === name
    ) || null;
  }

  async getUsages(owner: string) {
    return this.usages.filter((model) => model.owner === owner);
  }

  async removeUsages(owner: string, names: string[]) {
    for (const name of names) {
      this.removeUsage(owner, name);
    }
  }

  async removeUsage(owner: string, name: string) {
    const index = this.usages.findIndex((model) =>
      model.owner === owner && model.name === name
    );
    if (index === -1) {
      return;
    }
    this.usages.splice(index, 1);
  }

  async removeUsagesOf(owner: string) {
    this.usages = this.usages.filter((model) => model.owner !== owner);
  }
}

class ModelList {
  private list: z.infer<typeof modelDataSchema>[] = [];
  constructor() {
    const data = Deno.readTextFileSync("./assets/models.json");
    this.list = modelDataSchema.array().parse(JSON.parse(data));
  }

  getModel(name: string) {
    return this.list.find((model) => model.name === name) || null;
  }

  getModels() {
    return this.list;
  }

  validModel(name: string) {
    return this.list.some((model) => model.name === name);
  }
}

export const modelList = new ModelList();
