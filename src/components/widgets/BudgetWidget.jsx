import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const BUDGET_KEY = 'novaboard_budget_v2';

const getLocal = (key) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.get([key], (r) => resolve(r[key]));
    } else {
      try { resolve(JSON.parse(localStorage.getItem(key))); }
      catch { resolve(null); }
    }
  });

const setLocal = (key, value) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.set({ [key]: value }, resolve);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
      resolve();
    }
  });

const PALETTE = [
  { hex: '#6366f1', glow: 'rgba(99,102,241,0.4)' },
  { hex: '#22d3ee', glow: 'rgba(34,211,238,0.4)' },
  { hex: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  { hex: '#ec4899', glow: 'rgba(236,72,153,0.4)' },
  { hex: '#10b981', glow: 'rgba(16,185,129,0.4)' },
  { hex: '#f97316', glow: 'rgba(249,115,22,0.4)' },
  { hex: '#a855f7', glow: 'rgba(168,85,247,0.4)' },
  { hex: '#14b8a6', glow: 'rgba(20,184,166,0.4)' },
];

const DEFAULT_DATA = {
  currency: '$',
  income: 3000,
  expenses: [
    { id: 'e1', label: 'Housing', amount: 900 },
    { id: 'e2', label: 'Food', amount: 400 },
    { id: 'e3', label: 'Transport', amount: 250 },
    { id: 'e4', label: 'Shopping', amount: 300 },
    { id: 'e5', label: 'Utilities', amount: 150 },
  ],
};

const fmt = (sym, n) => {
  if (isNaN(n) || n == null) return `${sym}0`;
  if (Math.abs(n) >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${sym}${(n / 1000).toFixed(1)}k`;
  return `${sym}${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Custom Tooltip for the pie chart
const CustomTooltip = ({ active, payload, sym }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{
      background: 'rgba(15,15,20,0.92)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${item.payload.fill}55`,
      borderRadius: '10px',
      padding: '7px 12px',
      boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${item.payload.fill}22`,
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.payload.fill, display: 'block', boxShadow: `0 0 8px ${item.payload.fill}` }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{item.name}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginTop: 2 }}>{fmt(sym, item.value)}</div>
    </div>
  );
};

export const BudgetWidget = ({ size }) => {
  const [data, setData] = useState(DEFAULT_DATA);
  const [expLabel, setExpLabel] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [activeIndex, setActiveIndex] = useState(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');

  useEffect(() => {
    getLocal(BUDGET_KEY).then((saved) => {
      if (saved?.expenses?.length) setData(saved);
    });
  }, []);

  const save = useCallback(async (nd) => {
    setData(nd);
    await setLocal(BUDGET_KEY, nd);
  }, []);

  const sym = data.currency || '$';
  const income = parseFloat(data.income) || 0;
  const expenses = data.expenses || [];
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const remaining = Math.max(0, income - totalSpent);
  const isOverspent = income > 0 && totalSpent > income;
  const spentPct = income > 0 ? Math.min(100, Math.round((totalSpent / income) * 100)) : 0;

  // Build chart data: each expense + remaining
  const chartData = useMemo(() => {
    const items = expenses
      .filter((e) => Number(e.amount) > 0)
      .map((e, idx) => ({
        id: e.id,
        name: e.label,
        value: Number(e.amount),
        fill: PALETTE[idx % PALETTE.length].hex,
        glow: PALETTE[idx % PALETTE.length].glow,
        expIdx: idx,
      }));

    if (income > 0 && remaining > 0) {
      items.push({
        id: 'remaining',
        name: 'Remaining',
        value: remaining,
        fill: 'rgba(255,255,255,0.08)',
        glow: 'rgba(255,255,255,0.1)',
        isRemaining: true,
      });
    }

    if (items.length === 0) {
      items.push({ id: 'empty', name: 'No data', value: 1, fill: 'rgba(255,255,255,0.07)', isPlaceholder: true });
    }

    return items;
  }, [expenses, income, remaining]);

  const activeItem = activeIndex !== null ? chartData[activeIndex] : null;

  const handleAddExpense = (e) => {
    if (e) e.preventDefault();
    const label = expLabel.trim();
    const amount = parseFloat(expAmount);
    if (!label || isNaN(amount) || amount <= 0) return;
    const updated = { ...data, expenses: [...expenses, { id: `e_${Date.now()}`, label, amount }] };
    save(updated);
    setExpLabel('');
    setExpAmount('');
  };

  const handleDeleteExpense = (id) => {
    const updated = { ...data, expenses: expenses.filter((e) => e.id !== id) };
    save(updated);
    setActiveIndex(null);
  };

  const handleSaveIncome = () => {
    const val = parseFloat(incomeInput);
    if (!isNaN(val) && val >= 0) save({ ...data, income: val });
    setEditingIncome(false);
  };

  const widgetW = size?.w || 320;
  const widgetH = size?.h || 440;
  const isNarrow = widgetW < 280;

  // Pie sizing
  const R = Math.max(60, Math.min(95, Math.min(widgetW, widgetH) * 0.24));
  const r = Math.round(R * 0.62);

  return (
    <div className="budget-v2-root">
      {/* ── Ambient glow ── */}
      <div
        className="budget-v2-glow"
        style={{
          background: activeItem && !activeItem.isRemaining && !activeItem.isPlaceholder
            ? `radial-gradient(circle, ${activeItem.glow} 0%, transparent 70%)`
            : isOverspent
              ? 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(34,211,238,0.08) 60%, transparent 80%)',
        }}
      />

      {/* ── HEADER ── */}
      <div className="budget-v2-header">
        <div className="budget-v2-header-left">
          <span className="budget-v2-logo">💰</span>
          <div>
            <p className="budget-v2-title">Budget Tracker</p>
            <p className="budget-v2-subtitle">Monthly overview</p>
          </div>
        </div>

        {/* Income pill */}
        {editingIncome ? (
          <div className="budget-v2-income-edit">
            <span className="budget-v2-income-sym">{sym}</span>
            <input
              autoFocus
              type="number"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveIncome(); if (e.key === 'Escape') setEditingIncome(false); }}
              className="budget-v2-income-input"
              placeholder="0"
            />
            <button className="budget-v2-check-btn" onClick={handleSaveIncome}>✓</button>
            <button className="budget-v2-cancel-btn" onClick={() => setEditingIncome(false)}>✕</button>
          </div>
        ) : (
          <button
            className="budget-v2-income-pill"
            onClick={() => { setIncomeInput(income > 0 ? String(income) : ''); setEditingIncome(true); }}
            title="Click to set income"
          >
            <span className="budget-v2-pill-label">Budget</span>
            <span className="budget-v2-pill-val">{income > 0 ? fmt(sym, income) : 'Set →'}</span>
          </button>
        )}
      </div>

      {/* ── DONUT CHART ── */}
      <div className="budget-v2-chart-area">
        <div className="budget-v2-chart-wrap" style={{ width: R * 2 + 20, height: R * 2 + 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip sym={sym} />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={r}
                outerRadius={R}
                paddingAngle={chartData.length > 1 ? 3 : 0}
                cornerRadius={5}
                stroke="none"
                startAngle={90}
                endAngle={-270}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.id}
                    fill={entry.fill}
                    style={{
                      filter: activeIndex === index && !entry.isPlaceholder
                        ? `drop-shadow(0 0 10px ${entry.fill})`
                        : 'none',
                      transition: 'filter 0.2s ease',
                      cursor: entry.isPlaceholder ? 'default' : 'pointer',
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered hole content */}
          <div className="budget-v2-hole">
            {activeItem && !activeItem.isPlaceholder ? (
              <>
                <span className="budget-v2-hole-amt" style={{ color: activeItem.isRemaining ? 'rgba(255,255,255,0.7)' : activeItem.fill }}>
                  {fmt(sym, activeItem.value)}
                </span>
                <span className="budget-v2-hole-label" style={{ color: activeItem.isRemaining ? 'rgba(255,255,255,0.35)' : `${activeItem.fill}cc` }}>
                  {activeItem.name}
                </span>
              </>
            ) : (
              <>
                <span className={`budget-v2-hole-amt ${isOverspent ? 'danger' : ''}`}>
                  {income > 0 ? fmt(sym, isOverspent ? totalSpent - income : remaining) : fmt(sym, totalSpent)}
                </span>
                <span className="budget-v2-hole-label">
                  {income > 0 ? (isOverspent ? 'OVER' : 'LEFT') : 'SPENT'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Spent progress bar */}
        {income > 0 && (
          <div className="budget-v2-progress-wrap">
            <div className="budget-v2-progress-bar-track">
              <div
                className={`budget-v2-progress-bar-fill ${isOverspent ? 'danger' : ''}`}
                style={{ width: `${spentPct}%` }}
              />
            </div>
            <div className="budget-v2-progress-labels">
              <span>{fmt(sym, totalSpent)} spent</span>
              <span className={isOverspent ? 'danger-text' : ''}>{spentPct}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── EXPENSE LIST ── */}
      <div className="budget-v2-list custom-scrollbar">
        {expenses.length === 0 ? (
          <div className="budget-v2-empty">
            <span>✦</span>
            <p>No expenses yet</p>
          </div>
        ) : (
          expenses.map((exp, idx) => {
            const palette = PALETTE[idx % PALETTE.length];
            const pct = totalSpent > 0 ? Math.round((Number(exp.amount) / totalSpent) * 100) : 0;
            const chartIdx = chartData.findIndex((c) => c.id === exp.id);
            const isHov = activeIndex === chartIdx && chartIdx !== -1;

            return (
              <div
                key={exp.id}
                className={`budget-v2-row ${isHov ? 'hovered' : ''}`}
                onMouseEnter={() => chartIdx !== -1 && setActiveIndex(chartIdx)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {/* Progress fill shimmer */}
                <div
                  className="budget-v2-row-fill"
                  style={{ width: `${pct}%`, background: `${palette.hex}18` }}
                />

                {/* Left: dot + name */}
                <div className="budget-v2-row-left">
                  <span
                    className="budget-v2-dot"
                    style={{
                      background: palette.hex,
                      boxShadow: isHov ? `0 0 8px ${palette.hex}` : 'none',
                    }}
                  />
                  <span className="budget-v2-row-name">{exp.label}</span>
                </div>

                {/* Right: pct + amount + delete */}
                <div className="budget-v2-row-right">
                  <span className="budget-v2-row-pct">{pct}%</span>
                  <span className="budget-v2-row-amt">{fmt(sym, exp.amount)}</span>
                  <button
                    className="budget-v2-del-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteExpense(exp.id); }}
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── ADD EXPENSE FORM ── */}
      <form className="budget-v2-form" onSubmit={handleAddExpense}>
        <input
          type="text"
          placeholder="Expense name"
          value={expLabel}
          maxLength={28}
          onChange={(e) => setExpLabel(e.target.value)}
          className="budget-v2-input-name"
        />
        <div className="budget-v2-amount-wrap">
          <span className="budget-v2-amount-sym">{sym}</span>
          <input
            type="number"
            placeholder="0"
            value={expAmount}
            min="0"
            step="any"
            onChange={(e) => setExpAmount(e.target.value)}
            className="budget-v2-input-amt"
          />
        </div>
        <button
          type="submit"
          disabled={!expLabel.trim() || !expAmount}
          className="budget-v2-add-btn"
          title="Add expense"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </form>

      {/* ── FOOTER ── */}
      <div className="budget-v2-footer">
        {showCurrencyPicker ? (
          <div className="budget-v2-currency-row">
            {['$', '€', '£', '¥', '₹', 'Rs'].map((s) => (
              <button
                key={s}
                className={`budget-v2-curr-opt ${sym === s ? 'active' : ''}`}
                onClick={() => { save({ ...data, currency: s }); setShowCurrencyPicker(false); }}
              >{s}</button>
            ))}
            <button className="budget-v2-curr-close" onClick={() => setShowCurrencyPicker(false)}>✕</button>
          </div>
        ) : (
          <>
            <button className="budget-v2-footer-btn" onClick={() => setShowCurrencyPicker(true)}>
              <span className="budget-v2-curr-badge">{sym}</span> Currency
            </button>
            <button
              className="budget-v2-footer-btn reset"
              onClick={() => { if (window.confirm('Reset budget data?')) { save(DEFAULT_DATA); setActiveIndex(null); } }}
            >
              ↺ Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
};
