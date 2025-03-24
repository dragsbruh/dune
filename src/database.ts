// deno-lint-ignore-file require-await
// import { SupabaseClient, createClient } from 'npm:@supabase/supabase-js'

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
  user: z.string().uuid(),
});

export interface Database {
  saveModel(model: z.infer<typeof modelUsageSchema>): Promise<void>;
  getUsages(user: string): Promise<z.infer<typeof modelUsageSchema>[]>;
  getUsageOf(user: string, name: string): Promise<z.infer<typeof modelUsageSchema> | null>;
  removeUsage(user: string, name: string): Promise<void>;
  removeUsages(user: string, names: string[]): Promise<void>;
  removeUsagesOf(user: string): Promise<void>;
}

// export class SupabaseDatabase implements Database {
//   private supabase: SupabaseClient
//   constructor() {
//     this.supabase = createClient(
//       Deno.env.get('SUPABASE_URL')!,
//       Deno.env.get('SUPABASE_KEY')!,
//     )
//   }
// }

export class DevDatabase implements Database {
  private usages: z.infer<typeof modelUsageSchema>[] = [];

  async saveModel(model: z.infer<typeof modelUsageSchema>) {
    // update if already exists
    const existing = this.usages.find((usage) => usage.id === model.id);
    if (existing) {
      Object.assign(existing, model);
    } else {
      this.usages.push(model);
    }
  }

  async getUsageOf(user: string, name: string) {
    return this.usages.find((model) => model.user === user && model.name === name) || null;
  }

  async getUsages(user: string) {
    return this.usages.filter((model) => model.user === user);
  }

  async removeUsages(user: string, names: string[]) {
    for (const name of names) {
      this.removeUsage(user, name);
    }
  }
  
  async removeUsage(user: string, name: string) {
    const index = this.usages.findIndex((model) => model.user === user && model.name === name);
    if (index === -1) {
      return;
    }
    this.usages.splice(index, 1);
  }

  async removeUsagesOf(user: string) {
    this.usages = this.usages.filter((model) => model.user !== user);
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
