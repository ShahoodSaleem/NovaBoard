import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  PieChart as PieIcon,
  Plus,
  Trash2,
  Calendar,
  Flame,
  Check,
  X,
  Edit2
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';

const CATEGORY_PALETTE = [
  '#6366f1', '#22d3ee', '#f59e0b', '#ec4899',
  '#10b981', '#f97316', '#a855f7', '#14b8a6', '#e11d48'
];

const formatCurrency = (amount, sym = '$') => {
  const num = Number(amount) || 0;
  if (Math.abs(num) >= 1_000_000) return `${sym}${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${sym}${(num / 1_000).toFixed(1)}k`;
  return `${sym}${num.toLocaleString()}`;
};

export const BudgetAnalyticsSection = () => {
  const [budgetData, setBudgetData] = useState(null);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeVal, setIncomeVal] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [isAddingMonth, setIsAddingMonth] = useState(false);
  const [newMonthName, setNewMonthName] = useState('');
  const [newMonthIncome, setNewMonthIncome] = useState('');
  const [newMonthExpenses, setNewMonthExpenses] = useState('');

  const loadData = useCallback(async () => {
    const data = await analyticsService.getBudgetData();
    setBudgetData(data);
    setIncomeVal(String(data.income || 0));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sym = budgetData?.currency || '$';
  const income = Number(budgetData?.income) || 0;
  const expenses = budgetData?.expenses || [];
  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses]);
  const savings = Math.max(0, income - totalSpent);
  const spentPct = income > 0 ? Math.min(100, Math.round((totalSpent / income) * 100)) : 0;
  const savingsRate = income > 0 ? Math.max(0, Math.round((savings / income) * 100)) : 0;

  // Days in month calculation for daily burn rate & forecast
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyBurn = currentDay > 0 ? Math.round(totalSpent / currentDay) : 0;
  const projectedMonthEnd = Math.round(dailyBurn * daysInMonth);

  // Save changes
  const updateBudget = async (updated) => {
    setBudgetData(updated);
    await analyticsService.saveBudgetData(updated);
  };

  const handleSaveIncome = async () => {
    const parsed = parseFloat(incomeVal);
    if (!isNaN(parsed) && parsed >= 0) {
      const updated = { ...budgetData, income: parsed };
      await updateBudget(updated);
    }
    setEditingIncome(false);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const val = parseFloat(newAmount);
    if (!newLabel.trim() || isNaN(val) || val <= 0) return;

    const newExp = { id: `e_${Date.now()}`, label: newLabel.trim(), amount: val };
    const updated = {
      ...budgetData,
      expenses: [...expenses, newExp],
    };
    await updateBudget(updated);
    setNewLabel('');
    setNewAmount('');
  };

  const handleDeleteExpense = async (id) => {
    const updated = {
      ...budgetData,
      expenses: expenses.filter((e) => e.id !== id),
    };
    await updateBudget(updated);
  };

  const handleAddMonthHistory = async (e) => {
    e.preventDefault();
    const inc = parseFloat(newMonthIncome);
    const exp = parseFloat(newMonthExpenses);
    if (!newMonthName.trim() || isNaN(inc) || isNaN(exp)) return;

    await analyticsService.addOrUpdateMonthRecord({
      month: newMonthName.trim(),
      year: 2026,
      income: inc,
      expenses: exp,
      savings: Math.max(0, inc - exp),
    });

    setIsAddingMonth(false);
    setNewMonthName('');
    setNewMonthIncome('');
    setNewMonthExpenses('');
    loadData();
  };

  // Pie chart data
  const pieData = useMemo(() => {
    return expenses.map((exp, idx) => ({
      name: exp.label,
      value: Number(exp.amount || 0),
      color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
    }));
  }, [expenses]);

  // Monthly Line Chart Data (Month in X, Money in Y)
  const monthlyChartData = useMemo(() => {
    return (budgetData?.monthlyHistory || []).map((m) => ({
      month: m.month,
      year: m.year,
      Income: Number(m.income) || 0,
      Expenses: Number(m.expenses) || 0,
      Savings: Number(m.savings) || 0,
    }));
  }, [budgetData?.monthlyHistory]);

  if (!budgetData) return null;

  return (
    <div className="space-y-6">
      {/* ── Financial KPIs Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Budget / Income */}
        <div className="p-5 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-white/50 tracking-wider uppercase flex items-center gap-1.5">
              <DollarSign size={14} className="text-cyan-400" /> Monthly Budget
            </span>
            <button
              onClick={() => setEditingIncome(!editingIncome)}
              className="p-1 rounded-md text-white/30 hover:text-white hover:bg-white/10 transition-all"
              title="Edit Budget"
            >
              <Edit2 size={12} />
            </button>
          </div>

          {editingIncome ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg font-bold text-cyan-400">{sym}</span>
              <input
                type="number"
                value={incomeVal}
                onChange={(e) => setIncomeVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveIncome()}
                className="w-24 px-2 py-1 rounded-lg bg-white/10 border border-cyan-400 text-sm font-bold text-white focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveIncome}
                className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setEditingIncome(false)}
                className="p-1.5 rounded-lg bg-white/10 text-white/40 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {formatCurrency(income, sym)}
            </div>
          )}
          <p className="text-xs text-white/40 mt-1">Total planned allocation</p>
        </div>

        {/* Current Total Spent */}
        <div className="p-5 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-white/50 tracking-wider uppercase flex items-center gap-1.5">
              <TrendingDown size={14} className="text-rose-400" /> Total Spent
            </span>
            <span className="text-xs font-mono font-bold text-rose-400">{spentPct}%</span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(totalSpent, sym)}
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-white/10 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                spentPct > 90
                  ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              }`}
              style={{ width: `${spentPct}%` }}
            />
          </div>
        </div>

        {/* Net Savings */}
        <div className="p-5 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-white/50 tracking-wider uppercase flex items-center gap-1.5">
              <PiggyBank size={14} className="text-emerald-400" /> Net Savings
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">{savingsRate}% Saved</span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight text-emerald-400">
            {formatCurrency(savings, sym)}
          </div>
          <p className="text-xs text-white/40 mt-1">Remaining surplus this month</p>
        </div>

        {/* Burn Rate & Forecast */}
        <div className="p-5 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-white/50 tracking-wider uppercase flex items-center gap-1.5">
              <Flame size={14} className="text-amber-400" /> Daily Burn Rate
            </span>
            <span className="text-xs font-mono text-white/40">Day {currentDay} / {daysInMonth}</span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(dailyBurn, sym)} <span className="text-xs font-normal text-white/40">/ day</span>
          </div>
          <p className="text-xs text-white/40 mt-1">
            Proj. Month End: <span className="text-white font-semibold">{formatCurrency(projectedMonthEnd, sym)}</span>
          </p>
        </div>
      </div>

      {/* ── THE REQUESTED MONTHLY LINE GRAPH (Month in X, Money in Y) ── */}
      <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-400" /> Monthly Budget & Expense Trajectory
            </h3>
            <p className="text-xs text-white/40">
              Line graph showing income, expenditures, and net savings over time (Month on X, Money on Y)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddingMonth(!isAddingMonth)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Plus size={14} /> Log Month Data
            </button>
          </div>
        </div>

        {/* Modal/Accordion for adding historical month record */}
        {isAddingMonth && (
          <form
            onSubmit={handleAddMonthHistory}
            className="p-4 rounded-2xl bg-white/[0.04] border border-cyan-500/30 flex flex-wrap items-center gap-3 animate-in fade-in duration-300"
          >
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-cyan-400" />
              <input
                type="text"
                placeholder="Month (e.g. Oct)"
                value={newMonthName}
                onChange={(e) => setNewMonthName(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
                required
              />
            </div>
            <input
              type="number"
              placeholder="Income ($)"
              value={newMonthIncome}
              onChange={(e) => setNewMonthIncome(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 w-28"
              required
            />
            <input
              type="number"
              placeholder="Expenses ($)"
              value={newMonthExpenses}
              onChange={(e) => setNewMonthExpenses(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 w-28"
              required
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 transition-all"
            >
              Save Record
            </button>
            <button
              type="button"
              onClick={() => setIsAddingMonth(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 text-white/60 hover:text-white text-xs"
            >
              Cancel
            </button>
          </form>
        )}

        {/* The Recharts Line Chart */}
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyChartData} margin={{ top: 15, right: 25, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="rgba(255,255,255,0.4)"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickFormatter={(val) => formatCurrency(val, sym)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="p-4 rounded-2xl bg-zinc-950/95 border border-white/20 backdrop-blur-xl shadow-2xl text-xs space-y-2 min-w-[170px]">
                      <div className="font-bold text-white border-b border-white/10 pb-1.5 flex items-center justify-between">
                        <span>{label} 2026</span>
                        <span className="text-[10px] text-cyan-400 font-mono">Monthly Telemetry</span>
                      </div>
                      {payload.map((entry) => (
                        <div key={entry.dataKey} className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-white/70">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
                            {entry.dataKey}:
                          </span>
                          <span className="font-mono font-bold text-white">
                            {formatCurrency(entry.value, sym)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="Income"
                stroke="#22d3ee"
                strokeWidth={3}
                dot={{ r: 4, fill: '#22d3ee', stroke: '#083344', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#22d3ee', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="Expenses"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f43f5e', stroke: '#4c0519', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="Savings"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Category Donut & Expense Manager ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Category Share Donut (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              <PieIcon size={16} className="text-amber-400" /> Spending Distribution
            </h3>
            <span className="text-xs text-white/40">{expenses.length} Categories</span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      const share = totalSpent > 0 ? Math.round((item.value / totalSpent) * 100) : 0;
                      return (
                        <div className="p-3 rounded-2xl bg-zinc-950/95 border border-white/15 backdrop-blur-xl text-xs space-y-1 shadow-2xl">
                          <div className="font-bold flex items-center gap-1.5" style={{ color: item.color }}>
                            <span>{item.name}</span>
                          </div>
                          <div className="text-white font-extrabold text-sm">{formatCurrency(item.value, sym)}</div>
                          <div className="text-white/40 font-mono">{share}% of total spend</div>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    cornerRadius={5}
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-white/30">No expenses entered yet</div>
            )}
          </div>

          {/* Quick Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-white/70 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Entry & Item List (3 cols) */}
        <div className="lg:col-span-3 p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Expense Ledger</h3>
              <p className="text-xs text-white/40">Manage your recurring & monthly expenditure items</p>
            </div>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddExpense} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Expense category or label (e.g. Groceries)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
            />
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/40">{sym}</span>
              <input
                type="number"
                placeholder="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold text-xs hover:opacity-90 transition-all active:scale-95 shrink-0 shadow-lg"
            >
              Add Item
            </button>
          </form>

          {/* List of active expenses */}
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {expenses.map((exp, idx) => {
              const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
              const share = totalSpent > 0 ? Math.round((exp.amount / totalSpent) * 100) : 0;
              return (
                <div
                  key={exp.id}
                  className="group flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold text-white">{exp.label}</span>
                    <span className="text-[10px] text-white/40 font-mono">{share}%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-white">
                      {formatCurrency(exp.amount, sym)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete expense"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetAnalyticsSection;
