import { useState, useMemo, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from "recharts";

const SK_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZQAAAHvCAYAAABzICmiAAAwlUlEQVR4Xu3dC7wtV13Y8Xnvxzn3ndx7Q54SDL1J0MTiJ2JCK6JBDJAGJCj9oEJjS0U/rVRSWqRADQVCtG0imlYxVCsKFFAIWkUiEgihpRJ5KQ3VPAw3N6+b3HvPOfs1M/2vmT377L3P2Wfv2Xtm9jx+Ayf33nNm1uO75sx/z5q11mgaGwIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAAClRAwG5qmyxcbAghkLWBknSH5IZCmgGlo36Zr+jPTzIO0EUBgewECCmdGqQR0zTjgOM6rpFLNUlWMyiCAAAIIZC5wieToy9cVmedMhggggAACpRK4pFZz1hy7fnepakVlECiAAF1eBWgkihhPwPe19U63dRl3KfHc2BuBRQUIKIsKcnxuBWy79rbcFo6CIVBCAQJKCRu10lXSNc00ZayXbN1u+/t1XX91pT2oPAIZChBQMsQmq2wEJKCYUU66bjwjm1zJBQEECCicA6UW8OWBChsCCGQjQEDJxplcshLYEj8IKFnRkw8CBBTOgdIJ+ME0FDYEEMhagICStTj5pS8wEk/kKT0bAghkIkBAyYSZTBBAAIHyCxBQyt/G1aohNyTVam9qmysBAkqumoPCJCJAUEmEkUQQiCtAQIkrxv4IIIAAAtsKEFA4McolENydcItSrkalNkURIKAUpaUo58wChJOZqdgRgUQFCCiJcpIYAgggUF0BAkp1276cNef2pJztSq0KIUBAKUQzUUgEEEAg/wIElPy3ESVcQEDnjmUBPQ5FIJ4AASWeF3sXQCDmSl77pUr8HhSgXSli/gX4Rcp/G1HCOAIxo4mh6edK8t8bJwv2RQCB7QUIKJwZ5RMYeQfKzn1epm4edCznGkEYvJSrfCDUCIFsBAgo2TiTS7YCM9+ndP3eyU6v83op3rOyLSK5IVA+AQJK+dqUGsUTCOfW6/pV8Q5jbwQQGBcgoHBOVF0guJuRVwXfIH8cqToG9UdgEQECyiJ6HFsqAcuybilVhagMAhkLEFAyBie73AkEXV5OvaH1er3ny18vyV0JKRACBREgoBSkoSjmjAIzP46fmN4FM+bEbgggMCZAQOGUKJ3A4jGldCRUCIFMBAgomTCTybIERqakLKsQ5ItARQQIKBVp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BBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAIGYAv8fB4QhjagKEwcAAAAASUVORK5CYII=";

// ─────────────────────────────────────────────────────────────
// NALI TOWER CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────
function runNaliAnalysis(inputs) {
  const {
    salePricePerSqm, baseCostPerSqm, saleProbability, installmentProbability,
    saleMonths, constructionMonths, commissionPerSqm, p2Timing, p3Timing,
    flatTypes, monthlyCostSchedule, totalConstructionCost,
    oldFlatsCount: OLD_FLATS, oldFlatMonthly: OLD_MONTHLY,
    extraPayments = [], // [{id, name, amount, timingType: "absolute"|"afterSale", month}]
  } = inputs;

  const sp = saleProbability / 100;
  const ip = installmentProbability / 100;
  const n  = constructionMonths;

  // Per flat type: price, P4 (standard), units/month
  const types = flatTypes.map(ft => {
    const pricePerFlat = ft.area * salePricePerSqm;
    const standardP4   = pricePerFlat * (1 - 0.45) - ft.p1 - ft.p2 - ft.p3;
    return { ...ft, pricePerFlat, p4: standardP4, unitsPerMonth: (sp * ft.flatsForSale) / n };
  });

  const totalFlatsForSale = types.reduce((s, t) => s + t.flatsForSale, 0);
  if (totalFlatsForSale === 0) return null;

  // Weighted averages (weighted by flats for sale)
  const avgP1      = types.reduce((s, t) => s + t.p1 * t.flatsForSale, 0) / totalFlatsForSale;
  const avgP2      = types.reduce((s, t) => s + t.p2 * t.flatsForSale, 0) / totalFlatsForSale;
  const avgP3      = types.reduce((s, t) => s + t.p3 * t.flatsForSale, 0) / totalFlatsForSale;
  const avgInstall = types.reduce((s, t) => s + t.monthlyInstallment * t.flatsForSale, 0) / totalFlatsForSale;

  // Commission: simple average area of active types (matches Excel AVERAGE(C5:C7))
  const activeTypes   = types.filter(t => t.flatsForSale > 0);
  const simpleAvgArea = activeTypes.reduce((s, t) => s + t.area, 0) / (activeTypes.length || 1);
  const unitsPerMonth = (sp * totalFlatsForSale) / n;

  // Cost schedule
  const costSchedule = (monthlyCostSchedule && monthlyCostSchedule.length === n)
    ? monthlyCostSchedule : new Array(n).fill(totalConstructionCost / n);

  // Monthly sales: month 1 = no sale, months 2..(n+1) have sales
  const MONTHS = n + 4;
  const monthlySold = new Array(MONTHS).fill(0);
  const cumSold     = new Array(MONTHS).fill(0);
  let cumSoFar = 0;
  for (let m = 2; m <= n + 1; m++) {
    const sold = Math.min(unitsPerMonth, Math.max(0, totalFlatsForSale - cumSoFar));
    monthlySold[m] = sold;
    cumSoFar += sold;
    cumSold[m] = cumSoFar;
  }
  for (let m = n + 2; m < MONTHS; m++) cumSold[m] = cumSoFar;

  const fixedMonthlyIncome = OLD_FLATS * OLD_MONTHLY * ip;

  // Build per-month cash flow
  const months = [];
  let cumCashIn = 0, cumCashOut = 0;

  for (let m = 1; m <= n + 2; m++) {
    const sold = monthlySold[m];

    // P1 net of commission (sale months 2..n+1)
    const p1Gross    = sold * avgP1;
    const commission = sold * simpleAvgArea * commissionPerSqm;
    const p1Net      = p1Gross - commission;

    // P2: source = m-(p2Timing-1), must be sale month (>=2)
    const p2Src = m - (p2Timing - 1);
    const p2 = (p2Src >= 2 && p2Src <= n + 1) ? monthlySold[p2Src] * avgP2 * ip : 0;

    // P3: source = m-(p3Timing-1), must be sale month (>=2)
    const p3Src = m - (p3Timing - 1);
    const p3 = (p3Src >= 2 && p3Src <= n + 1) ? monthlySold[p3Src] * avgP3 * ip : 0;

    // Monthly installments: buyers from months 2...(m-1)
    const buyerMonths = Math.max(0, Math.min(m - 2, n));
    const install = m >= 3 ? unitsPerMonth * buyerMonths * ip * avgInstall : 0;

    // Fixed income (months 2..n+1)
    const fixedIncome = (m >= 2 && m <= n + 1) ? fixedMonthlyIncome : 0;

    // Extra payments (P4, P5, ...)
    let extraIncome = 0;
    const extraBreakdown = {};
    for (const ep of extraPayments) {
      if (!ep.amount || ep.amount === 0) continue;
      let income = 0;
      if (ep.timingType === "absolute") {
        // Paid at a specific construction month (absolute)
        if (m === ep.month) {
          income = cumSold[m] * ep.amount * sp * ip;
        }
      } else {
        // Paid N months after sale (like P2/P3)
        // Source = m - (ep.month - 1), must be sale month
        const epSrc = m - (ep.month - 1);
        if (epSrc >= 2 && epSrc <= n + 1) {
          income = monthlySold[epSrc] * ep.amount * ip;
        }
      }
      extraIncome += income;
      extraBreakdown[ep.id] = Math.round(income);
    }

    const cashIn  = Math.round(p1Net + p2 + p3 + install + fixedIncome + extraIncome);
    const cashOut = (m - 1 < costSchedule.length) ? Math.round(costSchedule[m - 1]) : 0;
    const net     = cashIn - cashOut;
    cumCashIn  += cashIn;
    cumCashOut += cashOut;

    months.push({
      month: m, label: `M${m}`,
      cashIn, p1: Math.round(p1Net), p2: Math.round(p2), p3: Math.round(p3),
      fixedIncome: Math.round(fixedIncome), install: Math.round(install),
      extraIncome: Math.round(extraIncome), extraBreakdown,
      cashOut, net,
      cumCashIn: Math.round(cumCashIn), cumCashOut: Math.round(cumCashOut),
      unitsSold: Math.round(monthlySold[m] * 100) / 100,
      cumUnitsSold: Math.round(cumSold[m] * 100) / 100,
    });
  }

  // Summary metrics
  const totalRevPhase1 = months.slice(1, n + 1).reduce((s, m) => s + m.cashIn, 0);

  // Phase 3: remaining balance (price - P1 - P3 - P4 - P2) × flats
  const totalRevPhase3 = Math.round(
    types.reduce((s, t) => {
      const ku = t.pricePerFlat - t.p1 - t.p3 - t.p4 - t.p2;
      return s + Math.max(0, ku) * t.flatsForSale;
    }, 0)
  );

  // Phase 2 (IR9+JM9+KM9+KR9)
  const ir9 = types.reduce((s, t) => s + t.flatsForSale * sp * ip * t.p2, 0);
  const jm9 = types.reduce((s, t) => s + t.flatsForSale * sp * ip * t.p3, 0);
  const km9 = types.reduce((s, t) => {
    const upm = (sp * t.flatsForSale) / n;
    return s + upm * ip * t.monthlyInstallment * (n * (n + 1) / 2);
  }, 0);
  const kr9 = types.reduce((s, t) => s + t.p4 * t.flatsForSale * sp * ip, 0);
  const totalRevPhase2 = Math.round(ir9 + jm9 + km9 + kr9);

  const totalRevenue   = totalRevPhase1 + totalRevPhase2;
  const requireFunding = Math.max(0, totalConstructionCost - totalRevPhase1);
  const remainingCost  = Math.max(0, totalConstructionCost - totalRevenue);
  const revenueVsCost  = totalRevenue / totalConstructionCost;

  const profitFromMargin = (salePricePerSqm - baseCostPerSqm - commissionPerSqm) * (totalConstructionCost / 600);
  const netCost         = Math.round(totalConstructionCost + profitFromMargin);
  const investorProfit  = Math.round(0.25 * netCost);
  const profitPct       = Math.round((investorProfit / netCost) * 100 * 10) / 10;
  const flatsRemaining  = Math.max(0, Math.round(totalFlatsForSale * (1 - sp)));
  const peakFundingGap  = Math.abs(Math.min(...months.map(m => m.net)));
  const totalCommission = Math.round(cumSoFar * simpleAvgArea * commissionPerSqm);

  return {
    types, months: months.slice(0, n + 2),
    totalFlatsForSale, cumUnitsSold: Math.round(cumSoFar),
    totalRevPhase1: Math.round(totalRevPhase1), totalRevPhase2, totalRevPhase3,
    totalRevenue: Math.round(totalRevenue), revenueVsCost: Math.round(revenueVsCost * 100),
    remainingCost, requireFunding: Math.round(requireFunding),
    netCost, investorProfit, profitPct,
    flatsRemaining, peakFundingGap: Math.round(peakFundingGap),
    totalCommission, fixedMonthlyIncome: Math.round(fixedMonthlyIncome),
    monthlyBurn: Math.round(totalConstructionCost / n), monthlyCosts: costSchedule,
  };
}

function makeFlatBurn(totalCost, n) {
  const burn = Math.round(totalCost / n);
  const arr = new Array(n).fill(burn);
  arr[arr.length - 1] += totalCost - arr.reduce((s, v) => s + v, 0);
  return arr;
}

// ─────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────
const DEFAULT_INPUTS = {
  salePricePerSqm: 811, baseCostPerSqm: 811,
  saleProbability: 80, installmentProbability: 70,
  saleMonths: 9, constructionMonths: 9,
  commissionPerSqm: 30, p2Timing: 3, p3Timing: 7,
  phase3Years: 5, totalConstructionCost: 8379750,
  oldFlatsCount: 150, oldFlatMonthly: 750,
  monthlyCostSchedule: [418987.5,418987.5,502785,670380,670380,670380,586582.5,586582.5,586582.5],
  extraPayments: [],
  flatTypes: [
    { id:1, name:"Type A – 223m²", area:223, floorsCount:1, unitsPerFloor:165, flatsForSale:95,  p1:35000, p2:20000, p3:10000, monthlyInstallment:500 },
    { id:2, name:"Type B – 201m²", area:201, floorsCount:1, unitsPerFloor:76,  flatsForSale:38,  p1:30000, p2:20000, p3:10000, monthlyInstallment:500 },
    { id:3, name:"Type C – 164m²", area:164, floorsCount:1, unitsPerFloor:83,  flatsForSale:27,  p1:25000, p2:20000, p3:70000, monthlyInstallment:500 },
    { id:4, name:"Type D – 108m²", area:108, floorsCount:1, unitsPerFloor:9,   flatsForSale:0,   p1:0,     p2:0,     p3:0,     monthlyInstallment:500 },
  ],
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const fmt  = n => n == null ? "—" : "$" + Math.abs(Math.round(n)).toLocaleString();
const fmtN = n => n == null ? "—" : (+n).toLocaleString("en-US", { maximumFractionDigits:1 });
const fmtP = n => n == null ? "—" : Math.round(n) + "%";
const COLORS = ["#c0392b","#b8953a","#5d6d7e","#7f8c8d","#8e44ad","#16a085","#d35400","#2980b9"];

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────
function InlineField({ label, value, onChange, prefix, suffix, type="number", min, step }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:10 }}>
      {label && <div style={{ fontSize:9, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.18em" }}>{label}</div>}
      <div style={{ display:"flex" }}>
        {prefix && <span style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRight:"none", padding:"5px 8px", fontSize:11, color:"var(--muted)", display:"flex", alignItems:"center" }}>{prefix}</span>}
        <input type={type} value={value} min={min} step={step}
          onChange={e => onChange(type==="number" ? (parseFloat(e.target.value)||0) : e.target.value)}
          style={{ flex:1, background:"var(--input-bg)", border:"1px solid var(--border)", borderLeft:prefix?"none":undefined, borderRight:suffix?"none":undefined, padding:"5px 8px", fontSize:11, color:"var(--text)", outline:"none", fontFamily:"Calibri,sans-serif", minWidth:0 }}
        />
        {suffix && <span style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderLeft:"none", padding:"5px 7px", fontSize:11, color:"var(--muted)", display:"flex", alignItems:"center" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, topColor, negative }) {
  return (
    <div style={{ background:"var(--surface)", padding:"16px 18px", position:"relative", overflow:"hidden" }}>
      {topColor && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:topColor }} />}
      <div style={{ fontSize:8, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:400, fontFamily:"Calibri,sans-serif", color:negative?"var(--danger)":"var(--text)", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:"var(--muted)", marginTop:5 }}>{sub}</div>}
    </div>
  );
}

const ChartTip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", padding:"8px 12px", fontSize:11 }}>
      <div style={{ fontWeight:600, color:"var(--muted)", marginBottom:5, fontSize:9 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:p.color, flexShrink:0 }}/>
          <span style={{ color:"var(--muted)", fontSize:9 }}>{p.name}:</span>
          <span style={{ fontWeight:600, fontFamily:"monospace" }}>{Math.abs(p.value)>100?fmt(p.value):fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
function Sidebar({ inputs, setInputs, results, onClose }) {
  const [openSection, setOpenSection] = useState("params");

  const upd    = useCallback((key,val) => setInputs(prev => ({...prev,[key]:val})),[setInputs]);
  const updFt  = useCallback((id,key,val) => setInputs(prev => ({...prev,flatTypes:prev.flatTypes.map(ft=>ft.id===id?{...ft,[key]:val}:ft)})),[setInputs]);
  const updEp  = useCallback((id,key,val) => setInputs(prev => ({...prev,extraPayments:prev.extraPayments.map(ep=>ep.id===id?{...ep,[key]:val}:ep)})),[setInputs]);
  const updSch = useCallback((idx,val) => setInputs(prev => { const next=[...prev.monthlyCostSchedule]; next[idx]=val; return {...prev,monthlyCostSchedule:next}; }),[setInputs]);

  const addFlatType = () => {
    const newFt = { id:Date.now(), name:`Type ${String.fromCharCode(65+inputs.flatTypes.length)}`, area:0, floorsCount:1, unitsPerFloor:0, flatsForSale:0, p1:0, p2:0, p3:0, monthlyInstallment:0 };
    setInputs(prev => ({...prev, flatTypes:[...prev.flatTypes, newFt]}));
  };
  const removeFlatType = id => setInputs(prev => ({...prev, flatTypes:prev.flatTypes.filter(ft=>ft.id!==id)}));

  const addExtraPayment = () => {
    const count = inputs.extraPayments.length + 4; // P4, P5, ...
    const newEp = { id:Date.now(), name:`P${count}`, amount:0, timingType:"afterSale", month:4 };
    setInputs(prev => ({...prev, extraPayments:[...prev.extraPayments, newEp]}));
  };
  const removeExtraPayment = id => setInputs(prev => ({...prev, extraPayments:prev.extraPayments.filter(ep=>ep.id!==id)}));

  const schedule = inputs.monthlyCostSchedule || makeFlatBurn(inputs.totalConstructionCost, inputs.constructionMonths);
  const scheduleTotal = schedule.reduce((s,v)=>s+v,0);
  const scheduleDiff  = scheduleTotal - inputs.totalConstructionCost;
  const toggle = s => setOpenSection(prev => prev===s?null:s);

  return (
    <aside style={{ width:380, flexShrink:0, height:"100vh", overflowY:"auto", background:"var(--surface)", borderRight:"1px solid var(--border)", position:"sticky", top:0, display:"flex", flexDirection:"column" }}>
      {/* Logo */}
      <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <img src={SK_LOGO} alt="SK Estate" style={{ height:72, objectFit:"contain" }} />
          <button onClick={onClose} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:22, lineHeight:1, padding:4 }}>×</button>
        </div>
        <div style={{ marginTop:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text)" }}>Nali Tower</div>
          <div style={{ fontSize:8, color:"var(--muted)", letterSpacing:"0.15em", textTransform:"uppercase" }}>Feasibility Analysis</div>
        </div>
      </div>

      {/* Fixed income banner */}
      <div style={{ padding:"10px 18px", background:"rgba(184,149,58,0.08)", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
        <div style={{ fontSize:9, color:"var(--gold)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:3 }}>Fixed — Already Sold</div>
        <div style={{ fontSize:11, color:"var(--text2)" }}>
          {inputs.oldFlatsCount} flats × {fmt(inputs.oldFlatMonthly)}/mo
          <span style={{ color:"var(--gold)", fontFamily:"monospace", marginLeft:6 }}>{results?fmt(results.fixedMonthlyIncome):"—"}/mo</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingBottom:40 }}>

        {/* TABLE 5: Global Params */}
        <div style={{ borderBottom:"1px solid var(--border)" }}>
          <button onClick={()=>toggle("params")} style={{ width:"100%", padding:"12px 18px", background:"transparent", border:"none", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
            <span style={{ fontSize:9, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.18em" }}>Table 5 — Global Parameters</span>
            <span style={{ color:"var(--muted)" }}>{openSection==="params"?"−":"+"}</span>
          </button>
          {openSection==="params" && (
            <div style={{ padding:"4px 18px 14px" }}>
              <InlineField label="Base Line Cost / m²"                   prefix="$"    value={inputs.baseCostPerSqm}        onChange={v=>upd("baseCostPerSqm",v)} />
              <InlineField label="NEW Sale Cost / m²"                    prefix="$"    value={inputs.salePricePerSqm}       onChange={v=>upd("salePricePerSqm",v)} />
              <InlineField label="Sale Probability During Construction"   suffix="%"   value={inputs.saleProbability}       onChange={v=>upd("saleProbability",v)} />
              <InlineField label="Installment Income Probability"        suffix="%"    value={inputs.installmentProbability} onChange={v=>upd("installmentProbability",v)} />
              <InlineField label="Month for Sale Target"                              value={inputs.saleMonths}             onChange={v=>upd("saleMonths",v)} min={1} />
              <InlineField label="Month for Construction + Sale @ Key"               value={inputs.constructionMonths}     onChange={v=>upd("constructionMonths",v)} min={1} />
              <InlineField label="Commission per m²"                     prefix="$"    value={inputs.commissionPerSqm}      onChange={v=>upd("commissionPerSqm",v)} />
              <InlineField label="P2 Duration (months)"                              value={inputs.p2Timing}               onChange={v=>upd("p2Timing",v)} min={1} />
              <InlineField label="P3 Duration (months)"                              value={inputs.p3Timing}               onChange={v=>upd("p3Timing",v)} min={1} />
              <InlineField label="Phase 3 Duration (years)"              suffix="yrs" value={inputs.phase3Years}           onChange={v=>upd("phase3Years",v)} min={1} />
            </div>
          )}
        </div>

        {/* TABLE 1: Flat Types */}
        <div style={{ borderBottom:"1px solid var(--border)" }}>
          <button onClick={()=>toggle("flats")} style={{ width:"100%", padding:"12px 18px", background:"transparent", border:"none", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
            <span style={{ fontSize:9, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.18em" }}>Table 1 — Flat Types ({inputs.flatTypes.length})</span>
            <span style={{ color:"var(--muted)" }}>{openSection==="flats"?"−":"+"}</span>
          </button>
          {openSection==="flats" && (
            <div style={{ padding:"4px 0 14px" }}>
              {inputs.flatTypes.map((ft,idx) => {
                const rft = results?.types[idx];
                const key = `ft-${ft.id}`;
                return (
                  <div key={ft.id} style={{ borderLeft:`2px solid ${COLORS[idx%COLORS.length]}`, margin:"8px 18px", padding:"10px 12px", background:"var(--bg)" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <input value={ft.name} onChange={e=>updFt(ft.id,"name",e.target.value)}
                        style={{ fontSize:11, fontWeight:700, background:"transparent", border:"none", outline:"none", color:"var(--text)", flex:1 }} />
                      {inputs.flatTypes.length > 1 && (
                        <button onClick={()=>removeFlatType(ft.id)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:16, padding:2 }}>×</button>
                      )}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                      <InlineField label="Area (m²)"      suffix="m²" value={ft.area}         onChange={v=>updFt(ft.id,"area",v)} min={0} />
                      <InlineField label="Flats for Sale"             value={ft.flatsForSale}  onChange={v=>updFt(ft.id,"flatsForSale",v)} min={0} />
                      <InlineField label="P1"             prefix="$"  value={ft.p1}            onChange={v=>updFt(ft.id,"p1",v)} />
                      <InlineField label="P2"             prefix="$"  value={ft.p2}            onChange={v=>updFt(ft.id,"p2",v)} />
                      <InlineField label="P3"             prefix="$"  value={ft.p3}            onChange={v=>updFt(ft.id,"p3",v)} />
                      <InlineField label="Monthly Install" prefix="$" value={ft.monthlyInstallment} onChange={v=>updFt(ft.id,"monthlyInstallment",v)} />
                    </div>
                    {rft && (
                      <div style={{ fontSize:10, color:"var(--muted)", marginTop:6, display:"flex", gap:14 }}>
                        <span>P4: <strong style={{ color:"var(--gold)", fontFamily:"monospace" }}>{fmt(rft.p4)}</strong></span>
                        <span>Price: <strong style={{ fontFamily:"monospace", color:"var(--text2)" }}>{fmt(rft.pricePerFlat)}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ padding:"8px 18px 0" }}>
                <button onClick={addFlatType} style={{ width:"100%", background:"transparent", border:"1px dashed var(--border)", color:"var(--muted)", padding:"8px", fontSize:9, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.15em" }}>+ Add Flat Type</button>
              </div>
            </div>
          )}
        </div>

        {/* Extra Payments (P4, P5, ...) */}
        <div style={{ borderBottom:"1px solid var(--border)" }}>
          <button onClick={()=>toggle("extra")} style={{ width:"100%", padding:"12px 18px", background:"transparent", border:"none", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
            <span style={{ fontSize:9, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.18em" }}>Extra Payments — P4, P5... ({inputs.extraPayments.length})</span>
            <span style={{ color:"var(--muted)" }}>{openSection==="extra"?"−":"+"}</span>
          </button>
          {openSection==="extra" && (
            <div style={{ padding:"4px 0 14px" }}>
              {inputs.extraPayments.length === 0 && (
                <div style={{ padding:"8px 18px", fontSize:10, color:"var(--muted)" }}>No extra payments yet. Add one below.</div>
              )}
              {inputs.extraPayments.map((ep,idx) => (
                <div key={ep.id} style={{ borderLeft:`2px solid ${COLORS[(idx+4)%COLORS.length]}`, margin:"8px 18px", padding:"10px 12px", background:"var(--bg)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <input value={ep.name} onChange={e=>updEp(ep.id,"name",e.target.value)}
                      style={{ fontSize:11, fontWeight:700, background:"transparent", border:"none", outline:"none", color:"var(--text)", flex:1 }} />
                    <button onClick={()=>removeExtraPayment(ep.id)} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:16, padding:2 }}>×</button>
                  </div>
                  <InlineField label="Amount per flat" prefix="$" value={ep.amount} onChange={v=>updEp(ep.id,"amount",v)} />
                  {/* Timing type toggle */}
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:9, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.18em", marginBottom:5 }}>Timing Type</div>
                    <div style={{ display:"flex", gap:0 }}>
                      {[["afterSale","After Sale (months)"],["absolute","At Construction Month"]].map(([val,lbl]) => (
                        <button key={val} onClick={()=>updEp(ep.id,"timingType",val)} style={{
                          flex:1, padding:"6px 8px", border:"1px solid var(--border)", background:ep.timingType===val?"var(--accent)":"transparent",
                          color:ep.timingType===val?"#fff":"var(--muted)", fontSize:9, cursor:"pointer", fontWeight:600,
                          borderRight: val==="afterSale" ? "none" : undefined,
                        }}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                  <InlineField
                    label={ep.timingType==="afterSale" ? "Months after sale" : "Construction month #"}
                    suffix="mo"
                    value={ep.month}
                    onChange={v=>updEp(ep.id,"month",v)}
                    min={1}
                  />
                  <div style={{ fontSize:9, color:"var(--muted)", marginTop:4, lineHeight:1.4 }}>
                    {ep.timingType==="afterSale"
                      ? `Collected ${ep.month} months after each sale contract`
                      : `Collected in construction month ${ep.month} from all sold flats`}
                  </div>
                </div>
              ))}
              <div style={{ padding:"8px 18px 0" }}>
                <button onClick={addExtraPayment} style={{ width:"100%", background:"transparent", border:"1px dashed var(--border)", color:"var(--muted)", padding:"8px", fontSize:9, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.15em" }}>+ Add Payment Stage</button>
              </div>
            </div>
          )}
        </div>

        {/* Construction Cost Schedule */}
        <div style={{ borderBottom:"1px solid var(--border)" }}>
          <button onClick={()=>toggle("schedule")} style={{ width:"100%", padding:"12px 18px", background:"transparent", border:"none", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
            <span style={{ fontSize:9, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.18em" }}>Construction Cost Schedule</span>
            <span style={{ color:"var(--muted)" }}>{openSection==="schedule"?"−":"+"}</span>
          </button>
          {openSection==="schedule" && (
            <div style={{ padding:"4px 18px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:10, color:Math.abs(scheduleDiff)>100?"var(--danger)":"var(--green)" }}>
                  Total: {fmt(scheduleTotal)} {Math.abs(scheduleDiff)>100?`(${scheduleDiff>0?"+":""}${Math.round(scheduleDiff).toLocaleString()})`:"✓"}
                </span>
                <button onClick={()=>upd("monthlyCostSchedule",makeFlatBurn(inputs.totalConstructionCost,inputs.constructionMonths))}
                  style={{ fontSize:8, background:"transparent", border:"none", color:"var(--muted)", cursor:"pointer", textTransform:"uppercase" }}>Reset</button>
              </div>
              <InlineField label="Total Construction Budget" prefix="$" value={inputs.totalConstructionCost} onChange={v=>upd("totalConstructionCost",v)} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {schedule.map((amt,i) => (
                  <div key={i}>
                    <div style={{ fontSize:8, color:"var(--muted)", marginBottom:2 }}>Month {i+1}</div>
                    <div style={{ display:"flex" }}>
                      <span style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRight:"none", padding:"4px 5px", fontSize:9, color:"var(--muted)" }}>$</span>
                      <input type="number" value={Math.round(amt)} onChange={e=>updSch(i,parseFloat(e.target.value)||0)}
                        style={{ width:"100%", background:"var(--input-bg)", border:"1px solid var(--border)", borderLeft:"none", padding:"4px 6px", fontSize:10, color:"var(--text)", outline:"none", fontFamily:"monospace" }}
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
  const [inputs, setInputs]               = useState(DEFAULT_INPUTS);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [exporting, setExporting]         = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const results = useMemo(() => {
    try { return runNaliAnalysis(inputs); } catch(e) { console.error(e); return null; }
  }, [inputs]);
  const r = results;

  async function loadH2C() {
    if (window.html2canvas) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    document.head.appendChild(s);
    await new Promise(res => s.onload = res);
  }
  async function captureEl(el, filename) {
    await loadH2C();
    const canvas = await window.html2canvas(el,{scale:2,useCORS:true,backgroundColor:"#f5f2ee",logging:false});
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href=url; a.download=filename; document.body.appendChild(a); a.click();
      document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url),1000);
    },"image/png");
  }
  async function exportOnePage() {
    setShowExportMenu(false); setExporting(true);
    const el = document.getElementById("nali-dashboard");
    if (el) await captureEl(el,`Nali-Tower-${new Date().toISOString().slice(0,10)}.png`);
    setExporting(false);
  }
  async function exportTwoPages() {
    setShowExportMenu(false); setExporting(true);
    const date = new Date().toISOString().slice(0,10);
    const p1 = document.getElementById("nali-page1"); if (p1) await captureEl(p1,`Nali-Tower-Page1-${date}.png`);
    await new Promise(res=>setTimeout(res,1000));
    const p2 = document.getElementById("nali-page2"); if (p2) await captureEl(p2,`Nali-Tower-Page2-${date}.png`);
    setExporting(false);
  }

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#f5f2ee;--surface:#ffffff;--surface2:#f0ece7;--border:#e0dbd4;--text:#1a1816;--text2:#4a4540;--muted:#9a9088;--accent:#c0392b;--gold:#b8953a;--green:#27ae60;--danger:#e74c3c;--input-bg:#f8f5f1;}
        body{background:var(--bg);color:var(--text);font-family:Calibri,sans-serif;-webkit-font-smoothing:antialiased}
        input:focus{outline:1px solid var(--accent)!important}
        input[type=number]::-webkit-inner-spin-button{opacity:.2}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--border)}
        button{font-family:Calibri,sans-serif}
      `}</style>

      <div style={{ display:"flex", height:"100vh", overflow:"hidden", position:"relative" }}>
        {sidebarOpen && <div onClick={()=>setSidebarOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", zIndex:40 }}/>}
        <div style={{ position:"fixed", top:0, left:0, height:"100vh", zIndex:50, transform:sidebarOpen?"translateX(0)":"translateX(-100%)", transition:"transform 0.25s ease", boxShadow:sidebarOpen?"4px 0 20px rgba(0,0,0,0.12)":"none" }}>
          <Sidebar inputs={inputs} setInputs={setInputs} results={r} onClose={()=>setSidebarOpen(false)} />
        </div>

        <main style={{ flex:1, overflowY:"auto", background:"var(--bg)" }}>
          {r ? (
            <div id="nali-dashboard" style={{ padding:"32px 36px 80px" }}>

              {/* Header */}
              <div style={{ marginBottom:28, borderBottom:"1px solid var(--border)", paddingBottom:20 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                    <img src={SK_LOGO} alt="SK Estate" style={{ height:90, objectFit:"contain", flexShrink:0 }}/>
                    <div>
                      <div style={{ fontSize:8, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.25em", marginBottom:6 }}>SKE-Plan Study</div>
                      <h1 style={{ fontSize:38, fontWeight:300, letterSpacing:"0.04em", lineHeight:1 }}>Nali Tower</h1>
                      <p style={{ fontSize:9, color:"var(--muted)", marginTop:8, letterSpacing:"0.15em", textTransform:"uppercase" }}>
                        {r.totalFlatsForSale} Flats · {inputs.constructionMonths}-Month Construction
                      </p>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <div style={{ position:"relative" }}>
                      <button onClick={()=>setShowExportMenu(m=>!m)} disabled={!!exporting} style={{ background:"var(--accent)", border:"none", color:"#fff", padding:"9px 16px", cursor:"pointer", fontSize:9, fontWeight:600, letterSpacing:"0.15em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:6 }}>
                        <span>↓</span>{exporting?"Exporting...":"Export PNG ▾"}
                      </button>
                      {showExportMenu && (
                        <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background:"var(--surface)", border:"1px solid var(--border)", zIndex:200, minWidth:160, boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
                          <button onClick={exportOnePage}  style={{ width:"100%", padding:"10px 16px", background:"transparent", border:"none", borderBottom:"1px solid var(--border)", textAlign:"left", cursor:"pointer", fontSize:10, color:"var(--text)", fontWeight:600, textTransform:"uppercase" }}>↓ 1 Page (full)</button>
                          <button onClick={exportTwoPages} style={{ width:"100%", padding:"10px 16px", background:"transparent", border:"none", textAlign:"left", cursor:"pointer", fontSize:10, color:"var(--text)", fontWeight:600, textTransform:"uppercase" }}>↓ 2 Pages (split)</button>
                        </div>
                      )}
                    </div>
                    <button onClick={()=>setSidebarOpen(true)} style={{ background:"var(--surface)", border:"1px solid var(--border)", padding:"10px 14px", cursor:"pointer", display:"flex", flexDirection:"column", gap:5 }}>
                      <span style={{ display:"block", width:20, height:1.5, background:"var(--text)" }}/>
                      <span style={{ display:"block", width:20, height:1.5, background:"var(--text)" }}/>
                      <span style={{ display:"block", width:20, height:1.5, background:"var(--text)" }}/>
                    </button>
                  </div>
                </div>

                {/* 4 Key Metrics */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, background:"var(--border)" }}>
                  {[
                    ["Require Funding For Phase 1", fmt(r.requireFunding), "#fff3cd", "#856404"],
                    ["Cost Income in Phase 1",      fmt(r.totalRevPhase1), "#d4edda", "#155724"],
                    ["Cost Income in Phase 2 @ Key",fmt(r.totalRevPhase2), "#d4edda", "#b8953a"],
                    ["Cost Income in Phase 3 After Key",fmt(r.totalRevPhase3),"#d4edda","#155724"],
                  ].map(([l,v,bg,col]) => (
                    <div key={l} style={{ background:bg, padding:"14px 18px" }}>
                      <div style={{ fontSize:9, color:col, fontWeight:600, marginBottom:6, lineHeight:1.4 }}>{l}</div>
                      <div style={{ fontSize:22, fontWeight:700, color:col }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div id="nali-page1">
                {/* Summary row */}
                <div style={{ background:"var(--surface)", border:"1px solid var(--border)", padding:"14px 18px", marginBottom:18, display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14 }}>
                  {[
                    ["Total Cost",          fmt(inputs.totalConstructionCost), "Construction budget"],
                    ["Revenue % @ Handover",fmtP(r.revenueVsCost),            "Phase 1+2 vs cost"],
                    ["Remaining Cost",       fmt(r.remainingCost),             "After all payments"],
                    ["Investor Profit",      fmt(r.investorProfit),            `${r.profitPct}% of net cost`],
                    ["Require Funding",      fmt(r.requireFunding),            "Gap to fund"],
                  ].map(([l,v,s])=>(
                    <div key={l}>
                      <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:6 }}>{l}</div>
                      <div style={{ fontSize:15, fontWeight:400, color:"var(--text)" }}>{v}</div>
                      <div style={{ fontSize:9, color:"var(--muted)", marginTop:3 }}>{s}</div>
                    </div>
                  ))}
                </div>

                {/* KPIs */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, marginBottom:1, background:"var(--border)" }}>
                  <KpiCard label="Net Cost"              value={fmt(r.netCost)}        topColor="var(--accent)" sub="Construction + margin"/>
                  <KpiCard label="Total Revenue (Ph1+2)" value={fmt(r.totalRevenue)}   topColor="var(--green)"  sub="During build + turnkey"/>
                  <KpiCard label="Flats For Sale"        value={fmtN(r.totalFlatsForSale)} topColor="var(--gold)" sub={`${fmtN(r.cumUnitsSold)} sold @ ${inputs.saleProbability}%`}/>
                  <KpiCard label="Flats Remaining @ Key" value={fmtN(r.flatsRemaining)} sub={`of ${r.totalFlatsForSale} targeted`}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, marginBottom:24, background:"var(--border)" }}>
                  <KpiCard label="Revenue Phase 1"       value={fmt(r.totalRevPhase1)}    sub="P1+P2+P3+install+fixed"/>
                  <KpiCard label="Revenue Phase 2 @ Key" value={fmt(r.totalRevPhase2)}    sub="P4 turnkey payments"/>
                  <KpiCard label="Peak Monthly Gap"      value={fmt(r.peakFundingGap)} negative sub="Worst single month"/>
                  <KpiCard label="Fixed Income (150)"    value={fmt(r.fixedMonthlyIncome)} sub="Per month" topColor="var(--gold)"/>
                </div>

                {/* Charts */}
                <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:1, marginBottom:1, background:"var(--border)" }}>
                  <div style={{ background:"var(--surface)", padding:"18px 18px 12px" }}>
                    <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:3 }}>Cash Flow Timeline</div>
                    <div style={{ fontSize:9, color:"var(--muted)", marginBottom:14 }}>Monthly income vs construction cost vs net position</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={r.months} margin={{top:4,right:4,bottom:0,left:0}}>
                        <defs>
                          <linearGradient id="gin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#27ae60" stopOpacity={0.15}/><stop offset="95%" stopColor="#27ae60" stopOpacity={0}/></linearGradient>
                          <linearGradient id="gout" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e74c3c" stopOpacity={0.1}/><stop offset="95%" stopColor="#e74c3c" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="var(--border)"/>
                        <XAxis dataKey="label" tick={{fill:"var(--muted)",fontSize:9}}/>
                        <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fill:"var(--muted)",fontSize:9}} width={52}/>
                        <Tooltip content={<ChartTip/>}/>
                        <Legend wrapperStyle={{fontSize:8,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}/>
                        <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1}/>
                        <Area type="monotone" dataKey="cashIn"  name="Cash In"     stroke="#27ae60" fill="url(#gin)"  strokeWidth={1.5} dot={false}/>
                        <Area type="monotone" dataKey="cashOut" name="Cash Out"    stroke="#e74c3c" fill="url(#gout)" strokeWidth={1.5} dot={false}/>
                        <Line type="monotone" dataKey="net"     name="Net Funding" stroke="#b8953a" strokeWidth={1.5} dot={false} strokeDasharray="4 3"/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ background:"var(--surface)", padding:"18px 18px 12px" }}>
                    <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:3 }}>Income Breakdown</div>
                    <div style={{ fontSize:9, color:"var(--muted)", marginBottom:14 }}>P1 / P2 / P3 / Fixed / Extra per month</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={r.months} margin={{top:4,right:4,bottom:0,left:0}}>
                        <CartesianGrid strokeDasharray="2 4" stroke="var(--border)"/>
                        <XAxis dataKey="label" tick={{fill:"var(--muted)",fontSize:9}}/>
                        <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fill:"var(--muted)",fontSize:9}} width={48}/>
                        <Tooltip content={<ChartTip/>}/>
                        <Legend wrapperStyle={{fontSize:8,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}/>
                        <Bar dataKey="p1"          name="P1 Initial"        stackId="a" fill="#c0392b"/>
                        <Bar dataKey="p2"          name="P2 Payment"        stackId="a" fill="#b8953a"/>
                        <Bar dataKey="p3"          name="P3 Payment"        stackId="a" fill="#5d6d7e"/>
                        <Bar dataKey="fixedIncome" name="Fixed (150 flats)" stackId="a" fill="#27ae60"/>
                        {inputs.extraPayments.length > 0 && <Bar dataKey="extraIncome" name="Extra Payments" stackId="a" fill="#8e44ad"/>}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, marginBottom:24, background:"var(--border)" }}>
                  <div style={{ background:"var(--surface2)", padding:"18px 18px 12px" }}>
                    <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:3 }}>Cumulative Position</div>
                    <div style={{ fontSize:9, color:"var(--muted)", marginBottom:14 }}>Running totals — cash in vs cost paid</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={r.months} margin={{top:4,right:4,bottom:0,left:0}}>
                        <defs><linearGradient id="gcin" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#b8953a" stopOpacity={0.15}/><stop offset="95%" stopColor="#b8953a" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="var(--border)"/>
                        <XAxis dataKey="label" tick={{fill:"var(--muted)",fontSize:9}}/>
                        <YAxis tickFormatter={v=>`$${(v/1000000).toFixed(1)}M`} tick={{fill:"var(--muted)",fontSize:9}} width={46}/>
                        <Tooltip content={<ChartTip/>}/>
                        <Legend wrapperStyle={{fontSize:8,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}/>
                        <Area type="monotone" dataKey="cumCashIn"  name="Cum. Cash In" stroke="#b8953a" fill="url(#gcin)" strokeWidth={1.5} dot={false}/>
                        <Line type="monotone" dataKey="cumCashOut" name="Cum. Cost"     stroke="#e74c3c" strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ background:"var(--surface2)", padding:"18px 18px 12px" }}>
                    <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:3 }}>Sales Velocity</div>
                    <div style={{ fontSize:9, color:"var(--muted)", marginBottom:14 }}>Units sold monthly + cumulative</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={r.months} margin={{top:4,right:4,bottom:0,left:0}}>
                        <CartesianGrid strokeDasharray="2 4" stroke="var(--border)"/>
                        <XAxis dataKey="label" tick={{fill:"var(--muted)",fontSize:9}}/>
                        <YAxis yAxisId="l" tick={{fill:"var(--muted)",fontSize:9}} width={30}/>
                        <YAxis yAxisId="r" orientation="right" tick={{fill:"var(--muted)",fontSize:9}} width={30}/>
                        <Tooltip content={<ChartTip/>}/>
                        <Legend wrapperStyle={{fontSize:8,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}/>
                        <Bar  yAxisId="l" dataKey="unitsSold"    name="Sold/Month" fill="#c0392b" opacity={0.8}/>
                        <Line yAxisId="r" dataKey="cumUnitsSold" name="Cumulative" stroke="#b8953a" strokeWidth={1.5} dot={false}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div id="nali-page2">
                {/* Flat type table */}
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:12 }}>Flat Type Breakdown</div>
                  <div style={{ border:"1px solid var(--border)" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                      <thead>
                        <tr style={{ background:"var(--surface)" }}>
                          {["Type","Area","For Sale","Price/Flat","P1","P2","P3","P4 (std)","Monthly",...(inputs.extraPayments.map(ep=>ep.name))].map(h=>(
                            <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:8, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em", borderBottom:"1px solid var(--border)", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {r.types.map((ft,i)=>(
                          <tr key={ft.id} style={{ borderTop:"1px solid var(--border)", background:i%2===0?"var(--surface2)":"var(--bg)" }}>
                            <td style={{ padding:"10px 12px", fontWeight:500 }}><span style={{ display:"inline-block", width:2, height:12, background:COLORS[i%COLORS.length], marginRight:8, verticalAlign:"middle" }}/>{ft.name}</td>
                            <td style={{ padding:"10px 12px", color:"var(--muted)" }}>{ft.area}m²</td>
                            <td style={{ padding:"10px 12px" }}>{ft.flatsForSale}</td>
                            <td style={{ padding:"10px 12px", fontFamily:"monospace" }}>{fmt(ft.pricePerFlat)}</td>
                            <td style={{ padding:"10px 12px", fontFamily:"monospace", color:"var(--text2)" }}>{fmt(ft.p1)}</td>
                            <td style={{ padding:"10px 12px", fontFamily:"monospace", color:"var(--text2)" }}>{fmt(ft.p2)}</td>
                            <td style={{ padding:"10px 12px", fontFamily:"monospace", color:"var(--text2)" }}>{fmt(ft.p3)}</td>
                            <td style={{ padding:"10px 12px", fontFamily:"monospace", fontWeight:600, color:"var(--gold)" }}>{fmt(ft.p4)}</td>
                            <td style={{ padding:"10px 12px", fontFamily:"monospace", color:"var(--text2)" }}>{fmt(ft.monthlyInstallment)}</td>
                            {inputs.extraPayments.map(ep=>(
                              <td key={ep.id} style={{ padding:"10px 12px", fontFamily:"monospace", color:"#8e44ad" }}>{fmt(ep.amount)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monthly income table */}
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:12 }}>Table 6 — Monthly Income Schedule</div>
                  <div style={{ border:"1px solid var(--border)", overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                      <thead>
                        <tr style={{ background:"var(--surface)" }}>
                          {["#","Month","Cash In","P1 (net)","P2","P3","Fixed","Install","Extra","Cash Out","Net"].map(h=>(
                            <th key={h} style={{ padding:"9px 10px", textAlign:"left", fontSize:8, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid var(--border)", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {r.months.map((m,i)=>(
                          <tr key={i} style={{ borderTop:"1px solid var(--border)", background:i%2===0?"var(--surface2)":"var(--bg)" }}>
                            <td style={{ padding:"8px 10px", color:"var(--muted)", fontSize:10 }}>{m.month}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", fontSize:10, color:"var(--muted)" }}>{m.label}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", fontWeight:600 }}>{fmt(m.cashIn)}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", color:"#c0392b" }}>{fmt(m.p1)}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", color:"#b8953a" }}>{fmt(m.p2)}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", color:"#5d6d7e" }}>{fmt(m.p3)}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", color:"#27ae60" }}>{fmt(m.fixedIncome)}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", color:"var(--text2)" }}>{fmt(m.install)}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", color:"#8e44ad" }}>{fmt(m.extraIncome)}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", color:"var(--danger)" }}>{fmt(m.cashOut)}</td>
                            <td style={{ padding:"8px 10px", fontFamily:"monospace", fontWeight:600, color:m.net>=0?"var(--green)":"var(--danger)" }}>{fmt(m.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Extra payments summary (if any) */}
                {inputs.extraPayments.length > 0 && (
                  <div style={{ marginBottom:24 }}>
                    <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:12 }}>Extra Payment Stages</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:1, background:"var(--border)" }}>
                      {inputs.extraPayments.map(ep=>(
                        <div key={ep.id} style={{ background:"var(--surface)", padding:"14px 16px" }}>
                          <div style={{ fontSize:9, fontWeight:600, color:"#8e44ad", textTransform:"uppercase", letterSpacing:"0.15em", marginBottom:6 }}>{ep.name}</div>
                          <div style={{ fontSize:18, fontWeight:400 }}>{fmt(ep.amount)}<span style={{ fontSize:10, color:"var(--muted)" }}>/flat</span></div>
                          <div style={{ fontSize:9, color:"var(--muted)", marginTop:4 }}>
                            {ep.timingType==="afterSale" ? `${ep.month} months after sale` : `At construction month ${ep.month}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parameters footer */}
                <div style={{ borderTop:"1px solid var(--border)", paddingTop:18, display:"flex", gap:24, flexWrap:"wrap" }}>
                  <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.2em", alignSelf:"center" }}>Parameters</div>
                  {[
                    ["Sale Price",    `$${inputs.salePricePerSqm}/m²`],
                    ["Base Cost",     `$${inputs.baseCostPerSqm}/m²`],
                    ["Commission",    `$${inputs.commissionPerSqm}/m²`],
                    ["Sale Prob.",    `${inputs.saleProbability}%`],
                    ["Installment",   `${inputs.installmentProbability}%`],
                    ["P2 Timing",     `${inputs.p2Timing}mo`],
                    ["P3 Timing",     `${inputs.p3Timing}mo`],
                    ["Construction",  `${inputs.constructionMonths}mo`],
                  ].map(([k,v])=>(
                    <div key={k}>
                      <div style={{ fontSize:8, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>{k}</div>
                      <div style={{ fontSize:12, fontFamily:"monospace", color:"var(--text2)" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"var(--muted)", fontSize:12, letterSpacing:"0.1em", textTransform:"uppercase" }}>Loading...</div>
          )}
        </main>
      </div>
    </>
  );
}
