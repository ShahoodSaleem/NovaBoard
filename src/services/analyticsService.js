/* global chrome */
/**
 * Analytics Service for NovaBoard
 * Handles multi-month financial telemetry, site usage history, and domain categorization.
 */

const BUDGET_KEY = 'novaboard_budget_v2';
const USAGE_KEY = 'novaboard_usage';

export const DOMAIN_CATEGORIES = {
  // Productivity & Work
  'github.com': { category: 'Development', productive: true, color: '#38bdf8' },
  'gitlab.com': { category: 'Development', productive: true, color: '#f97316' },
  'stackoverflow.com': { category: 'Development', productive: true, color: '#f59e0b' },
  'figma.com': { category: 'Design', productive: true, color: '#a855f7' },
  'notion.so': { category: 'Productivity', productive: true, color: '#10b981' },
  'docs.google.com': { category: 'Productivity', productive: true, color: '#3b82f6' },
  'drive.google.com': { category: 'Productivity', productive: true, color: '#3b82f6' },
  'slack.com': { category: 'Communication', productive: true, color: '#ec4899' },
  'teams.microsoft.com': { category: 'Communication', productive: true, color: '#6366f1' },
  'chatgpt.com': { category: 'AI & Research', productive: true, color: '#10b981' },
  'claude.ai': { category: 'AI & Research', productive: true, color: '#d97706' },
  'gemini.google.com': { category: 'AI & Research', productive: true, color: '#8b5cf6' },
  'linear.app': { category: 'Productivity', productive: true, color: '#6366f1' },

  // Social & Media
  'youtube.com': { category: 'Entertainment', productive: false, color: '#ef4444' },
  'netflix.com': { category: 'Entertainment', productive: false, color: '#e11d48' },
  'spotify.com': { category: 'Music', productive: null, color: '#22c55e' },
  'reddit.com': { category: 'Social', productive: false, color: '#f97316' },
  'twitter.com': { category: 'Social', productive: false, color: '#0ea5e9' },
  'x.com': { category: 'Social', productive: false, color: '#0ea5e9' },
  'instagram.com': { category: 'Social', productive: false, color: '#d946ef' },
  'facebook.com': { category: 'Social', productive: false, color: '#2563eb' },
  'linkedin.com': { category: 'Career', productive: true, color: '#0284c7' },
  'twitch.tv': { category: 'Entertainment', productive: false, color: '#9333ea' },
};

const DEFAULT_MONTHLY_HISTORY = [
  { month: 'Jan', year: 2026, income: 3200, expenses: 2150, savings: 1050 },
  { month: 'Feb', year: 2026, income: 3200, expenses: 2400, savings: 800 },
  { month: 'Mar', year: 2026, income: 3400, expenses: 2200, savings: 1200 },
  { month: 'Apr', year: 2026, income: 3400, expenses: 2550, savings: 850 },
  { month: 'May', year: 2026, income: 3600, expenses: 2300, savings: 1300 },
  { month: 'Jun', year: 2026, income: 3600, expenses: 2100, savings: 1500 },
  { month: 'Jul', year: 2026, income: 3800, expenses: 2600, savings: 1200 },
  { month: 'Aug', year: 2026, income: 3800, expenses: 2450, savings: 1350 },
  { month: 'Sep', year: 2026, income: 4000, expenses: 2500, savings: 1500 },
];

const getLocal = (key) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.get([key], (r) => resolve(r[key]));
    } else {
      try {
        resolve(JSON.parse(localStorage.getItem(key)));
      } catch {
        resolve(null);
      }
    }
  });

const setLocal = (key, value) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.set({ [key]: value }, resolve);
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // storage quota exceeded or unavailable
      }
      resolve();
    }
  });

export const analyticsService = {
  // ── Budget & Financial Telemetry ───────────────────────────────────────────
  async getBudgetData() {
    const raw = await getLocal(BUDGET_KEY);
    const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'short' });
    const currentYear = new Date().getFullYear();

    const data = raw || {
      currency: '$',
      income: 4000,
      expenses: [
        { id: 'e1', label: 'Housing', amount: 1200 },
        { id: 'e2', label: 'Food & Dining', amount: 550 },
        { id: 'e3', label: 'Tech & Subscriptions', amount: 220 },
        { id: 'e4', label: 'Transport', amount: 180 },
        { id: 'e5', label: 'Utilities', amount: 150 },
        { id: 'e6', label: 'Entertainment', amount: 200 },
      ],
    };

    if (!data.monthlyHistory || data.monthlyHistory.length === 0) {
      data.monthlyHistory = DEFAULT_MONTHLY_HISTORY;
    }

    // Sync current month into monthlyHistory if exists
    const currentSpent = (data.expenses || []).reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
    const existingIdx = data.monthlyHistory.findIndex(
      (m) => m.month === currentMonthLabel && m.year === currentYear
    );

    if (existingIdx !== -1) {
      data.monthlyHistory[existingIdx].income = Number(data.income) || 0;
      data.monthlyHistory[existingIdx].expenses = currentSpent;
      data.monthlyHistory[existingIdx].savings = Math.max(0, (Number(data.income) || 0) - currentSpent);
    } else {
      data.monthlyHistory.push({
        month: currentMonthLabel,
        year: currentYear,
        income: Number(data.income) || 0,
        expenses: currentSpent,
        savings: Math.max(0, (Number(data.income) || 0) - currentSpent),
      });
    }

    return data;
  },

  async saveBudgetData(updated) {
    await setLocal(BUDGET_KEY, updated);
    return updated;
  },

  async addOrUpdateMonthRecord(record) {
    const data = await this.getBudgetData();
    const history = data.monthlyHistory || [];
    const idx = history.findIndex((h) => h.month === record.month && h.year === record.year);
    if (idx !== -1) {
      history[idx] = { ...history[idx], ...record };
    } else {
      history.push(record);
    }
    data.monthlyHistory = history;
    await this.saveBudgetData(data);
    return data;
  },

  // ── Site Usage Telemetry ───────────────────────────────────────────────────
  async getUsageData() {
    const raw = await getLocal(USAGE_KEY);
    const today = new Date().toISOString().slice(0, 10);

    const domains = (raw && raw.date === today && raw.domains) ? raw.domains : (raw?.domains || {});
    const history = raw?.history || {};

    // Ensure today is tracked in history
    history[today] = domains;

    return {
      today,
      domains,
      history,
    };
  },

  getDomainInfo(domain) {
    const clean = domain.replace(/^www\./, '').toLowerCase();
    return (
      DOMAIN_CATEGORIES[clean] || {
        category: 'General Browsing',
        productive: null,
        color: '#94a3b8',
      }
    );
  },

  formatDuration(ms) {
    if (!ms || ms <= 0) return '0m';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  },
};
