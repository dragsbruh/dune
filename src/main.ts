import { Context, Hono } from "hono";

import env from "./env.ts";

import { DevDatabase, modelList } from "./database.ts";
import { defaultModelUsage, getRemaining, UsageTracker } from "./usage.ts";
import { selectorSchema, trackSchema } from "./apiSchema.ts";
import { sortByReference } from "./utils/sort.ts";

const app = new Hono();

const database = new DevDatabase();
const usageTracker = new UsageTracker(database);

app.get("/", (c) => {
  return c.text("Hello Hono!");
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
  const user = getAuth(c);
  if (user === null) {
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

  const modelData = await usageTracker.trackUsage(name, user, data.data);

  return c.json(modelData);
});

app.get("/models/:name/usage", async (c) => {
  const { name } = c.req.param();
  const user = getAuth(c);
  if (user === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }

  if (!modelList.validModel(name)) {
    return c.json({ error: "model not found" }, 400);
  }

  const modelData = await usageTracker.getUsageOf(user, name);

  return c.json(modelData);
});

app.delete("/models/:name/usage", async (c) => {
  const { name } = c.req.param();
  const user = getAuth(c);
  if (user === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }

  if (!modelList.validModel(name)) {
    return c.json({ error: "model not found" }, 400);
  }

  await usageTracker.deleteUsage(user, name);
  return c.json({ success: true });
});

app.get("/models/:name/remaining", async (c) => {
  const { name } = c.req.param();
  const user = getAuth(c);
  if (user === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }

  if (!modelList.validModel(name)) {
    return c.json({ error: "model not found" }, 400);
  }

  const modelUsage = await usageTracker.getUsageOf(user, name);
  return c.json(getRemaining(modelUsage));
});

app.get("/me", async (c) => {
  const user = getAuth(c);
  if (user === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }
  const usageData = await usageTracker.getUsages(user);
  return c.json(usageData);
});

app.delete("/me", async (c) => {
  const user = getAuth(c);
  if (user === null) {
    return c.json({ error: "invalid or missing authorization token" }, 401);
  }
  await usageTracker.deleteUser(user);
  return c.json({ success: true });
});

app.post("/select", async (c) => {
  const user = getAuth(c);
  if (user === null) {
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

  const usageData = await usageTracker.getUsages(user);
  const remainingUsages = chooseableModels.map((model) => {
    const usage = usageData.find((usage) => usage.name === model.name);
    return usage
      ? getRemaining(usage)
      : getRemaining(defaultModelUsage(model.name, user));
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
  return auth !== "" ? auth : null;
}

Deno.serve({
  port: env.PORT,
}, app.fetch);
