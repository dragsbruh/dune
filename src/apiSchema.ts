import { z } from "npm:zod";
import { modelList } from "./database.ts";

export const trackSchema = z.strictObject({
  requests: z.number().int().positive().default(1),
  tokens: z.number().int().positive(),
});

export const selectorSchema = z.strictObject({
  modelPriority: z.array(z.enum(
    modelList.getModels().map((model) => model.name) as [string, ...string[]],
  )).min(1).optional(),
  fallbackAll: z.boolean().default(false),
});
