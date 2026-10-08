import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  forecastWeek,
  generateSchedule,
  parseSalesContent,
} from "../server/scheduler.js";

function regularSales(start, weeks = 12, amount = 4500) {
  return Array.from({ length: weeks * 7 }, (_unused, index) => ({
    date: addDays(start, index),
    sales: amount + (index % 7) * 120,
  }));
}

test("higher sales never reduce calculated staffing demand", () => {
  const baseline = regularSales("2026-01-05", 8, 1000);
  const higher = baseline.map((record) => ({ ...record, sales: record.sales * 3 }));
  const first = forecastWeek(baseline, "2026-03-02");
  const second = forecastWeek(higher, "2026-03-02");
  for (let day = 0; day < 7; day += 1) {
    assert.ok(second.daily[day].earlyRequired >= first.daily[day].earlyRequired);
    assert.ok(second.daily[day].eveningRequired >= first.daily[day].eveningRequired);
  }
});

test("forecast ignores future observations and needs four matching weekdays", () => {
  const history = regularSales("2026-01-05", 4, 1000);
  const before = forecastWeek(history, "2026-02-02");
  const withFuture = forecastWeek([
    ...history,
    ...regularSales("2026-02-02", 4, 100000),
  ], "2026-02-02");
  assert.equal(before.complete, true);
  assert.deepEqual(withFuture.daily.map((day) => day.forecastSales), before.daily.map((day) => day.forecastSales));
  assert.equal(forecastWeek(history.slice(7), "2026-02-02").complete, false);
});

test("schedule respects caps, weekday availability, one shift a day and rest periods", () => {
  const sales = regularSales("2026-01-05", 14, 18000);
  const result = generateSchedule(sales, "2026-04-06");
  for (const employee of result.employees) {
    assert.ok(employee.scheduledHours <= employee.cap);
    assert.ok(employee.scheduledDays <= 5);
    const personShifts = result.shifts.filter((shift) => shift.employeeId === employee.id);
    const byDate = new Set(personShifts.map((shift) => shift.date));
    assert.equal(byDate.size, personShifts.length);
    for (const shift of personShifts) {
      const weekday = new Date(`${shift.date}T00:00:00Z`).getUTCDay();
      assert.ok(employee.availability.includes(weekday));
      if (employee.type === "Part-time") {
        assert.ok(shift.start >= "16:00");
        assert.ok(shift.end <= "22:00");
      }
    }
    for (let index = 1; index < personShifts.length; index += 1) {
      const priorEnd = Date.parse(`${personShifts[index - 1].date}T${personShifts[index - 1].end}:00Z`);
      const nextStart = Date.parse(`${personShifts[index].date}T${personShifts[index].start}:00Z`);
      assert.ok(nextStart - priorEnd >= 11 * 60 * 60 * 1000);
    }
  }
});

test("unfillable demand remains a visible gap rather than an illegal assignment", () => {
  const hugeDemand = regularSales("2026-01-05", 12, 800000);
  const result = generateSchedule(hugeDemand, "2026-03-30");
  assert.ok(result.gaps > 0);
  assert.ok(result.employees.every((employee) => employee.scheduledHours <= employee.cap));
});

test("sales records reject invalid dates, duplicate dates and invalid sales values", () => {
  assert.throws(() => parseSalesContent('[{"date":"2026-02-30","sales":1}]'), /valid YYYY-MM-DD/);
  assert.throws(() => parseSalesContent('[{"date":"2026-02-01","sales":1},{"date":"2026-02-01","sales":2}]'), /Duplicate/);
  assert.throws(() => parseSalesContent('[{"date":"2026-02-01","sales":-1}]'), /non-negative number/);
  assert.throws(() => parseSalesContent('[{"date":"2026-02-01","sales":"12"}]'), /non-negative number/);
});
