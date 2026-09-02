import React, { useState } from 'react';
import {
  BarChart3,
  Clock,
  PiggyBank,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { UsageAnalyticsSection } from './UsageAnalyticsSection';
import { BudgetAnalyticsSection } from './BudgetAnalyticsSection';

export const AnalyticsView = () => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'usage' | 'budget'
  const setMode = useWorkspaceStore((s) => s.setMode);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-16 pt-2">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ── Sub-Navigation & Header Bar ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMode('bookmarks')}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all text-xs flex items-center gap-1 border border-white/5"
                title="Return to Bookmarks (Alt+A)"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">Bookmarks</span>
              </button>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-amber-300 bg-clip-text text-transparent">
                  Personal Analytics & Telemetry
                </span>
                <Sparkles size={18} className="text-amber-400" />
              </h1>
            </div>
            <p className="text-xs text-white/40 pl-8">
              Live intelligence hub tracking your screen time, web habits, and monthly financial trajectory
            </p>
          </div>

          {/* Section switcher pills */}
          <div className="flex items-center p-1 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] border border-white/20'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 size={13} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('usage')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'usage'
                  ? 'bg-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)] border border-cyan-400/40'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock size={13} />
              <span>Site Usage</span>
            </button>

            <button
              onClick={() => setActiveTab('budget')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'budget'
                  ? 'bg-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] border border-emerald-400/40'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <PiggyBank size={13} />
              <span>Budget Tracker</span>
            </button>
          </div>
        </div>

        {/* ── Content Sections ── */}
        {activeTab === 'all' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <Clock size={18} className="text-cyan-400" /> Browsing Time & Web Habits
                </h2>
                <button
                  onClick={() => setActiveTab('usage')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  View full usage &rarr;
                </button>
              </div>
              <UsageAnalyticsSection />
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <PiggyBank size={18} className="text-emerald-400" /> Budget & Financial Telemetry
                </h2>
                <button
                  onClick={() => setActiveTab('budget')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  View full budget &rarr;
                </button>
              </div>
              <BudgetAnalyticsSection />
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="animate-in fade-in duration-300">
            <UsageAnalyticsSection />
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="animate-in fade-in duration-300">
            <BudgetAnalyticsSection />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsView;
