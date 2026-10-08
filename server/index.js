import express from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SALES_CAPACITY,
  addDays,
  buildWeeklySummary,
  chicagoToday,
  forecastWeek,
  generateSchedule,
  getPromotions,
  mondayOf,
  parseSalesContent,
} from "./scheduler.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const here = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(here, "../dist");
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

function sampleSales() {
  const today = chicagoToday();
  const currentMonday = mondayOf(today);
  const daysElapsed = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${currentMonday}T00:00:00Z`)) / 86400000;
  const records = [];
  for (let offset = -84; offset <= daysElapsed; offset += 1) {
    const date = addDays(currentMonday, offset);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekNumber = Math.floor((offset + 84) / 7);
    const weekdayBase = [4750, 4450, 4620, 4920, 5850, 7350, 6520][weekday];
    const trend = weekNumber * 45;
    const variation = ((weekNumber * 29 + weekday * 17) % 11 - 5) * 62;
    records.push({ date, sales: Math.max(900, Math.round(weekdayBase + trend + variation)) });
  }
  return records;
}

async function loadSales() {
  if (!process.env.SALES_DATA_PATH) return { records: sampleSales(), sampleData: true };
  const configuredPath = path.resolve(process.env.SALES_DATA_PATH);
  let contents;
  try {
    contents = await readFile(configuredPath, "utf8");
  } catch {
    const error = new Error("The configured sales file could not be read. Check SALES_DATA_PATH and file permissions.");
    error.name = "SalesDataError";
    throw error;
  }
  return { records: parseSalesContent(contents), sampleData: false };
}

function readWeek(input) {
  const date = input || chicagoToday();
  return mondayOf(date);
}

async function getSchedulePayload(week) {
  const data = await loadSales();
  const schedule = generateSchedule(data.records, week);
  const summary = buildWeeklySummary(data.records, week, schedule.forecast, data.sampleData);
  return {
    ...schedule,
    summary,
    promotions: getPromotions(),
    policy: {
      salesCapacity: SALES_CAPACITY,
      open: "10:00",
      close: "22:00",
      earlySplitPercent: 44,
      eveningSplitPercent: 56,
      splitAssumption: "Hourly sales are unavailable; forecast demand is assumed to split 44% from 10:00–16:00 and 56% from 16:00–22:00.",
      forecasting: "Each weekday uses up to six prior matching weekdays, with more recent observations weighted more heavily. At least four observations are required. Only sales before this forecast week are used.",
    },
  };
}

app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

app.get("/api/schedule", async (request, response, next) => {
  try {
    response.json(await getSchedulePayload(readWeek(request.query.week)));
  } catch (error) {
    next(error);
  }
});

app.post("/api/schedule/generate", async (request, response, next) => {
  try {
    response.json(await getSchedulePayload(readWeek(request.body?.week)));
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_request, response) => response.status(404).json({ error: "API route not found." }));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath, { index: false }));
  app.get("*", (_request, response) => response.sendFile(path.join(distPath, "index.html")));
}

app.use((error, _request, response, _next) => {
  const clientError = error instanceof SyntaxError || /valid YYYY-MM-DD/.test(error.message);
  if (!clientError && error.name !== "SalesDataError") console.error(error);
  response.status(clientError ? 400 : 500).json({
    error: clientError || error.name === "SalesDataError"
      ? error.message
      : "Unable to load sales and schedule data.",
  });
});

export function startServer() {
  return app.listen(port, "0.0.0.0", () => {
    console.log(`Brian’s Awesome Scheduler listening on port ${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}

export { app };
