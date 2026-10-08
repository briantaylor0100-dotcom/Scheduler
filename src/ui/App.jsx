import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  FileSpreadsheet,
  House,
  Info,
  Menu,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: House },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "insights", label: "Sales & insights", icon: BarChart3 },
  { id: "team", label: "Team", icon: UsersRound },
  { id: "promotions", label: "Promotions", icon: BadgePercent },
  { id: "rules", label: "Scheduling rules", icon: Settings2 },
];
const STORE_ZONE = "America/Chicago";
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateAtNoon(date) {
  return new Date(`${date}T12:00:00Z`);
}

function formatDate(date, options = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: STORE_ZONE }).format(dateAtNoon(date));
}

function formatWeekday(date, options = { weekday: "short" }) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: STORE_ZONE }).format(dateAtNoon(date));
}

function addDays(date, amount) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

function currentMonday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (name) => parts.find((part) => part.type === name).value;
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function chicagoTodayISO() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (name) => parts.find((part) => part.type === name).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function chicagoToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_ZONE, year: "numeric", month: "long", day: "numeric", weekday: "long",
  }).formatToParts(new Date());
  const get = (name) => parts.find((part) => part.type === name).value;
  return `${get("weekday").toUpperCase()}, ${get("month").toUpperCase()} ${get("day")}`;
}

function weekLabel(weekStart) {
  const end = addDays(weekStart, 6);
  return `${formatDate(weekStart, { month: "short", day: "numeric" })} – ${formatDate(end, { month: "short", day: "numeric", year: "numeric" })}`;
}

function weekDayName(date) {
  return DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function dayAvailability(days) {
  return days.map((day) => DAY_NAMES[day]).join(", ");
}

function Mascot() {
  return (
    <svg className="mascot" viewBox="0 0 120 132" role="img" aria-label="Brian, smiling grocery clerk mascot">
      <ellipse cx="60" cy="124" rx="37" ry="6" fill="#d9e5f2" />
      <path d="M24 123c1-27 14-40 36-40s35 13 36 40" fill="#2870dc" />
      <path d="M42 91 60 108l18-17 7 32H35z" fill="#fff" />
      <rect x="48" y="102" width="25" height="13" rx="3" fill="#fff" stroke="#dce7f3" />
      <text x="60.5" y="111.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#2870dc">BRIAN</text>
      <path d="M48 81v13l12 12 12-12V81" fill="#f5c89e" />
      <ellipse cx="60" cy="49" rx="37" ry="39" fill="#f5c89e" />
      <path d="M24 46C25 20 41 8 61 10c22 1 35 16 35 38-7-4-11-10-13-18-12 8-31 11-56 8z" fill="#583c34" />
      <path d="M30 33c7-15 20-22 35-20 11 1 20 8 25 17-17-5-39-3-60 3" fill="#65463a" />
      <ellipse cx="47" cy="50" rx="3" ry="4" fill="#313b4b" />
      <ellipse cx="73" cy="50" rx="3" ry="4" fill="#313b4b" />
      <path d="M44 65c9 11 23 12 33-1" fill="none" stroke="#a64d3e" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 66c8 4 19 5 29-1-5 10-20 12-29 1" fill="#fff" />
      <circle cx="38" cy="60" r="5" fill="#ef9c89" opacity=".42" />
      <circle cx="82" cy="60" r="5" fill="#ef9c89" opacity=".42" />
      <path d="M41 43c4-3 8-3 12 0M67 43c4-3 8-3 12 0" fill="none" stroke="#583c34" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SalesTrend({ trend }) {
  const values = trend.map((item) => item.sales).filter((value) => Number.isFinite(value));
  if (!values.length) return <div className="empty-chart">A sales trend will appear when enough sales data is available.</div>;
  const width = 680;
  const height = 218;
  const left = 46;
  const right = 18;
  const top = 16;
  const bottom = 36;
  const max = Math.max(...values, 1) * 1.18;
  const points = trend.map((item, index) => ({
    ...item,
    x: left + (index * (width - left - right)) / Math.max(trend.length - 1, 1),
    y: height - bottom - ((item.sales ?? 0) / max) * (height - top - bottom),
  }));
  const path = points.filter((point) => point.sales !== null).map((point, index) => (
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
  )).join(" ");
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="sales-chart" role="img" aria-label="Six-week sales trend in US dollars">
        {[0, 0.5, 1].map((fraction) => {
          const y = top + fraction * (height - top - bottom);
          const value = max * (1 - fraction);
          return (
            <g key={fraction}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e8eef5" strokeDasharray="4 5" />
              <text x={left - 8} y={y + 4} textAnchor="end" className="chart-axis">{USD.format(value / 1000)}k</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.weekStart}>
            <circle cx={point.x} cy={point.y} r={point.forecast ? 5 : 4} fill={point.forecast ? "#fff" : "#3b82f6"} stroke="#3b82f6" strokeWidth="2.5">
              <title>{`${point.forecast ? "Forecast" : "Sales"} for week of ${formatDate(point.weekStart, { month: "long", day: "numeric", year: "numeric" })}: ${point.sales === null ? "not available" : USD.format(point.sales)}`}</title>
            </circle>
            <text x={point.x} y={height - 10} textAnchor="middle" className="chart-axis">
              {formatDate(point.weekStart, { month: "numeric", day: "numeric" })}
            </text>
          </g>
        ))}
      </svg>
      <div className="chart-legend"><span className="legend-dot" /> Weekly sales <span className="legend-ring" /> Selected week forecast</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone = "blue", trend }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={18} strokeWidth={2} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">
        {trend === "up" && <ArrowUpRight size={14} className="trend-up" />}
        {trend === "down" && <ArrowDownRight size={14} className="trend-down" />}
        {detail}
      </div>
    </article>
  );
}

function shiftKey(shift) {
  return `${shift.employeeId}-${shift.date}-${shift.start}`;
}

function refreshSchedule(payload, shifts) {
  const hoursByEmployee = new Map(payload.employees.map((employee) => [employee.id, 0]));
  const shiftsByEmployee = new Map(payload.employees.map((employee) => [employee.id, []]));
  const daily = payload.daily.map((day) => ({ ...day, earlyAssigned: 0, eveningAssigned: 0 }));
  const dayByDate = new Map(daily.map((day) => [day.date, day]));

  shifts.forEach((shift) => {
    hoursByEmployee.set(shift.employeeId, (hoursByEmployee.get(shift.employeeId) ?? 0) + 6);
    shiftsByEmployee.get(shift.employeeId)?.push(shift);
    const day = dayByDate.get(shift.date);
    if (day) day[shift.block === "early" ? "earlyAssigned" : "eveningAssigned"] += 1;
  });
  daily.forEach((day) => {
    day.earlyGap = day.earlyRequired === null ? null : Math.max(0, day.earlyRequired - day.earlyAssigned);
    day.eveningGap = day.eveningRequired === null ? null : Math.max(0, day.eveningRequired - day.eveningAssigned);
  });
  const employees = payload.employees.map((employee) => {
    const employeeShifts = shiftsByEmployee.get(employee.id) ?? [];
    return { ...employee, scheduledHours: hoursByEmployee.get(employee.id) ?? 0, scheduledDays: new Set(employeeShifts.map((shift) => shift.date)).size, shifts: employeeShifts };
  });
  const enrichedShifts = shifts.map((shift) => ({ ...shift, weeklyHours: hoursByEmployee.get(shift.employeeId) ?? 0 }));
  const knownRequired = daily.reduce((total, day) => total + (day.earlyRequired ?? 0) + (day.eveningRequired ?? 0), 0);
  const filledSlots = daily.reduce((total, day) => total
    + (day.earlyRequired === null ? 0 : Math.min(day.earlyAssigned, day.earlyRequired))
    + (day.eveningRequired === null ? 0 : Math.min(day.eveningAssigned, day.eveningRequired)), 0);
  const overstaffedSlots = daily.reduce((total, day) => total
    + (day.earlyRequired === null ? 0 : Math.max(0, day.earlyAssigned - day.earlyRequired))
    + (day.eveningRequired === null ? 0 : Math.max(0, day.eveningAssigned - day.eveningRequired)), 0);
  const gaps = knownRequired - filledSlots;
  return {
    ...payload,
    daily,
    employees,
    shifts: enrichedShifts,
    scheduledHours: enrichedShifts.length * 6,
    gaps,
    coverage: { requiredSlots: knownRequired, filledSlots, overstaffedSlots, percent: knownRequired ? Math.round(filledSlots / knownRequired * 100) : null },
  };
}

function ShiftDialog({ shift, onClose, onRemove }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (shift) dialog.current?.showModal();
  }, [shift]);
  return (
    <dialog ref={dialog} className="modal" aria-label="Shift details" onClose={onClose}>
      {shift && (
        <div className="modal-content">
          <div className="modal-top"><div className="modal-icon"><Clock3 size={19} /></div><button className="icon-button" type="button" aria-label="Close shift details" onClick={() => dialog.current?.close()}><X size={18} /></button></div>
          <h2>Shift details</h2>
          <p className="muted">A draft shift at Brian’s Grocery.</p>
          <dl className="shift-detail-list">
            <div><dt>Employee</dt><dd>{shift.employeeName}</dd></div>
            <div><dt>Date</dt><dd>{formatDate(shift.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</dd></div>
            <div><dt>Time</dt><dd>{shift.start}–{shift.end}</dd></div>
            <div><dt>Weekly hours</dt><dd>{shift.weeklyHours} hours</dd></div>
          </dl>
          <div className="modal-actions"><button className="button button-danger" type="button" onClick={() => { onRemove(shift); dialog.current?.close(); }}><Trash2 size={15} />Remove shift</button><button className="button button-primary" type="button" onClick={() => dialog.current?.close()}>Done</button></div>
        </div>
      )}
    </dialog>
  );
}

function AddShiftDialog({ open, employees, days, onClose, onAdd }) {
  const dialog = useRef(null);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [block, setBlock] = useState("early");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
    if (open) { setEmployeeId(employees[0]?.id ?? ""); setDate(days[0]?.date ?? ""); setBlock("early"); setMessage(""); }
  }, [open, employees, days]);
  const submit = (event) => {
    event.preventDefault();
    const result = onAdd({ employeeId, date, block });
    if (result) setMessage(result);
    else dialog.current?.close();
  };
  return <dialog ref={dialog} className="modal" aria-label="Add shift" onClose={onClose}>
    <form className="modal-content shift-form" onSubmit={submit}>
      <div className="modal-top"><div className="modal-icon"><Plus size={19} /></div><button className="icon-button" type="button" aria-label="Close add shift" onClick={() => dialog.current?.close()}><X size={18} /></button></div>
      <h2>Add shift</h2><p className="muted">Draft changes update coverage immediately and remain only for this session.</p>
      <label>Employee<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.type}</option>)}</select></label>
      <label>Date<select value={date} onChange={(event) => setDate(event.target.value)}>{days.map((day) => <option key={day.date} value={day.date}>{formatDate(day.date, { weekday: "long", month: "short", day: "numeric" })}</option>)}</select></label>
      <label>Shift<select value={block} onChange={(event) => setBlock(event.target.value)}><option value="early">Opening · 10:00–16:00</option><option value="evening">Evening · 16:00–22:00</option></select></label>
      {message && <p className="form-error" role="alert">{message}</p>}
      <div className="modal-actions"><button className="button button-small" type="button" onClick={() => dialog.current?.close()}>Cancel</button><button className="button button-primary" type="submit"><Plus size={15} />Add shift</button></div>
    </form>
  </dialog>;
}

function RulesDialog({ open, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  return (
    <dialog ref={dialog} className="modal rules-modal" aria-label="Scheduling rules" onClose={onClose}>
      <div className="modal-content">
        <div className="modal-top"><div className="modal-icon"><Settings2 size={19} /></div><button className="icon-button" type="button" aria-label="Close scheduling rules" onClick={() => dialog.current?.close()}><X size={18} /></button></div>
        <h2>Scheduling rules</h2>
        <p className="muted">The draft generator follows these store-provided limits. This prototype does not claim complete legal compliance.</p>
        <div className="rules-group"><h3>Full-time · 4 team members</h3><ul><li>Up to 8 hours per day and 40 hours per week</li><li>Up to 5 working days per week</li><li>Available for 10:00–16:00 or 16:00–22:00 shifts</li></ul></div>
        <div className="rules-group"><h3>Part-time · 4 team members</h3><ul><li>Available Monday through Sunday, subject to each person’s availability</li><li>Evening shifts only: 16:00–22:00</li><li>Up to 30 hours and 5 working days per week</li></ul></div>
        <div className="rules-group"><h3>Everyone</h3><ul><li>At least 11 hours between shifts; no overlapping shifts</li><li>At most one 6-hour shift per person per day</li><li>Weekly caps and availability are never overridden to fill a gap</li></ul></div>
        <p className="compliance-note"><CircleAlert size={16} /> Additional Illinois requirements need separate verification before real-world use.</p>
        <button className="button button-primary modal-done" type="button" onClick={() => dialog.current?.close()}>Got it</button>
      </div>
    </dialog>
  );
}

function App() {
  const [week, setWeek] = useState(currentMonday);
  const [page, setPage] = useState("overview");
  const [viewMode, setViewMode] = useState("employee");
  const [search, setSearch] = useState("");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selectedShift, setSelectedShift] = useState(null);
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const load = useCallback(async (targetWeek, recalculate = false) => {
    setError("");
    if (recalculate) setGenerating(true);
    else setLoading(true);
    try {
      const response = await fetch(recalculate ? "/api/schedule/generate" : `/api/schedule?week=${targetWeek}`, {
        method: recalculate ? "POST" : "GET",
        headers: recalculate ? { "Content-Type": "application/json" } : undefined,
        body: recalculate ? JSON.stringify({ week: targetWeek }) : undefined,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load this week.");
      setPayload(result);
    } catch (loadError) {
      setError(loadError.message);
      setPayload(null);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, []);

  useEffect(() => { load(week); }, [week, load]);

  const changeWeek = (amount) => setWeek((current) => addDays(current, amount * 7));
  const navigate = (id) => {
    if (id === "rules") setRulesOpen(true);
    else setPage(id);
    setMobileNavOpen(false);
  };
  const matchingEmployees = useMemo(() => {
    const employees = payload?.employees ?? [];
    const normalized = search.trim().toLocaleLowerCase();
    return normalized ? employees.filter((person) => person.name.toLocaleLowerCase().includes(normalized)) : employees;
  }, [payload, search]);

  const exportCsv = () => {
    if (!payload) return;
    const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const lines = [
      ["Employee", "Date", "Start", "End", "Shift hours"],
      ...payload.shifts.map((shift) => [shift.employeeName, shift.date, shift.start, shift.end, 6]),
    ].map((row) => row.map(quote).join(","));
    const file = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `schedule-${week}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const removeShift = (shift) => {
    setPayload((current) => current && refreshSchedule(current, current.shifts.filter((item) => shiftKey(item) !== shiftKey(shift))));
    setSelectedShift(null);
  };

  const addShift = ({ employeeId, date, block }) => {
    if (!payload) return "The schedule is still loading.";
    const employee = payload.employees.find((person) => person.id === employeeId);
    if (!employee) return "Choose an employee.";
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (!employee.availability.includes(weekday)) return `${employee.name} is not available on this day.`;
    if (block === "early" && employee.type === "Part-time") return "Part-time employees can only be assigned evening shifts.";
    const employeeShifts = payload.shifts.filter((shift) => shift.employeeId === employeeId);
    if (employeeShifts.some((shift) => shift.date === date)) return `${employee.name} already has a shift that day.`;
    if (employee.scheduledHours + 6 > employee.cap) return `${employee.name} would exceed their ${employee.cap}-hour weekly cap.`;
    if (employee.scheduledDays >= employee.maxDays) return `${employee.name} would exceed their five-day weekly limit.`;
    const startHour = block === "early" ? 10 : 16;
    const endHour = block === "early" ? 16 : 22;
    const start = Date.parse(`${date}T${String(startHour).padStart(2, "0")}:00:00Z`);
    const end = Date.parse(`${date}T${String(endHour).padStart(2, "0")}:00:00Z`);
    const violatesRest = employeeShifts.some((shift) => {
      const shiftStart = Date.parse(`${shift.date}T${shift.start}:00:00Z`);
      const shiftEnd = Date.parse(`${shift.date}T${shift.end}:00:00Z`);
      const rest = start >= shiftEnd ? start - shiftEnd : shiftStart >= end ? shiftStart - end : -1;
      return rest < 11 * 60 * 60 * 1000;
    });
    if (violatesRest) return `${employee.name} needs at least 11 hours of rest between shifts.`;
    setPayload((current) => refreshSchedule(current, [...current.shifts, {
      employeeId, employeeName: employee.name, date, block,
      start: `${String(startHour).padStart(2, "0")}:00`, end: `${String(endHour).padStart(2, "0")}:00`,
    }]));
    setAddShiftOpen(false);
    return "";
  };

  const nav = (
    <nav className="primary-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <a key={id} href={`#${id}`} className={`nav-link ${(id === page || (id === "rules" && rulesOpen)) ? "active" : ""}`} aria-current={id === page ? "page" : undefined} onClick={(event) => { event.preventDefault(); navigate(id); }}>
          <Icon size={18} strokeWidth={1.9} /><span>{label}</span>{id === "rules" && <span className="nav-dot" />}
        </a>
      ))}
    </nav>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <a className="brand-lockup" href="#overview" onClick={(event) => { event.preventDefault(); navigate("overview"); }}>
          <span className="brand-mark"><CalendarDays size={19} /></span>
          <span>Company<br />Name</span>
        </a>
        <div className="sidebar-store">
          <div className="store-avatar">BG</div>
          <div><strong>Brian’s Grocery</strong><span>Illinois, USA</span></div>
          <span className="store-check"><Check size={12} /></span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        {nav}
        <div className="sidebar-bottom">
          <div className="week-summary-mini"><div className="mini-heading"><Sparkles size={14} /> Your week at a glance</div><strong>{payload ? `${payload.shifts.length} shifts assigned` : "Getting your week ready"}</strong><span>{payload ? `${payload.gaps} staffing gaps to review` : "Sales & staffing overview"}</span></div>
          <div className="user-profile"><div className="user-avatar">BK</div><div><strong>Brian Kelly</strong><span>Store manager</span></div></div>
        </div>
      </aside>

      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumb"><span>Brian’s Grocery</span><ChevronRight size={14} /><strong>{NAV_ITEMS.find((item) => item.id === page)?.label ?? "Overview"}</strong></div>
          </div>
          <div className="topbar-right"><span className="timezone-pill"><span className="online-dot" /> Store time · Chicago</span><div className="manager-avatar">BK</div></div>
        </header>

        <div className="page-container">
          {loading && <div className="state-card loading-state" role="status"><span className="spinner" /> Loading your store dashboard…</div>}
          {error && <div className="state-card error-state" role="alert"><CircleAlert size={19} /><div><strong>We couldn’t load this schedule.</strong><p>{error}</p><button className="button button-small" onClick={() => load(week)}>Try again</button></div></div>}
          {!loading && !error && payload && (
            <>
              <section className="welcome-row">
                <div className="welcome-copy">
                  <div className="eyebrow">{chicagoToday()} <span className="eyebrow-dot" /> STORE OVERVIEW</div>
                  <h1>Good morning, Brian <span className="wave">✦</span></h1>
                  <p>Here’s what’s happening at your store this week.</p>
                </div>
                <div className="week-controls">
                  <div className="week-switcher">
                    <button aria-label="Previous week" onClick={() => changeWeek(-1)}><ChevronLeft size={17} /></button>
                    <span>{weekLabel(week)}</span>
                    <button aria-label="Next week" onClick={() => changeWeek(1)}><ChevronRight size={17} /></button>
                  </div>
                  <button className="button button-primary generate-button" type="button" onClick={() => load(week, true)} disabled={generating}>
                    <Sparkles size={16} />{generating ? "Recalculating…" : "Generate draft"}
                  </button>
                </div>
              </section>

              {payload.sampleData && <div className="notice sample-notice"><Info size={16} /><span><strong>Sample data</strong> · Illustrative sales for the 12 weeks before this week and current week to date. Replace with a private sales file when ready.</span></div>}
              {!payload.forecastComplete && <div className="notice warning-notice"><CircleAlert size={16} /><span><strong>Not enough sales history to forecast every weekday.</strong> Each weekday needs at least four prior observations. Unknown demand isn’t scheduled as zero.</span></div>}
              {payload.unknownBlocks > 0 && <div className="notice warning-notice"><CircleAlert size={16} /><span>Coverage for {payload.unknownBlocks} day(s) is unknown because sales history is incomplete; no demand was assumed for those blocks.</span></div>}

              {page === "overview" && <Overview payload={payload} onShift={setSelectedShift} navigate={navigate} />}
              {page === "schedule" && <SchedulePage payload={payload} week={week} viewMode={viewMode} setViewMode={setViewMode} search={search} setSearch={setSearch} employees={matchingEmployees} onShift={setSelectedShift} onExport={exportCsv} onAddShift={() => setAddShiftOpen(true)} />}
              {page === "insights" && <InsightsPage payload={payload} />}
              {page === "team" && <TeamPage employees={matchingEmployees} search={search} setSearch={setSearch} />}
              {page === "promotions" && <PromotionsPage promotions={payload.promotions} />}
            </>
          )}
        </div>
      </main>
      <ShiftDialog shift={selectedShift} onClose={() => setSelectedShift(null)} onRemove={removeShift} />
      {addShiftOpen && <AddShiftDialog open employees={payload?.employees ?? []} days={payload?.daily ?? []} onClose={() => setAddShiftOpen(false)} onAdd={addShift} />}
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

function Overview({ payload, onShift, navigate }) {
  const { summary, daily, employees, shifts } = payload;
  const direction = summary.changePercent === null ? undefined : summary.changePercent >= 0 ? "up" : "down";
  const todayIndex = daily.findIndex((day) => day.date === chicagoTodayISO());
  const todayCoverage = todayIndex >= 0 ? daily[todayIndex] : null;
  return (
    <>
      <section className="stat-grid">
        <StatCard icon={BarChart3} label="Weekly sales so far" value={USD.format(summary.weeklySales)} detail={summary.changePercent === null ? "Change unavailable" : `${Math.abs(summary.changePercent).toFixed(1)}% vs. matching days last week`} tone="blue" trend={direction} />
        <StatCard icon={Sparkles} label="Full-week forecast" value={summary.forecastSales === null ? "Not available" : USD.format(summary.forecastSales)} detail={summary.forecastComplete ? "Sales-based · draft estimate" : "Insufficient weekday history"} tone="purple" />
        <StatCard icon={Clock3} label="Scheduled hours" value={`${payload.scheduledHours} hrs`} detail={`${payload.gaps} uncovered shift slots`} tone="mint" />
        <StatCard icon={UsersRound} label="People scheduled" value={`${employees.filter((person) => person.scheduledHours > 0).length} of ${employees.length}`} detail="Across the selected week" tone="peach" />
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading"><div><h2>Sales at a glance</h2><p>Six-week view · US dollars</p></div><button className="text-button" onClick={() => navigate("insights")}>View insights <ArrowRight size={15} /></button></div>
          <SalesTrend trend={summary.trend} />
          <p className="chart-footnote"><Info size={14} /> Forecast is based on prior matching weekdays; it is not a guarantee.</p>
        </article>
        <article className="panel staffing-panel">
          <div className="panel-heading"><div><h2>Staffing coverage</h2><p>Daily demand vs. assigned staff</p></div><span className="legend-label"><i className="legend-square demand" /> Need <i className="legend-square assigned" /> Assigned</span></div>
          <div className="coverage-list">
            {daily.map((day) => {
              const need = day.earlyRequired === null || day.eveningRequired === null ? null : day.earlyRequired + day.eveningRequired;
              const assigned = day.earlyAssigned + day.eveningAssigned;
              const width = need ? Math.min(100, assigned / need * 100) : 0;
              return <div className="coverage-row" key={day.date}><span>{formatWeekday(day.date)}</span><div className="coverage-track"><div style={{ width: `${width}%` }} /></div><strong>{need === null ? "—" : `${assigned}/${need}`}</strong></div>;
            })}
          </div>
          <div className="coverage-assumption"><Info size={13} /> 44% early / 56% evening sales allocation is an assumption.</div>
          {todayCoverage && <div className="today-staff"><span>Today’s coverage gaps</span><strong>{(todayCoverage.earlyGap ?? 0) + (todayCoverage.eveningGap ?? 0)}</strong></div>}
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel schedule-preview">
          <div className="panel-heading"><div><h2>This week’s schedule</h2><p>{shifts.length} shifts · Draft schedule</p></div><button className="text-button" onClick={() => navigate("schedule")}>Full schedule <ArrowRight size={15} /></button></div>
          {shifts.length ? <div className="preview-list">{employees.filter((person) => person.scheduledHours > 0).slice(0, 5).map((person) => {
            const personShifts = person.shifts.slice(0, 4);
            return <div className="preview-person" key={person.id}><div className={`person-avatar color-${person.id}`}>{person.name.split(" ").map((part) => part[0]).join("")}</div><div className="preview-person-name"><strong>{person.name}</strong><span>{person.scheduledHours} hrs · {person.type}</span></div><div className="preview-shifts">{personShifts.slice(0, 3).map((shift) => <button className="preview-shift" key={`${shift.date}-${shift.start}`} onClick={() => onShift({ ...shift, weeklyHours: person.scheduledHours })} aria-label={`${person.name}, ${formatDate(shift.date)}, ${shift.start} to ${shift.end}`}>{weekDayName(shift.date)} {shift.start}</button>)}{personShifts.length > 3 && <span className="more-shifts">+{personShifts.length - 3}</span>}</div></div>;
          })}</div> : <div className="empty-inline">No shifts assigned for this week yet.</div>}
          <div className="draft-caption"><span className="draft-badge"><Sparkles size={12} /> DRAFT</span> Schedule changes aren’t saved between sessions.</div>
        </article>
        <article className="panel promotion-panel">
          <div className="panel-heading"><div><h2>Current promotions</h2><p>What’s on offer in store</p></div><button className="text-button" onClick={() => navigate("promotions")}>See all <ArrowRight size={15} /></button></div>
          {payload.promotions.slice(0, 2).map((offer) => <div className={`promo-row promo-${offer.accent}`} key={offer.id}><div className="promo-icon"><BadgePercent size={19} /></div><div className="promo-text"><strong>{offer.title}</strong><span>{offer.detail}</span><small>{formatDate(offer.startsOn)} – {formatDate(offer.endsOn)}</small></div><b>{offer.offer}</b></div>)}
          <div className="promo-caveat"><Info size={13} /> Promotions are informational and do not change staffing demand.</div>
        </article>
      </section>
    </>
  );
}

function PageTitle({ eyebrow, title, description, action }) {
  return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function SchedulePage({ payload, week, viewMode, setViewMode, search, setSearch, employees, onShift, onExport, onAddShift }) {
  const days = payload.daily;
  const coverage = payload.coverage ?? (() => {
    const requiredSlots = days.reduce((total, day) => total + (day.earlyRequired ?? 0) + (day.eveningRequired ?? 0), 0);
    const filledSlots = days.reduce((total, day) => total + Math.min(day.earlyAssigned, day.earlyRequired ?? 0) + Math.min(day.eveningAssigned, day.eveningRequired ?? 0), 0);
    return { requiredSlots, filledSlots, overstaffedSlots: 0, percent: requiredSlots ? Math.round(filledSlots / requiredSlots * 100) : null };
  })();
  const outcome = coverage.percent === null ? "Coverage unavailable" : coverage.percent === 100 ? "Fully covered" : coverage.percent >= 85 ? "Nearly covered" : coverage.percent >= 60 ? "Partially covered" : "Needs attention";
  const visibleIds = new Set(employees.map((employee) => employee.id));
  const shifts = payload.shifts.filter((shift) => visibleIds.has(shift.employeeId));
  const dayShifts = (date) => shifts.filter((shift) => shift.date === date);
  const shiftButton = (shift) => (
    <button className="shift-card" key={`${shift.employeeId}-${shift.date}-${shift.start}`} onClick={() => onShift(shift)} aria-label={`Shift for ${shift.employeeName}, ${formatDate(shift.date)}, ${shift.start} to ${shift.end}`}>
      <span className="shift-time">{shift.start}–{shift.end}</span><strong>{shift.employeeName}</strong><span className="shift-role">{shift.block === "early" ? "Opening team" : "Evening team"}</span>
    </button>
  );
  return (
    <>
      <PageTitle eyebrow="PLAN YOUR PEOPLE" title="Weekly schedule" description="A sales-informed draft, built around your team’s availability and limits." action={<div className="schedule-title-actions"><button className="button button-small" type="button" onClick={onAddShift}><Plus size={16} />Add shift</button><button className="button button-primary" type="button" onClick={onExport}><Download size={16} />Export CSV</button></div>} />
      <div className="schedule-toolbar">
        <div className="schedule-week"><CalendarDays size={17} /><strong>{weekLabel(week)}</strong><span>America/Chicago</span></div>
        <div className="toolbar-actions">
          <label className="search-field schedule-search"><Search size={16} /><input aria-label="Search employees" placeholder="Find an employee" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <div className="view-toggle" role="group" aria-label="Schedule view">
            <button className={viewMode === "employee" ? "selected" : ""} onClick={() => setViewMode("employee")}>By employee</button>
            <button className={viewMode === "day" ? "selected" : ""} onClick={() => setViewMode("day")}>By day</button>
          </div>
        </div>
      </div>
      <div className="notice sample-notice"><Info size={16} /><span><strong>Draft schedule</strong> · Recalculate to generate a fresh schedule. Nothing is saved or published.</span></div>
      <section className={`coverage-outcome ${coverage.percent === 100 ? "complete" : ""}`} aria-label="Schedule effectiveness">
        <div><span className="eyebrow">SCHEDULE EFFECTIVENESS</span><strong>{outcome}</strong><p>{coverage.percent === null ? "There is not enough forecast data to score this week." : `${coverage.filledSlots} of ${coverage.requiredSlots} needed employee slots are filled.`}</p></div>
        <div className="coverage-score"><strong>{coverage.percent === null ? "—" : `${coverage.percent}%`}</strong><span>coverage</span></div>
        {coverage.overstaffedSlots > 0 && <small>{coverage.overstaffedSlots} slot{coverage.overstaffedSlots === 1 ? "" : "s"} above forecast demand</small>}
      </section>
      {viewMode === "employee" ? (
        <div className="schedule-board employee-board">
          {employees.length ? employees.map((person) => (
            <section className="employee-week-row" key={person.id}>
              <div className="employee-week-info"><div className={`person-avatar color-${person.id}`}>{person.name.split(" ").map((part) => part[0]).join("")}</div><div><strong>{person.name}</strong><span>{person.type} · {person.scheduledHours}/{person.cap} hrs</span></div></div>
              <div className="employee-days">{days.map((day) => <div className="employee-day-cell" key={day.date}><span>{weekDayName(day.date)} <small>{formatDate(day.date, { day: "numeric" })}</small></span>{person.shifts.filter((shift) => shift.date === day.date).map(shiftButton)}</div>)}</div>
            </section>
          )) : <div className="empty-inline">No employees match “{search}”.</div>}
        </div>
      ) : (
        <div className="day-board">{days.map((day) => (
          <section className="day-column" key={day.date}>
            <div className="day-column-header"><strong>{formatWeekday(day.date, { weekday: "long" })}</strong><span>{formatDate(day.date, { month: "short", day: "numeric" })}</span></div>
            <div className="day-coverage-summary">{day.earlyRequired === null || day.eveningRequired === null ? "Demand unknown" : `${day.earlyAssigned + day.eveningAssigned}/${day.earlyRequired + day.eveningRequired} staff assigned`}</div>
            <div className="day-shift-list">{dayShifts(day.date).map(shiftButton)}{dayShifts(day.date).length === 0 && <span className="no-shifts">No shifts assigned</span>}</div>
          </section>
        ))}</div>
      )}
      <div className="gap-footer"><CircleAlert size={16} /><span><strong>{payload.gaps} uncovered staffing slots</strong> · Add or remove a draft shift to see coverage update immediately.</span><span className="gap-spacer" /><FileSpreadsheet size={15} /> CSV includes shifts only, never sales data.</div>
    </>
  );
}

function InsightsPage({ payload }) {
  const { summary, policy } = payload;
  return (
    <>
      <PageTitle eyebrow="SALES & STAFFING" title="Sales & insights" description="A clear look at recent sales and what they suggest for staffing." />
      <div className="insight-highlight"><div className="insight-icon"><BarChart3 size={20} /></div><div><span>Selected week forecast</span><strong>{summary.forecastSales === null ? "Not available" : USD.format(summary.forecastSales)}</strong><small>{summary.forecastComplete ? "Weighted weekday estimate · USD" : "More matching weekday observations are needed."}</small></div><span className="forecast-chip"><Sparkles size={13} /> DRAFT ESTIMATE</span></div>
      <article className="panel insights-chart"><div className="panel-heading"><div><h2>Six-week sales trend</h2><p>Weekly aggregate sales, shown in US dollars</p></div></div><SalesTrend trend={summary.trend} /></article>
      <div className="insights-two-col">
        <article className="panel explanation-card"><div className="explanation-icon"><Info size={17} /></div><div><h2>How the forecast works</h2><p>{policy.forecasting}</p><p>A minimum of four observations is required for each weekday. Forecasts are based only on dates before the selected week; future sales can’t leak into the estimate.</p><p><strong>Sales are a proxy for traffic</strong>, not measured customer footfall.</p></div></article>
        <article className="panel explanation-card"><div className="explanation-icon peach"><Clock3 size={17} /></div><div><h2>Staffing assumptions</h2><p>{policy.splitAssumption}</p><p>One employee is assumed to support {USD.format(policy.salesCapacity)} in sales per work hour. Required staffing is rounded up for each six-hour block.</p><p>Promotions are excluded from demand calculations.</p></div></article>
      </div>
    </>
  );
}

function TeamPage({ employees, search, setSearch }) {
  return (
    <>
      <PageTitle eyebrow="YOUR STORE CREW" title="Meet your team" description="Availability and contractual limits for this week’s draft." action={<label className="search-field team-search"><Search size={16} /><input aria-label="Search employees" placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} /></label>} />
      <div className="team-grid">
        {employees.map((person) => (
          <article className="panel team-card" key={person.id}>
            <div className="team-card-top"><div className={`person-avatar team-avatar color-${person.id}`}>{person.name.split(" ").map((part) => part[0]).join("")}</div><span className={`employment-chip ${person.type === "Full-time" ? "full-time" : "part-time"}`}>{person.type}</span></div>
            <h2>{person.name}</h2>
            <p className="availability"><CalendarDays size={14} /> Available {dayAvailability(person.availability)}</p>
            <div className="hours-summary"><span>Scheduled this week</span><strong>{person.scheduledHours} <small>/ {person.cap} hrs</small></strong></div>
            <div className="hours-meter"><span style={{ width: `${Math.min(100, person.scheduledHours / person.cap * 100)}%` }} /></div>
            <div className="team-limits"><span><Clock3 size={13} /> Up to {person.cap} hours</span><span><CalendarDays size={13} /> Max 5 days</span></div>
            {person.type === "Part-time" && <div className="pt-note">Evening shifts only · 16:00–22:00</div>}
          </article>
        ))}
        {!employees.length && <div className="empty-inline">No employees match “{search}”.</div>}
      </div>
      <div className="compliance-inline"><CircleAlert size={15} /><span>These are supplied prototype rules, not a complete assessment of Illinois employment law.</span></div>
    </>
  );
}

function PromotionsPage({ promotions }) {
  return (
    <>
      <PageTitle eyebrow="IN-STORE OFFERS" title="Current promotions" description="Sample grocery offers and the dates they’re active." />
      <div className="promo-grid">
        {promotions.map((offer) => <article className={`panel promotion-card promo-${offer.accent}`} key={offer.id}>
          <div className="promotion-card-icon"><BadgePercent size={23} /></div><span className="offer-tag">{offer.offer}</span>
          <div className="eyebrow">GROCERY OFFER</div><h2>{offer.title}</h2><p>{offer.detail}</p>
          <div className="valid-dates"><CalendarDays size={15} /><span><strong>Valid dates</strong><br />{formatDate(offer.startsOn, { month: "long", day: "numeric" })} – {formatDate(offer.endsOn, { month: "long", day: "numeric", year: "numeric" })}</span></div>
        </article>)}
      </div>
      <div className="promo-caveat large"><Info size={15} /> These sample offers are informational only. Promotions do not influence sales forecasting or staffing calculations.</div>
    </>
  );
}

export default App;
