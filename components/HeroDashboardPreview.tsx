"use client";

import React, { useState } from "react";
import {
  Home,
  Sparkles,
  MapPin,
  BarChart3,
  ListTodo,
  FileText,
  DollarSign,
  TrendingUp,
  PieChart,
  Settings,
  HelpCircle,
  Search,
  Bell,
  ArrowRight,
  Send,
  X,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export function HeroDashboardPreview() {
  const [activeTab, setActiveTab] = useState("Home");
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hi Alex! I'm your AI Business Analyst. I help you make smarter decisions with data, framework-backed analysis and real-world insights. What would you like clarity on today?"
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const handlePromptClick = (promptText: string) => {
    const userMsg = promptText;
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMsg },
      {
        sender: "ai",
        text: `Analyzing "${promptText}" for your venture... Based on recent market data and your target segment, I've updated your Venture Context with key hypotheses.`
      }
    ]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const text = inputVal;
    setInputVal("");
    setMessages((prev) => [
      ...prev,
      { sender: "user", text },
      {
        sender: "ai",
        text: `Great question! Analyzing "${text}". I have mapped this to your business model and flagged 2 assumptions to validate in your next sprint.`
      }
    ]);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-blue-900/10 overflow-hidden font-sans text-slate-900">
      {/* Mock Browser Header */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
          <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
          <span className="text-xs font-medium text-slate-500 ml-2">app.getfounderally.com/workspace</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400 text-xs">
          <span>Venture Context: <strong className="text-slate-700">SaaS Invoice AI</strong></span>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex min-h-[560px] bg-slate-50/50">
        {/* Left Sidebar */}
        <aside className="w-52 bg-white border-r border-slate-200/80 p-3 flex flex-col justify-between hidden sm:flex">
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">F</div>
              <span className="font-bold text-slate-900 text-sm tracking-tight">FounderAlly</span>
            </div>

            {[
              { label: "Home", icon: Home },
              { label: "AI Analyst", icon: Sparkles },
              { label: "Roadmap", icon: MapPin },
              { label: "Market Analysis", icon: BarChart3 },
              { label: "Sprints", icon: TrendingUp },
              { label: "Tasks", icon: ListTodo },
              { label: "Documents", icon: FileText },
              { label: "Financials", icon: DollarSign },
              { label: "Funding", icon: PieChart },
              { label: "Metrics", icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveTab(item.label)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-1">
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings</span>
            </button>
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Help</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* Top Bar Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Good morning, Alex <span className="text-lg">👋</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Your AI Business Analyst has the latest insights for you.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-slate-200/60 text-slate-500 transition-colors">
                <Search className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-full hover:bg-slate-200/60 text-slate-500 transition-colors relative">
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
                A
              </div>
            </div>
          </div>

          {/* Top Stat Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {/* Stat 1 */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Market Opportunity</span>
              <div className="text-xl font-bold text-slate-900">$12.4B</div>
              <span className="text-[11px] text-slate-500">Total Addressable Market</span>
              <svg className="w-full h-5 mt-2 stroke-blue-500 fill-blue-50/50" viewBox="0 0 100 20">
                <path d="M0,18 Q25,5 50,12 T100,2 L100,20 L0,20 Z" />
              </svg>
            </div>

            {/* Stat 2 */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Problem Validation</span>
              <div className="text-xl font-bold text-slate-900">87%</div>
              <span className="text-[11px] text-emerald-600 font-semibold">Strong Signal</span>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                <div className="bg-emerald-500 h-1.5 rounded-full w-[87%]" />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Recommended Next Step</span>
                <div className="text-sm font-bold text-slate-900">Refine MVP</div>
                <span className="text-[11px] text-blue-600 font-semibold">High Impact</span>
              </div>
              <button className="mt-2 flex items-center justify-center gap-1 w-6 h-6 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white transition-colors text-slate-600 self-end">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stat 4 */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Confidence Score</span>
                <div className="text-sm font-bold text-emerald-600">High</div>
                <span className="text-xs text-slate-700 font-semibold">8.6 / 10</span>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="18" stroke="#e2e8f0" strokeWidth="4" fill="none" />
                  <circle cx="24" cy="24" r="18" stroke="#2563eb" strokeWidth="4" fill="none" strokeDasharray="113" strokeDashoffset="16" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* AI Analyst Recommendations Section */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs mb-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">AI Analyst Recommendations</h3>
            <div className="space-y-2.5">
              {[
                {
                  id: "rep-1",
                  icon: "📊",
                  title: "Market gap analysis",
                  desc: "We found 3 underserved customer segments",
                },
                {
                  id: "rep-2",
                  icon: "💡",
                  title: "MVP feature prioritization",
                  desc: "Focus on these 2 features first",
                },
                {
                  id: "rep-3",
                  icon: "⚖️",
                  title: "Pricing strategy",
                  desc: "Recommended pricing range to maximise adoption",
                },
              ].map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center text-sm">{rec.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{rec.title}</h4>
                      <p className="text-[11px] text-slate-500">{rec.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(rec.title)}
                    className="px-3 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-600 border border-slate-200 rounded-full hover:border-blue-300 transition-colors bg-white shadow-2xs"
                  >
                    View report
                  </button>
                </div>
              ))}
            </div>
            <button className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all recommendations →
            </button>
          </div>

          {/* Stepper Progress */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">Your Progress</span>
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-blue-600">
                <CheckCircle2 className="w-4 h-4 fill-blue-600 text-white" /> Ideate
              </div>
              <div className="h-0.5 flex-1 bg-blue-600 mx-2" />
              <div className="flex items-center gap-1.5 text-blue-600">
                <CheckCircle2 className="w-4 h-4 fill-blue-600 text-white" /> Validate
              </div>
              <div className="h-0.5 flex-1 bg-slate-200 mx-2" />
              <div className="flex items-center gap-1.5 text-blue-600">
                <span className="w-4 h-4 rounded-full border-2 border-blue-600 bg-white inline-block" /> Build
              </div>
              <div className="h-0.5 flex-1 bg-slate-200 mx-2" />
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block" /> Grow
              </div>
              <div className="h-0.5 flex-1 bg-slate-200 mx-2" />
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block" /> Raise
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Floating AI Business Analyst Panel (Matching bottom-right overlay in homepage.png) */}
      {chatOpen && (
        <div className="absolute bottom-4 right-4 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-blue-600/20 overflow-hidden flex flex-col z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-white border-b border-slate-100 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">✦</div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  AI Business Analyst
                </h4>
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                </span>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="p-3 bg-slate-50/50 max-h-60 overflow-y-auto space-y-2.5 custom-scrollbar">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                  m.sender === "ai"
                    ? "bg-white border border-slate-200/80 text-slate-800 shadow-2xs"
                    : "bg-blue-600 text-white ml-6 shadow-2xs"
                }`}
              >
                {m.text}
              </div>
            ))}

            {/* Quick Prompt Chips */}
            <div className="pt-1 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-600">What would you like clarity on today?</p>
              {[
                "✦ Is my idea a good opportunity?",
                "🌐 Who are my target customers?",
                "📊 How should I price my product?",
                "💡 What's the best growth strategy?"
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handlePromptClick(chip)}
                  className="w-full text-left text-xs font-medium px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/60 text-slate-700 transition-all flex items-center justify-between group shadow-2xs"
                >
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />
            <button type="submit" className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <span className="text-[9px] text-center text-slate-400 py-1 bg-slate-50 border-t border-slate-100">
            AI can make mistakes. Verify important info.
          </span>
        </div>
      )}

      {/* Modal for viewing generated reports */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <span>📄</span> {selectedReport}
              </h3>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-slate-700 space-y-2 leading-relaxed">
              <p className="font-semibold text-blue-600">AI Business Analyst Finding:</p>
              <p>Based on competitor data and early feedback, we identified 3 key unmet needs in your segment:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 pl-2">
                <li>Automated tax breakdown for cross-border invoices</li>
                <li>Instant Stripe payment link generation inside chat</li>
                <li>Client payment reminder automation</li>
              </ul>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-medium">
                <strong>Recommended Action:</strong> Prioritize payment link integration in Sprint 1 to maximize early conversion signal.
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-md"
              >
                Close & Update Backlog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
