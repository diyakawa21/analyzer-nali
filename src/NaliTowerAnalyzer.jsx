import { useState, useMemo, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from "recharts";

// ─────────────────────────────────────────────────────────────
// NALI TOWER CALCULATION ENGINE
// Verified against Excel DB sheet — COMPLETELY SEPARATE from SK2
// ─────────────────────────────────────────────────────────────
function runNaliAnalysis(inputs) {
  const {
    salePricePerSqm,
    baseCostPerSqm,
    saleProbability,
    installmentProbability,
    saleMonths,
    constructionMonths,
    commissionPerSqm,
    p2Timing,       // months after sale P2 arrives
    p3Timing,       // months after sale P3 arrives
    phase3Years,
    flatTypes,      // [{area, flatsForSale, p1, p2, p3, monthlyInstallment}]
    monthlyCostSchedule,  // array of % values (length = 20)
    totalConstructionCost,
    // FIXED for Nali Tower
    oldFlatsCount: OLD_FLATS,    // 150
    oldFlatMonthly: OLD_MONTHLY, // 750
  } = inputs;

  const sp = saleProbability / 100;
  const ip = installmentProbability / 100;

  // ── STEP 1: Per flat type calculations ─────────────────
  // pricePerFlat = area × sale price per m²
  // P4 = price × 55% - P1 - P2 - P3 (remaining balance at key handover)
  // monthlyInstallment = remaining balance ÷ (phase3Years × 12)
  const types = flatTypes.map(ft => {
    const pricePerFlat = ft.area * salePricePerSqm;
    const p4 = pricePerFlat * (1 - 0.45) - ft.p1 - ft.p2 - ft.p3;
    const remainAfterPayments = pricePerFlat - ft.p1 - ft.p2 - ft.p3 - Math.max(0, p4);
    const monthlyInstallment = remainAfterPayments > 0 ? remainAfterPayments / (phase3Years * 12) : ft.monthlyInstallment;
    return { ...ft, pricePerFlat, p4: Math.max(0, p4), monthlyInstallment };
  });

  const totalFlatsForSale = types.reduce((s, t) => s + t.flatsForSale, 0);

  // ── STEP 2: Weighted averages across flat types ─────────
  // Weighted by flats for sale per type (not equal weight)
  // e.g. Type A has 95 flats, Type B has 38 → Type A has more impact
  const avgArea  = types.reduce((s, t) => s + t.area * t.flatsForSale, 0) / totalFlatsForSale;
  const avgP1    = types.reduce((s, t) => s + t.p1   * t.flatsForSale, 0) / totalFlatsForSale;
  const avgP2    = types.reduce((s, t) => s + t.p2   * t.flatsForSale, 0) / totalFlatsForSale;
  const avgP3    = types.reduce((s, t) => s + t.p3   * t.flatsForSale, 0) / totalFlatsForSale;
  const avgP4    = types.reduce((s, t) => s + t.p4   * t.flatsForSale, 0) / totalFlatsForSale;

  // Units sold per month during sale period
  const unitsPerMonth = (sp * totalFlatsForSale) / saleMonths;

  // ── STEP 3: Construction cost schedule ──────────────────
  // Dollar amounts paid to contractor each month (from Excel DB sheet rows A39:A58)
  // These are hardcoded by the planner based on real construction phases
  // e.g. early months = less cost (foundations), middle = peak (structure), end = less (finishing)
  const TOTAL_MONTHS = Math.max(constructionMonths, monthlyCostSchedule.length);
  const costSchedule = monthlyCostSchedule; // direct dollar amounts

  // ── STEP 4: Monthly sales simulation ─────────────────────
  // Month 1 = no sales (matches Excel — first month is setup/marketing)
  // Sales start from month 2 and run for saleMonths
  // Formula: units sold per month = (saleProbability × totalFlatsForSale) / saleMonths
  const monthlySold = new Array(TOTAL_MONTHS + 2).fill(0);
  const cumSold     = new Array(TOTAL_MONTHS + 2).fill(0);
  let cumSoFar = 0;

  for (let m = 1; m < saleMonths; m++) {
    // Can't sell more than what's left
    const canSell = Math.max(0, totalFlatsForSale - cumSoFar);
    const sold    = Math.min(unitsPerMonth, canSell);
    monthlySold[m] = sold;
    cumSoFar      += sold;
    cumSold[m]     = cumSoFar;
  }
  // After sale period ends, cumulative stays at final value
  for (let m = saleMonths; m < TOTAL_MONTHS + 2; m++) {
    cumSold[m] = cumSoFar;
  }

  // ── STEP 5: Fixed income from already-sold 150 flats ─────
  // UNIQUE TO NALI TOWER: 150 flats were sold before construction started
  // Each pays $750/month installment throughout construction
  // We apply installment collection probability (70%) since not all pay on time
  // Formula: 150 × $750 × 70% = $78,750/month (every month, no matter what)
  const fixedMonthlyIncome = OLD_FLATS * OLD_MONTHLY * ip;

  const months = [];
  let cumCashIn = 0, cumCashOut = 0;

  // ── STEP 6: Monthly cash flow loop ───────────────────────
  for (let m = 0; m < TOTAL_MONTHS + 1; m++) {
    const sold = monthlySold[m]; // units sold this month

    // P1 INCOME (net of agent commission):
    // Gross P1 = units sold × average P1 payment per flat
    // Commission deducted = units sold × average area × commission per m²
    // Net P1 = Gross P1 - Commission (agent gets paid when sale happens)
    const p1Gross    = sold * avgP1;
    const commission = sold * avgArea * commissionPerSqm;
    const p1Net      = p1Gross - commission;

    // P2 INCOME (delayed payment):
    // Arrives exactly p2Timing months after the sale contract
    // e.g. if p2Timing=3 and sale was month 2, P2 arrives month 5
    // Applied with installment collection probability (not all buyers pay on time)
    const p2 = (m >= p2Timing + 1) ? monthlySold[m - p2Timing] * avgP2 * ip : 0;

    // P3 INCOME (delayed payment):
    // Same logic as P2 but arrives p3Timing months after sale
    // e.g. if p3Timing=7 and sale was month 2, P3 arrives month 9
    const p3 = (m >= p3Timing + 1) ? monthlySold[m - p3Timing] * avgP3 * ip : 0;

    // P4 INCOME (turnkey / handover payment):
    // Paid by buyer when they receive the key at end of construction
    // = total cumulative units sold × avg P4 per flat × sale probability
    // Only collected in the final construction month
    const p4 = (m === constructionMonths - 1) ? cumSold[m] * avgP4 * sp : 0;

    // FIXED INCOME from already-sold 150 flats (every month during construction)
    const fixedIncome = (m < TOTAL_MONTHS) ? fixedMonthlyIncome : 0;

    // TOTAL CASH IN this month = P1 + P2 + P3 + P4 (if key month) + fixed
    const cashIn  = Math.round(p1Net + p2 + p3 + p4 + fixedIncome);

    // CASH OUT = contractor payment for this month (from cost schedule)
    // Construction cost is paid regardless of how many flats are sold
    const cashOut = m < costSchedule.length ? Math.round(costSchedule[m]) : 0;

    // NET FUNDING = Cash In - Cash Out
    // Negative = investor must top up the shortfall
    // Positive = more came in than went out (investor recoups)
    const net     = cashIn - cashOut;

    cumCashIn  += cashIn;
    cumCashOut += cashOut;

    months.push({
      month: m + 1,
      label: `M${m + 1}`,
      cashIn, p1: Math.round(p1Net), p2: Math.round(p2),
      p3: Math.round(p3), p4: Math.round(p4),
      fixedIncome: Math.round(fixedIncome),
      cashOut, net,
      cumCashIn:  Math.round(cumCashIn),
      cumCashOut: Math.round(cumCashOut),
      unitsSold:      Math.round(monthlySold[m] * 100) / 100,
      cumUnitsSold:   Math.round(cumSold[m] * 100) / 100,
    });
  }

  // ── Summary metrics ──────────────────────────────────────
  const totalRevPhase1  = months.slice(0, constructionMonths).reduce((s, m) => s + m.cashIn, 0);
  const totalRevPhase2  = Math.round(cumSoFar * avgP4 * sp); // turnkey
  const totalRevenue    = totalRevPhase1 + totalRevPhase2;
  const revenueVsCost   = totalRevenue / totalConstructionCost;
  const remainingCost   = Math.max(0, totalConstructionCost - totalRevenue);

  // Net cost (matches Excel C37 formula: C34 + E35)
  const profitFromMargin = (salePricePerSqm - baseCostPerSqm - commissionPerSqm) * (totalConstructionCost / 600);
  const netCost          = Math.round(totalConstructionCost + profitFromMargin);

  // Investor profit (DB A36 × A37 = 0.25 × netCost)
  const investorProfit   = Math.round(0.25 * netCost);

  const flatsRemaining   = Math.round(totalFlatsForSale - cumSoFar * sp);
  const peakFundingGap   = Math.abs(Math.min(...months.map(m => m.net)));
  const requireFunding   = Math.max(0, totalConstructionCost - totalRevPhase1);
  const totalCommission  = Math.round(cumSoFar * avgArea * commissionPerSqm);
  const profitPct        = Math.round((investorProfit / netCost) * 100 * 10) / 10;

  return {
    types, months: months.slice(0, TOTAL_MONTHS),
    totalFlatsForSale, cumUnitsSold: Math.round(cumSoFar),
    totalRevPhase1: Math.round(totalRevPhase1),
    totalRevPhase2,
    totalRevenue: Math.round(totalRevenue),
    revenueVsCost: Math.round(revenueVsCost * 100),
    remainingCost,
    netCost, investorProfit, profitPct,
    flatsRemaining,
    peakFundingGap: Math.round(peakFundingGap),
    requireFunding: Math.round(requireFunding),
    totalCommission,
    fixedMonthlyIncome: Math.round(fixedMonthlyIncome),
    avgP1: Math.round(avgP1), avgP2: Math.round(avgP2),
    avgP3: Math.round(avgP3), avgP4: Math.round(avgP4),
  };
}

// ─────────────────────────────────────────────────────────────
// DEFAULT INPUTS (from Excel)
// ─────────────────────────────────────────────────────────────
const DEFAULT_COST_SCHEDULE = [
  418987.5, 418987.5, 502785, 670380, 670380, 670380,
  586582.5, 586582.5, 586582.5, 418987.5, 418987.5,
  335190, 335190, 335190, 335190, 251392.5, 251392.5,
  251392.5, 167595, 167595
];

const DEFAULT_INPUTS = {
  salePricePerSqm: 811,
  baseCostPerSqm: 811,
  saleProbability: 80,
  installmentProbability: 70,
  saleMonths: 9,
  constructionMonths: 9,
  commissionPerSqm: 30,
  p2Timing: 3,
  p3Timing: 7,
  phase3Years: 5,
  totalConstructionCost: 8379750,
  oldFlatsCount: 150,
  oldFlatMonthly: 750,
  monthlyCostSchedule: DEFAULT_COST_SCHEDULE,
  flatTypes: [
    { id: 1, name: "Type A – 223m²", area: 223, flatsForSale: 95, p1: 35000, p2: 20000, p3: 10000, monthlyInstallment: 500 },
    { id: 2, name: "Type B – 201m²", area: 201, flatsForSale: 38, p1: 30000, p2: 20000, p3: 10000, monthlyInstallment: 500 },
    { id: 3, name: "Type C – 164m²", area: 164, flatsForSale: 27, p1: 25000, p2: 20000, p3: 70000, monthlyInstallment: 500 },
    { id: 4, name: "Type D – 108m²", area: 108, flatsForSale: 0,  p1: 0,     p2: 0,     p3: 0,     monthlyInstallment: 500 },
  ],
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const fmt  = n => n == null ? "—" : "$" + Math.abs(Math.round(n)).toLocaleString();
const fmtN = n => n == null ? "—" : (+n).toLocaleString("en-US", { maximumFractionDigits: 1 });
const fmtP = n => n == null ? "—" : Math.round(n) + "%";
const COLORS = ["#c0392b", "#b8953a", "#5d6d7e", "#7f8c8d"];

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
function Label({ children }) {
  return <div style={{ fontSize: 9, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 5 }}>{children}</div>;
}

function InlineField({ label, value, onChange, prefix, suffix, type = "number", min, help }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <Label>{label}</Label>
      <div style={{ display: "flex" }}>
        {prefix && <span style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRight: "none", padding: "5px 6px", fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center" }}>{prefix}</span>}
        <input type={type} value={value} min={min}
          onChange={e => onChange(type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value)}
          style={{ flex: 1, background: "var(--input-bg)", border: "1px solid var(--border)", borderLeft: prefix ? "none" : undefined, borderRight: suffix ? "none" : undefined, padding: "5px 4px", fontSize: 10, color: "var(--text)", outline: "none", fontFamily: "'JetBrains Mono', monospace", minWidth: 0, width: "100%" }}
        />
        {suffix && <span style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderLeft: "none", padding: "6px 8px", fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center" }}>{suffix}</span>}
      </div>
      {help && <span style={{ fontSize: 10, color: "var(--muted)" }}>{help}</span>}
    </div>
  );
}

function KpiCard({ label, value, sub, topColor, negative }) {
  return (
    <div style={{ background: "var(--surface)", padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      {topColor && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: topColor }} />}
      <div style={{ fontSize: 8, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 400, fontFamily: "'Cormorant Garamond', serif", color: negative ? "var(--danger)" : "var(--text)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "8px 12px", fontSize: 11 }}>
      <div style={{ fontWeight: 600, color: "var(--muted)", marginBottom: 5, fontSize: 9, letterSpacing: "0.1em" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "var(--muted)", fontSize: 9 }}>{p.name}:</span>
          <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{Math.abs(p.value) > 100 ? fmt(p.value) : fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SIDEBAR INPUTS
// ─────────────────────────────────────────────────────────────
function Sidebar({ inputs, setInputs, results, onClose }) {
  const [openSection, setOpenSection] = useState("params");

  const upd = useCallback((key, val) => setInputs(prev => ({ ...prev, [key]: val })), [setInputs]);
  const updFt = useCallback((id, key, val) => setInputs(prev => ({
    ...prev,
    flatTypes: prev.flatTypes.map(ft => ft.id === id ? { ...ft, [key]: val } : ft)
  })), [setInputs]);
  const updSchedule = useCallback((idx, val) => setInputs(prev => {
    const next = [...prev.monthlyCostSchedule];
    next[idx] = val;
    return { ...prev, monthlyCostSchedule: next };
  }), [setInputs]);

  const scheduleTotal = inputs.monthlyCostSchedule.reduce((s, v) => s + v, 0);
  const scheduleDiff = scheduleTotal - inputs.totalConstructionCost;
  const isCustomSchedule = JSON.stringify(inputs.monthlyCostSchedule) !== JSON.stringify(DEFAULT_COST_SCHEDULE);

  const toggle = (s) => setOpenSection(prev => prev === s ? null : s);

  return (
    <aside style={{ width: 420, flexShrink: 0, height: "100vh", overflowY: "auto", background: "var(--surface)", borderRight: "1px solid var(--border)", position: "sticky", top: 0 }}>

      {/* Logo + close button */}
      <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 20, lineHeight: 1, padding: 2 }}>×</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", color: "var(--text)" }}>SK</span>
            <div style={{ width: 22, height: 1, background: "var(--accent)" }} />
            <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: "0.3em", color: "var(--muted)" }}>ESTATE</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: "0.05em" }}>Nali Tower</div>
            <div style={{ fontSize: 8, color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Feasibility Analysis</div>
          </div>
        </div>
      </div>

      {/* Fixed info banner */}
      <div style={{ padding: "10px 20px", background: "rgba(184,149,58,0.08)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 9, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>Fixed — Already Sold</div>
        <div style={{ fontSize: 11, color: "var(--text2)" }}>
          {inputs.oldFlatsCount} flats × {fmt(inputs.oldFlatMonthly)}/mo
          <span style={{ color: "var(--gold)", fontFamily: "monospace", marginLeft: 6 }}>{fmt(results?.fixedMonthlyIncome)}/mo</span>
        </div>
      </div>

      <div style={{ overflowY: "auto", paddingBottom: 60 }}>

        {/* ── TABLE 5: Global Params ── */}
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => toggle("params")} style={{ width: "100%", padding: "12px 20px", background: "transparent", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.18em" }}>Table 5 — Global Parameters</span>
            <span style={{ color: "var(--muted)" }}>{openSection === "params" ? "−" : "+"}</span>
          </button>
          {openSection === "params" && (
            <div style={{ padding: "4px 20px 16px" }}>
              <InlineField label="Base Line Cost / m²" prefix="$" value={inputs.baseCostPerSqm} onChange={v => upd("baseCostPerSqm", v)} />
              <InlineField label="NEW Sale Cost / m²" prefix="$" value={inputs.salePricePerSqm} onChange={v => upd("salePricePerSqm", v)} />
              <InlineField label="Sale Probability During Construction" suffix="%" value={inputs.saleProbability} onChange={v => upd("saleProbability", v)} min={0} />
              <InlineField label="Installment Income Probability" suffix="%" value={inputs.installmentProbability} onChange={v => upd("installmentProbability", v)} min={0} />
              <InlineField label="Month for Sale Target" value={inputs.saleMonths} onChange={v => upd("saleMonths", v)} min={1} />
              <InlineField label="Month for Construction + Sale @ Key" value={inputs.constructionMonths} onChange={v => upd("constructionMonths", v)} min={1} />
              <InlineField label="Commission per m²" prefix="$" value={inputs.commissionPerSqm} onChange={v => upd("commissionPerSqm", v)} />
              <InlineField label="P2 Duration (months after sale)" suffix="mo" value={inputs.p2Timing} onChange={v => upd("p2Timing", v)} min={1} />
              <InlineField label="P3 Duration (months after sale)" suffix="mo" value={inputs.p3Timing} onChange={v => upd("p3Timing", v)} min={1} />
              <InlineField label="Phase 3 Duration (years)" suffix="yrs" value={inputs.phase3Years} onChange={v => upd("phase3Years", v)} min={1} />
              {results && (
                <div style={{ padding: "8px 10px", background: "var(--bg)", fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                  <div>Avg monthly install: <strong style={{ color: "var(--text2)", fontFamily: "monospace" }}>{fmt(results.avgP1 * 0.1)}</strong></div>
                  <div>Total commission paid: <strong style={{ color: "var(--text2)", fontFamily: "monospace" }}>{fmt(results.totalCommission)}</strong></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── TABLE 1: Flat Sale Policy ── */}
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => toggle("flats")} style={{ width: "100%", padding: "12px 20px", background: "transparent", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.18em" }}>Table 1 — Flat Sale Policy</span>
            <span style={{ color: "var(--muted)" }}>{openSection === "flats" ? "−" : "+"}</span>
          </button>
          {openSection === "flats" && (
            <div style={{ padding: "4px 0 16px" }}>
              {inputs.flatTypes.map((ft, idx) => {
                const rft = results?.types[idx];
                return (
                  <div key={ft.id} style={{ borderLeft: `2px solid ${COLORS[idx]}`, margin: "8px 16px", padding: "10px 14px", background: "var(--bg)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{ft.name} · {ft.area}m²</div>
                    <InlineField label="Flats for Sale" value={ft.flatsForSale} onChange={v => updFt(ft.id, "flatsForSale", v)} min={0} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <InlineField label="P1" prefix="$" value={ft.p1} onChange={v => updFt(ft.id, "p1", v)} />
                      <InlineField label="P2" prefix="$" value={ft.p2} onChange={v => updFt(ft.id, "p2", v)} />
                      <InlineField label="P3" prefix="$" value={ft.p3} onChange={v => updFt(ft.id, "p3", v)} />
                      <InlineField label="Monthly" prefix="$" value={ft.monthlyInstallment} onChange={v => updFt(ft.id, "monthlyInstallment", v)} />
                    </div>
                    {rft && (
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6, display: "flex", gap: 12 }}>
                        <span>P4: <strong style={{ color: "var(--gold)", fontFamily: "monospace" }}>{fmt(rft.p4)}</strong></span>
                        <span>Price: <strong style={{ fontFamily: "monospace", color: "var(--text2)" }}>{fmt(rft.pricePerFlat)}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CONSTRUCTION COST SCHEDULE ── */}
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => toggle("schedule")} style={{ width: "100%", padding: "12px 20px", background: "transparent", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.18em" }}>Construction Cost Schedule</span>
            <span style={{ color: "var(--muted)" }}>{openSection === "schedule" ? "−" : "+"}</span>
          </button>
          {openSection === "schedule" && (
            <div style={{ padding: "4px 20px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: Math.abs(scheduleDiff) > 100 ? "var(--danger)" : "var(--green)" }}>
                  Total: {fmt(scheduleTotal)} {Math.abs(scheduleDiff) > 100 ? `(${scheduleDiff > 0 ? "+" : ""}${Math.round(scheduleDiff).toLocaleString()} vs budget)` : "✓"}
                </span>
                {isCustomSchedule && (
                  <button onClick={() => upd("monthlyCostSchedule", DEFAULT_COST_SCHEDULE)}
                    style={{ fontSize: 8, background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Reset
                  </button>
                )}
              </div>
              <InlineField label="Total Construction Budget" prefix="$" value={inputs.totalConstructionCost} onChange={v => upd("totalConstructionCost", v)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                {inputs.monthlyCostSchedule.map((amt, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 8, color: "var(--muted)", marginBottom: 2 }}>Month {i + 1}</div>
                    <div style={{ display: "flex" }}>
                      <span style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRight: "none", padding: "4px 5px", fontSize: 9, color: "var(--muted)" }}>$</span>
                      <input type="number" value={Math.round(amt)} min={0} step={1000}
                        onChange={e => updSchedule(i, parseFloat(e.target.value) || 0)}
                        style={{ width: "100%", background: "var(--input-bg)", border: "1px solid var(--border)", borderLeft: "none", padding: "4px 6px", fontSize: 10, color: "var(--text)", outline: "none", fontFamily: "monospace" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dashboardRef = useRef(null);
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);

  const results = useMemo(() => {
    try { return runNaliAnalysis(inputs); } catch { return null; }
  }, [inputs]);

  const r = results;

  // Load html2canvas library from CDN
  async function loadHtml2Canvas() {
    if (window.html2canvas) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(script);
    await new Promise(resolve => script.onload = resolve);
  }

  // Export as 1 page — full dashboard in one PNG
  async function exportOnePage() {
    if (!dashboardRef.current) return;
    setShowExportMenu(false);
    setExporting(true);
    try {
      await loadHtml2Canvas();
      const canvas = await window.html2canvas(dashboardRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#f5f2ee', logging: false,
      });
      const link = document.createElement('a');
      link.download = `Nali-Tower-Dashboard-${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch(e) { alert('Export failed. Please try again.'); }
    setExporting(false);
  }

  // Export as 2 pages — Page1 (KPIs+charts) and Page2 (tables) as separate PNGs
  async function exportTwoPages() {
    if (!page1Ref.current || !page2Ref.current) return;
    setShowExportMenu(false);
    setExporting(true);
    try {
      await loadHtml2Canvas();
      const date = new Date().toISOString().slice(0,10);
      const opts = { scale: 2, useCORS: true, backgroundColor: '#f5f2ee', logging: false };
      // Page 1
      const c1 = await window.html2canvas(page1Ref.current, opts);
      const l1 = document.createElement('a');
      l1.download = `Nali-Tower-Page1-${date}.png`;
      l1.href = c1.toDataURL('image/png');
      l1.click();
      // Short delay then Page 2
      await new Promise(r => setTimeout(r, 800));
      const c2 = await window.html2canvas(page2Ref.current, opts);
      const l2 = document.createElement('a');
      l2.download = `Nali-Tower-Page2-${date}.png`;
      l2.href = c2.toDataURL('image/png');
      l2.click();
    } catch(e) { alert('Export failed. Please try again.'); }
    setExporting(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Montserrat:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#f5f2ee; --surface:#ffffff; --surface2:#f0ece7;
          --border:#e0dbd4; --text:#1a1816; --text2:#4a4540;
          --muted:#9a9088; --accent:#c0392b; --gold:#b8953a;
          --green:#27ae60; --danger:#e74c3c; --input-bg:#f8f5f1;
        }
        body{background:var(--bg);color:var(--text);font-family:'Montserrat',sans-serif;-webkit-font-smoothing:antialiased}
        input:focus{outline:1px solid var(--accent)!important}
        input[type=number]::-webkit-inner-spin-button{opacity:.2}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--border)}
        button{font-family:inherit}
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>

        {/* OVERLAY when sidebar open */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40,
          }} />
        )}

        {/* SLIDING SIDEBAR */}
        <div style={{
          position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          boxShadow: sidebarOpen ? "4px 0 24px rgba(0,0,0,0.15)" : "none",
        }}>
          <Sidebar inputs={inputs} setInputs={setInputs} results={r} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* DASHBOARD — full width always */}
        <main style={{ flex: 1, overflowY: "auto", background: "var(--bg)", width: "100%" }}>
          {r ? (
            <div ref={dashboardRef} style={{ padding: "36px 36px 80px" }}>

              {/* Header */}
              <div style={{ marginBottom: 32, borderBottom: "1px solid var(--border)", paddingBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 8, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 6 }}>SKE-Plan Study</div>
                  <h1 style={{ fontSize: 40, fontWeight: 300, fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.04em", lineHeight: 1 }}>Nali Tower</h1>
                  <p style={{ fontSize: 9, color: "var(--muted)", marginTop: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {r.totalFlatsForSale} Flats for Sale · {inputs.saleMonths}-Month Sale Period · {inputs.constructionMonths}-Month Construction
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* Export dropdown */}
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setShowExportMenu(m => !m)} disabled={!!exporting} style={{
                      background: "var(--accent)", border: "none", color: "#fff",
                      padding: "9px 16px", cursor: exporting ? "wait" : "pointer",
                      fontSize: 9, fontWeight: 600, letterSpacing: "0.15em",
                      textTransform: "uppercase", opacity: exporting ? 0.7 : 1,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span>↓</span>
                      {exporting ? "Exporting..." : "Export PNG ▾"}
                    </button>
                    {showExportMenu && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", right: 0,
                        background: "var(--surface)", border: "1px solid var(--border)",
                        zIndex: 200, minWidth: 160, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      }}>
                        <button onClick={exportOnePage} style={{
                          width: "100%", padding: "10px 16px", background: "transparent",
                          border: "none", borderBottom: "1px solid var(--border)",
                          textAlign: "left", cursor: "pointer", fontSize: 10,
                          color: "var(--text)", fontWeight: 600, letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}>
                          ↓ 1 Page (full)
                        </button>
                        <button onClick={exportTwoPages} style={{
                          width: "100%", padding: "10px 16px", background: "transparent",
                          border: "none", textAlign: "left", cursor: "pointer", fontSize: 10,
                          color: "var(--text)", fontWeight: 600, letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}>
                          ↓ 2 Pages (split)
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Hamburger button */}
                  <button onClick={() => setSidebarOpen(true)} style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    padding: "10px 14px", cursor: "pointer", display: "flex",
                    flexDirection: "column", gap: 5, flexShrink: 0,
                  }}>
                    <span style={{ display: "block", width: 20, height: 1.5, background: "var(--text)" }} />
                    <span style={{ display: "block", width: 20, height: 1.5, background: "var(--text)" }} />
                    <span style={{ display: "block", width: 20, height: 1.5, background: "var(--text)" }} />
                  </button>
                </div>
              </div>

              {/* PAGE 1: KPIs + Charts */}
              <div ref={page1Ref}>

              {/* TABLE 7 summary row — matches dashboard image */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "16px 20px", marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
                {[
                  ["Total Cost", fmt(inputs.totalConstructionCost), "Construction budget"],
                  ["Revenue % @ Handover", fmtP(r.revenueVsCost), "Phase 1 + 2 vs cost"],
                  ["Remaining Contractor Cost", fmt(r.remainingCost), "After all payments"],
                  ["Investor Profit", fmt(r.investorProfit), `${r.profitPct}% of net cost`],
                  ["Require Funding Phase 1", fmt(r.requireFunding), "Gap to fund"],
                ].map(([label, val, sub]) => (
                  <div key={label}>
                    <div style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 16, fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: "var(--text)" }}>{val}</div>
                    <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 3 }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* KPI row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 1, background: "var(--border)" }}>
                <KpiCard label="Net Cost" value={fmt(r.netCost)} topColor="var(--accent)" sub="Construction + margin" />
                <KpiCard label="Total Revenue (Ph1+Ph2)" value={fmt(r.totalRevenue)} topColor="var(--green)" sub="During build + turnkey" />
                <KpiCard label="Flats Must Sell (Phase 1)" value={fmtN(r.totalFlatsForSale)} topColor="var(--gold)" sub={`${fmtN(r.cumUnitsSold)} sold at ${inputs.saleProbability}% prob`} />
                <KpiCard label="Flats Remaining After Key" value={fmtN(r.flatsRemaining)} sub={`of ${r.totalFlatsForSale} targeted`} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, marginBottom: 28, background: "var(--border)" }}>
                <KpiCard label="Revenue Phase 1 (During Build)" value={fmt(r.totalRevPhase1)} sub="P1 + P2 + P3 + fixed" />
                <KpiCard label="Revenue Phase 2 (@ Key)" value={fmt(r.totalRevPhase2)} sub="P4 turnkey payments" />
                <KpiCard label="Peak Monthly Funding Gap" value={fmt(r.peakFundingGap)} negative sub="Worst single month" />
                <KpiCard label="Fixed Income (150 Flats)" value={fmt(r.fixedMonthlyIncome)} sub="Per month throughout build" topColor="var(--gold)" />
              </div>

              {/* Charts row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 1, marginBottom: 1, background: "var(--border)" }}>
                <div style={{ background: "var(--surface)", padding: "20px 20px 12px" }}>
                  <div style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 3 }}>Cash Flow Timeline</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 14 }}>Monthly income vs construction cost vs net position</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={r.months} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#27ae60" stopOpacity={0.15}/><stop offset="95%" stopColor="#27ae60" stopOpacity={0}/></linearGradient>
                        <linearGradient id="gout" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e74c3c" stopOpacity={0.1}/><stop offset="95%" stopColor="#e74c3c" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--border)"/>
                      <XAxis dataKey="label" tick={{ fill:"var(--muted)", fontSize:9 }}/>
                      <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{ fill:"var(--muted)", fontSize:9 }} width={52}/>
                      <Tooltip content={<ChartTip/>}/>
                      <Legend wrapperStyle={{ fontSize:8, color:"var(--muted)", letterSpacing:"0.1em", textTransform:"uppercase" }}/>
                      <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1}/>
                      <Area type="monotone" dataKey="cashIn"  name="Cash In"     stroke="#27ae60" fill="url(#gin)"  strokeWidth={1.5} dot={false}/>
                      <Area type="monotone" dataKey="cashOut" name="Cash Out"    stroke="#e74c3c" fill="url(#gout)" strokeWidth={1.5} dot={false}/>
                      <Line type="monotone" dataKey="net"     name="Net Funding" stroke="#b8953a" strokeWidth={1.5} dot={false} strokeDasharray="4 3"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: "var(--surface)", padding: "20px 20px 12px" }}>
                  <div style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 3 }}>Income Breakdown</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 14 }}>P1 / P2 / P3 / Fixed per month</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={r.months} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--border)"/>
                      <XAxis dataKey="label" tick={{ fill:"var(--muted)", fontSize:9 }}/>
                      <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{ fill:"var(--muted)", fontSize:9 }} width={48}/>
                      <Tooltip content={<ChartTip/>}/>
                      <Legend wrapperStyle={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em" }}/>
                      <Bar dataKey="p1"          name="P1 Initial"    stackId="a" fill="#c0392b"/>
                      <Bar dataKey="p2"          name="P2 Payment"    stackId="a" fill="#b8953a"/>
                      <Bar dataKey="p3"          name="P3 Payment"    stackId="a" fill="#5d6d7e"/>
                      <Bar dataKey="fixedIncome" name="Fixed (150 flats)" stackId="a" fill="#27ae60"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Charts row 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, marginBottom: 28, background: "var(--border)" }}>
                <div style={{ background: "var(--surface2)", padding: "20px 20px 12px" }}>
                  <div style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 3 }}>Cumulative Position</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 14 }}>Running totals — cash in vs cost paid</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={r.months} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gcin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#b8953a" stopOpacity={0.15}/><stop offset="95%" stopColor="#b8953a" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--border)"/>
                      <XAxis dataKey="label" tick={{ fill:"var(--muted)", fontSize:9 }}/>
                      <YAxis tickFormatter={v=>`$${(v/1000000).toFixed(1)}M`} tick={{ fill:"var(--muted)", fontSize:9 }} width={46}/>
                      <Tooltip content={<ChartTip/>}/>
                      <Legend wrapperStyle={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em" }}/>
                      <Area type="monotone" dataKey="cumCashIn"  name="Cum. Cash In" stroke="#b8953a" fill="url(#gcin)" strokeWidth={1.5} dot={false}/>
                      <Line type="monotone" dataKey="cumCashOut" name="Cum. Cost"     stroke="#e74c3c" strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: "var(--surface2)", padding: "20px 20px 12px" }}>
                  <div style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 3 }}>Sales Velocity</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 14 }}>Units sold monthly + cumulative tracker</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={r.months} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="var(--border)"/>
                      <XAxis dataKey="label" tick={{ fill:"var(--muted)", fontSize:9 }}/>
                      <YAxis yAxisId="l" tick={{ fill:"var(--muted)", fontSize:9 }} width={30}/>
                      <YAxis yAxisId="r" orientation="right" tick={{ fill:"var(--muted)", fontSize:9 }} width={30}/>
                      <Tooltip content={<ChartTip/>}/>
                      <Legend wrapperStyle={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em" }}/>
                      <Bar  yAxisId="l" dataKey="unitsSold"    name="Sold/Month"  fill="#c0392b" opacity={0.8}/>
                      <Line yAxisId="r" dataKey="cumUnitsSold" name="Cumulative"  stroke="#b8953a" strokeWidth={1.5} dot={false}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              </div>{/* end page1 */}

              {/* PAGE 2: Tables */}
              <div ref={page2Ref} style={{ paddingTop: 24 }}>

              {/* Flat type table */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>Flat Type Breakdown</div>
                <div style={{ border: "1px solid var(--border)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "var(--surface)" }}>
                        {["Type","Area","For Sale","Price/Flat","P1","P2","P3","P4 Turnkey","Monthly Install"].map(h => (
                          <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 8, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.types.map((ft, i) => (
                        <tr key={ft.id} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface2)" : "var(--bg)" }}>
                          <td style={{ padding: "11px 14px", fontWeight: 500 }}>
                            <span style={{ display: "inline-block", width: 2, height: 12, background: COLORS[i], marginRight: 8, verticalAlign: "middle" }}/>
                            {ft.name}
                          </td>
                          <td style={{ padding: "11px 14px", color: "var(--muted)" }}>{ft.area} m²</td>
                          <td style={{ padding: "11px 14px" }}>{ft.flatsForSale}</td>
                          <td style={{ padding: "11px 14px", fontFamily: "monospace" }}>{fmt(ft.pricePerFlat)}</td>
                          <td style={{ padding: "11px 14px", fontFamily: "monospace", color: "var(--text2)" }}>{fmt(ft.p1)}</td>
                          <td style={{ padding: "11px 14px", fontFamily: "monospace", color: "var(--text2)" }}>{fmt(ft.p2)}</td>
                          <td style={{ padding: "11px 14px", fontFamily: "monospace", color: "var(--text2)" }}>{fmt(ft.p3)}</td>
                          <td style={{ padding: "11px 14px", fontFamily: "monospace", fontWeight: 600, color: "var(--gold)" }}>{fmt(ft.p4)}</td>
                          <td style={{ padding: "11px 14px", fontFamily: "monospace", color: "var(--text2)" }}>{fmt(ft.monthlyInstallment)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 6 — Monthly income figures */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>Table 6 — Monthly Income Schedule</div>
                <div style={{ border: "1px solid var(--border)", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "var(--surface)" }}>
                        {["#","Month","Cash In","P1 (net)","P2","P3","Fixed (150)","Cash Out","Net"].map(h => (
                          <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 8, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.months.map((m, i) => (
                        <tr key={i} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "var(--surface2)" : "var(--bg)" }}>
                          <td style={{ padding: "9px 12px", color: "var(--muted)", fontSize: 10 }}>{m.month}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", fontSize: 10, color: "var(--muted)" }}>M{m.month}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", fontWeight: 600 }}>{fmt(m.cashIn)}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#c0392b" }}>{fmt(m.p1)}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#b8953a" }}>{fmt(m.p2)}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#5d6d7e" }}>{fmt(m.p3)}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#27ae60" }}>{fmt(m.fixedIncome)}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "var(--danger)" }}>{fmt(m.cashOut)}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", fontWeight: 600, color: m.net >= 0 ? "var(--green)" : "var(--danger)" }}>{fmt(m.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Parameters footer */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.2em", alignSelf: "center" }}>Active Parameters</div>
                {[
                  ["Sale Price", `$${inputs.salePricePerSqm}/m²`],
                  ["Base Cost", `$${inputs.baseCostPerSqm}/m²`],
                  ["Commission", `$${inputs.commissionPerSqm}/m²`],
                  ["Sale Prob.", `${inputs.saleProbability}%`],
                  ["Installment", `${inputs.installmentProbability}%`],
                  ["P2 Timing", `${inputs.p2Timing}mo`],
                  ["P3 Timing", `${inputs.p3Timing}mo`],
                  ["Construction", `${inputs.constructionMonths}mo`],
                  ["Phase 3", `${inputs.phase3Years}yrs`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 8, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: "var(--text2)" }}>{v}</div>
                  </div>
                ))}
              </div>

              </div>{/* end page2 */}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Enter parameters to generate analysis
            </div>
          )}
        </main>
      </div>
    </>
  );
}
