import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { addDays, chicagoToday, mondayOf } from "../server/scheduler.js";
import { app } from "../server/index.js";

test("API returns safe aggregates and schedule details without raw sales records", async (context) => {
  const server = app.listen(0, "127.0.0.1");
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const week = mondayOf(chicagoToday());
  const response = await fetch(`${base}/api/schedule?week=${week}`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.summary.store.currency, "USD");
  assert.equal(payload.forecast.weekStart, week);
  assert.equal(payload.daily.length, 7);
  assert.equal(payload.employees.length, 8);
  assert.equal(payload.isDraft, true);
  const containsRawRecord = (value) => {
    if (Array.isArray(value)) return value.some(containsRawRecord);
    if (!value || typeof value !== "object") return false;
    const keys = Object.keys(value).sort();
    if (keys.length === 2 && keys[0] === "date" && keys[1] === "sales") return true;
    return Object.values(value).some(containsRawRecord);
  };
  assert.equal(containsRawRecord(payload), false);
  assert.equal("records" in payload, false);
  assert.ok(payload.summary.trend.every((point) => (
    Object.keys(point).sort().join(",") === "forecast,sales,weekStart"
  )));

  const invalid = await fetch(`${base}/api/schedule?week=not-a-date`);
  assert.equal(invalid.status, 400);
  const invalidBody = await invalid.json();
  assert.match(invalidBody.error, /valid YYYY-MM-DD/);
  const generate = await fetch(`${base}/api/schedule/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ week: addDays(week, 2) }),
  });
  assert.equal(generate.status, 200);
  assert.equal((await generate.json()).weekStart, week);

  const originalPath = process.env.SALES_DATA_PATH;
  process.env.SALES_DATA_PATH = `${process.cwd()}\\missing-sales-${Date.now()}.json`;
  try {
    const missingData = await fetch(`${base}/api/schedule?week=${week}`);
    assert.equal(missingData.status, 500);
    assert.match((await missingData.json()).error, /SALES_DATA_PATH/);
  } finally {
    if (originalPath === undefined) delete process.env.SALES_DATA_PATH;
    else process.env.SALES_DATA_PATH = originalPath;
  }
});
