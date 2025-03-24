import { Context, Hono } from "hono";
import { z } from "zod";

import env from "./env.ts";

import { modelList, SupabaseDatabase } from "./database.ts";
import { defaultModelUsage, getRemaining, UsageTracker } from "./usage.ts";
import { selectorSchema, trackSchema } from "./apiSchema.ts";
import { sortByReference } from "./utils/sort.ts";
import { duneText } from "./utils/dune.ts";

const app = new Hono();

const database = new SupabaseDatabase();
const usageTracker = new UsageTracker(database);

app.get("/", (c) => {
  return c.text(duneText);
});

app.get("/models", (c) => {
  const models = modelList.getModels();
  return c.json(models);
});

app.get("/models/:name", (c) => {
  const { name } = c.req.param();
  const model = modelList.getModel(name);
  if (!model) {
    return c.json({ error: "model not found" }, 400);
  }
  return c.json(model);
});

app.post("/models/:name/track", async (c) => {
  const { name } = c.req.param();
  const owner = getAuth(c);
  if (owner === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }

  if (!modelList.validModel(name)) {
    return c.json({ error: "model not found" }, 400);
  }

  const body = await c.req.json();
  const data = await trackSchema.safeParseAsync(body);
  if (!data.success) {
    return c.json({ error: data.error ?? "invalid request body" }, 400);
  }

  const modelData = await usageTracker.trackUsage(name, owner, data.data);

  return c.json(modelData);
});

app.get("/models/:name/usage", async (c) => {
  const { name } = c.req.param();
  const owner = getAuth(c);
  if (owner === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }

  if (!modelList.validModel(name)) {
    return c.json({ error: "model not found" }, 400);
  }

  const modelData = await usageTracker.getUsageOf(owner, name);

  return c.json(modelData);
});

app.delete("/models/:name/usage", async (c) => {
  const { name } = c.req.param();
  const owner = getAuth(c);
  if (owner === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }

  if (!modelList.validModel(name)) {
    return c.json({ error: "model not found" }, 400);
  }

  await usageTracker.deleteUsage(owner, name);
  return c.json({ success: true });
});

app.get("/models/:name/remaining", async (c) => {
  const { name } = c.req.param();
  const owner = getAuth(c);
  if (owner === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }

  if (!modelList.validModel(name)) {
    return c.json({ error: "model not found" }, 400);
  }

  const modelUsage = await usageTracker.getUsageOf(owner, name);
  return c.json(getRemaining(modelUsage));
});

app.get("/me", async (c) => {
  const owner = getAuth(c);
  if (owner === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }
  const usageData = await usageTracker.getUsages(owner);
  return c.json(usageData);
});

app.delete("/me", async (c) => {
  const owner = getAuth(c);
  if (owner === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }
  await usageTracker.deleteowner(owner);
  return c.json({ success: true });
});

app.post("/select", async (c) => {
  const owner = getAuth(c);
  if (owner === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }

  const body = await c.req.json();
  const data = await selectorSchema.safeParseAsync(body);
  if (!data.success) {
    return c.json({ error: data.error ?? "invalid request body" }, 400);
  }
  const { modelPriority, fallbackAll } = data.data;

  if (!modelPriority && fallbackAll === false) {
    return c.json({
      error:
        "modelPriority and fallbackAll cannot be both falsy. you cannot choose any model that way",
    }, 400);
  }

  let chooseableModels = modelList.getModels();
  if (modelPriority) {
    chooseableModels = sortByReference(chooseableModels, "name", modelPriority);
  }
  if (!fallbackAll) {
    chooseableModels = chooseableModels.filter((model) =>
      (modelPriority!).includes(model.name)
    );
  }

  const usageData = await usageTracker.getUsages(owner);
  const remainingUsages = chooseableModels.map((model) => {
    const usage = usageData.find((usage) => usage.name === model.name);
    return usage
      ? getRemaining(usage)
      : getRemaining(defaultModelUsage(model.name, owner));
  }).filter((usage) => {
    return (
      usage.rpm > 0 &&
      usage.rpd > 0 &&
      (usage.tpm === null || usage.tpm > 0) &&
      (usage.tpd === null || usage.tpd > 0) &&
      (usage.ash === null || usage.ash > 0) &&
      (usage.asd === null || usage.asd > 0)
    );
  });

  return c.json(remainingUsages);
});

function getAuth(c: Context) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const auth = authHeader.split(" ")[1].trim();
  return z.string().uuid().safeParse(auth).success ? auth : null;
}

Deno.serve({
  port: env.PORT,
}, app.fetch);
