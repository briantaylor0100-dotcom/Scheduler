export const TIME_ZONE = "America/Chicago";
export const STORE_OPEN_HOUR = 10;
export const STORE_CLOSE_HOUR = 22;
export const EARLY_SPLIT = 0.44;
export const SALES_CAPACITY = process.env.SALES_CAPACITY === undefined || process.env.SALES_CAPACITY.trim() === ""
  ? 220
  : Number(process.env.SALES_CAPACITY);
if (!Number.isFinite(SALES_CAPACITY) || SALES_CAPACITY <= 0) {
  throw new Error("SALES_CAPACITY must be a positive finite number.");
}

export const EMPLOYEES = [
  { id: "maya", name: "Maya Chen", type: "Full-time", cap: 40, availability: [0, 1, 2, 3, 4] },
  { id: "eli", name: "Eli Brooks", type: "Full-time", cap: 40, availability: [1, 2, 3, 4, 5] },
  { id: "sofia", name: "Sofia Ramirez", type: "Full-time", cap: 40, availability: [2, 3, 4, 5, 6] },
  { id: "noah", name: "Noah Patel", type: "Full-time", cap: 40, availability: [0, 1, 4, 5, 6] },
  { id: "ava", name: "Ava Wilson", type: "Part-time", cap: 30, availability: [0, 1, 2, 3, 4, 5, 6] },
  { id: "leo", name: "Leo Martin", type: "Part-time", cap: 30, availability: [0, 1, 2, 3, 4, 5, 6] },
  { id: "zoe", name: "Zoe Thompson", type: "Part-time", cap: 30, availability: [0, 1, 2, 3, 4, 5, 6] },
  { id: "jack", name: "Jack Rivera", type: "Part-time", cap: 30, availability: [0, 1, 2, 3, 4, 5, 6] },
].map((employee) => ({ ...employee, maxDays: 5 }));

function salesDataError(message) {
  const error = new Error(message);
  error.name = "SalesDataError";
  return error;
}

export function isValidDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

export function mondayOf(date) {
  if (!isValidDate(date)) throw new Error("Week must be a valid YYYY-MM-DD date.");
  const day = new Date(`${date}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export function addDays(date, amount) {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

export function chicagoToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function parseSalesContent(content) {
  let rows;
  const trimmed = content.trim();
  try {
    rows = trimmed.startsWith("[")
      ? JSON.parse(trimmed)
      : trimmed.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    throw salesDataError(`Sales data is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(rows)) throw salesDataError("Sales data must be a JSON array or JSON Lines records.");
  const seen = new Set();
  return rows.map((row, index) => {
    if (!row || !isValidDate(row.date)) {
      throw salesDataError(`Sales record ${index + 1} must have a valid YYYY-MM-DD date.`);
    }
    if (seen.has(row.date)) throw salesDataError(`Duplicate sales date: ${row.date}.`);
    if (typeof row.sales !== "number" || !Number.isFinite(row.sales) || row.sales < 0) {
      throw salesDataError(`Sales for ${row.date} must be a non-negative number.`);
    }
    seen.add(row.date);
    return { date: row.date, sales: row.sales };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function forecastWeek(sales, weekStart, capacity = SALES_CAPACITY) {
  const daily = [];
  for (let index = 0; index < 7; index += 1) {
    const date = addDays(weekStart, index);
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const observations = sales
      .filter((record) => record.date < weekStart
        && new Date(`${record.date}T00:00:00.000Z`).getUTCDay() === weekday)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
    const forecast = observations.length >= 4
      ? observations.reduce((sum, record, observationIndex) => (
        sum + record.sales * (observations.length - observationIndex)
      ), 0) / observations.reduce((sum, _record, observationIndex) => (
        sum + observations.length - observationIndex
      ), 0)
      : null;
    const earlySales = forecast === null ? null : forecast * EARLY_SPLIT;
    const eveningSales = forecast === null ? null : forecast * (1 - EARLY_SPLIT);
    daily.push({
      date,
      forecastSales: forecast,
      earlySales,
      eveningSales,
      earlyRequired: earlySales === null ? null : Math.ceil(earlySales / (6 * capacity)),
      eveningRequired: eveningSales === null ? null : Math.ceil(eveningSales / (6 * capacity)),
      observations: observations.length,
    });
  }
  return {
    weekStart,
    daily,
    total: daily.every((day) => day.forecastSales !== null)
      ? daily.reduce((sum, day) => sum + day.forecastSales, 0)
      : null,
    complete: daily.every((day) => day.forecastSales !== null),
  };
}

function makeWeekSchedule(demand, employees, previousShiftEnd) {
  const shifts = [];
  const stats = new Map(employees.map((person) => [person.id, {
    hours: 0,
    days: new Set(),
    shifts: [],
  }]));
  const daily = demand.daily.map((day) => ({ ...day, earlyAssigned: 0, eveningAssigned: 0 }));

  for (const day of daily) {
    const dayIndex = new Date(`${day.date}T00:00:00.000Z`).getUTCDay();
    for (const block of [
      { name: "early", required: day.earlyRequired, start: 10, end: 16 },
      { name: "evening", required: day.eveningRequired, start: 16, end: 22 },
    ]) {
      if (block.required === null) continue;
      for (let slot = 0; slot < block.required; slot += 1) {
        const eligible = employees.filter((person) => {
          const personStats = stats.get(person.id);
          const lastEnd = previousShiftEnd.get(person.id);
          const shiftStart = Date.parse(`${day.date}T${String(block.start).padStart(2, "0")}:00:00Z`);
          const rested = lastEnd === undefined || shiftStart - lastEnd >= 11 * 60 * 60 * 1000;
          return person.availability.includes(dayIndex)
            && (block.name !== "early" || person.type === "Full-time")
            && personStats.hours + 6 <= person.cap
            && personStats.days.size < person.maxDays
            && !personStats.days.has(day.date)
            && rested;
        }).sort((a, b) => {
          if (block.name === "evening" && a.type !== b.type) return a.type === "Part-time" ? -1 : 1;
          const left = stats.get(a.id);
          const right = stats.get(b.id);
          return left.hours - right.hours
            || left.days.size - right.days.size
            || a.name.localeCompare(b.name);
        });
        const person = eligible[0];
        if (!person) continue;
        const shift = {
          employeeId: person.id,
          employeeName: person.name,
          date: day.date,
          start: `${String(block.start).padStart(2, "0")}:00`,
          end: `${String(block.end).padStart(2, "0")}:00`,
          block: block.name,
        };
        shifts.push(shift);
        const personStats = stats.get(person.id);
        personStats.hours += 6;
        personStats.days.add(day.date);
        personStats.shifts.push(shift);
        previousShiftEnd.set(person.id, Date.parse(`${day.date}T${String(block.end).padStart(2, "0")}:00:00Z`));
        if (block.name === "early") day.earlyAssigned += 1;
        else day.eveningAssigned += 1;
      }
    }
    day.earlyGap = day.earlyRequired === null ? null : day.earlyRequired - day.earlyAssigned;
    day.eveningGap = day.eveningRequired === null ? null : day.eveningRequired - day.eveningAssigned;
  }
  return { shifts, daily, stats };
}

export function generateSchedule(sales, weekStart, capacity = SALES_CAPACITY) {
  const priorWeek = addDays(weekStart, -7);
  const previousDemand = forecastWeek(sales, priorWeek, capacity);
  const shiftEnds = new Map();
  makeWeekSchedule(previousDemand, EMPLOYEES, shiftEnds);
  const forecast = forecastWeek(sales, weekStart, capacity);
  const result = makeWeekSchedule(forecast, EMPLOYEES, shiftEnds);
  const employees = EMPLOYEES.map((person) => {
    const stats = result.stats.get(person.id);
    return {
      id: person.id,
      name: person.name,
      type: person.type,
      cap: person.cap,
      maxDays: person.maxDays,
      availability: person.availability,
      scheduledHours: stats.hours,
      scheduledDays: stats.days.size,
      shifts: stats.shifts,
    };
  });
  const gaps = result.daily.reduce((sum, day) => (
    sum + (day.earlyGap ?? 0) + (day.eveningGap ?? 0)
  ), 0);
  const unknownBlocks = result.daily.filter((day) => (
    day.earlyRequired === null || day.eveningRequired === null
  )).length;
  return {
    weekStart,
    forecast,
    daily: result.daily,
    shifts: result.shifts.map((shift) => ({
      ...shift,
      weeklyHours: employees.find((person) => person.id === shift.employeeId).scheduledHours,
    })),
    employees,
    scheduledHours: result.shifts.length * 6,
    gaps,
    unknownBlocks,
    sampleData: false,
    isDraft: true,
  };
}

export function buildWeeklySummary(sales, weekStart, forecast, sampleData, today = chicagoToday()) {
  const end = addDays(weekStart, 7);
  const through = today < weekStart ? weekStart : today < end ? addDays(today, 1) : end;
  const currentRows = sales.filter((record) => record.date >= weekStart && record.date < through);
  const currentSales = currentRows.reduce((sum, record) => sum + record.sales, 0);
  const priorStart = addDays(weekStart, -7);
  const daysCovered = Math.max(0, Math.min(7, (Date.parse(`${through}T00:00:00Z`) - Date.parse(`${weekStart}T00:00:00Z`)) / 86400000));
  const priorEnd = addDays(priorStart, daysCovered);
  const priorSalesRows = sales.filter((record) => record.date >= priorStart && record.date < priorEnd);
  const priorSales = priorSalesRows.reduce((sum, record) => sum + record.sales, 0);
  const change = priorSales > 0 && currentRows.length === daysCovered && priorSalesRows.length === daysCovered
    ? ((currentSales - priorSales) / priorSales) * 100
    : null;
  const trend = Array.from({ length: 6 }, (_unused, index) => {
    const start = addDays(weekStart, (index - 5) * 7);
    const next = addDays(start, 7);
    const value = start === weekStart
      ? forecast.total
      : sales.filter((record) => record.date >= start && record.date < next && record.date <= today)
        .reduce((sum, record) => sum + record.sales, 0);
    return { weekStart: start, sales: value, forecast: start === weekStart };
  });
  return {
    store: { name: "Brian’s Grocery", location: "Illinois, USA", timeZone: TIME_ZONE, currency: "USD" },
    weekStart,
    weeklySales: currentSales,
    changePercent: change,
    forecastSales: forecast.total,
    forecastComplete: forecast.complete,
    trend,
    sampleData,
  };
}

export function getPromotions(today = chicagoToday()) {
  const monday = mondayOf(today);
  return [
    { id: "produce", title: "Fresh-picked favorites", detail: "Save on select seasonal produce", offer: "20% off", startsOn: monday, endsOn: addDays(monday, 13), accent: "mint" },
    { id: "pantry", title: "Pantry restock", detail: "Mix and match pantry essentials", offer: "Buy 2, save $3", startsOn: addDays(monday, -3), endsOn: addDays(monday, 10), accent: "peach" },
    { id: "bakery", title: "Weekend bakery treat", detail: "Fresh-baked breads and pastries", offer: "$1 off", startsOn: addDays(monday, 4), endsOn: addDays(monday, 6), accent: "lilac" },
  ];
}
