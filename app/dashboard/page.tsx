"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { BoardTab } from "@/components/dashboard/BoardTab";
import { StrategyTab } from "@/components/dashboard/StrategyTab";
import { AssumptionsTab } from "@/components/dashboard/AssumptionsTab";
import { RequirementsTab } from "@/components/dashboard/RequirementsTab";
import { ExperimentsTab } from "@/components/dashboard/ExperimentsTab";
import { MetricsTab } from "@/components/dashboard/MetricsTab";
import { RoadmapTab } from "@/components/dashboard/RoadmapTab";
import { DocumentsTab } from "@/components/dashboard/DocumentsTab";
import { AiAnalystPanel } from "@/components/dashboard/AiAnalystPanel";
import { CreateVentureModal } from "@/components/dashboard/CreateVentureModal";
import { DailyCallAlertModal } from "@/components/dashboard/DailyCallAlertModal";
import { SettingsModal } from "@/components/dashboard/SettingsModal";
import { HelpSupportModal } from "@/components/dashboard/HelpSupportModal";
import { VentureStore, Venture } from "@/lib/store/ventureStore";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [activeVentureId, setActiveVentureId] = useState<string>("founderally");
  const [isDailyCallActive, setIsDailyCallActive] = useState<boolean>(false);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const loaded = VentureStore.getVentures();
    setVentures(loaded);
    if (loaded.length > 0) {
      setActiveVentureId(loaded[0].id);
    }
    setMounted(true);
  }, []);

  const activeVenture =
    ventures.find((v) => v.id === activeVentureId) ||
    ventures[0] ||
    VentureStore.getVentures()[0];

  const handleUpdateVenture = (updated: Venture) => {
    setVentures((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v))
    );
  };

  const handleVentureCreated = (newVenture: Venture) => {
    setVentures((prev) => [...prev, newVenture]);
    setActiveVentureId(newVenture.id);
  };

  if (!mounted || !activeVenture) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading FounderAlly Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeVentureId={activeVenture.id}
        setActiveVentureId={setActiveVentureId}
        ventures={ventures}
        onOpenCreateVenture={() => setCreateModalOpen(true)}
        isDailyCallActive={isDailyCallActive}
        setIsDailyCallActive={setIsDailyCallActive}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar with Venture Switcher & Sub-tabs */}
        <TopHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeVenture={activeVenture}
          ventures={ventures}
          setActiveVentureId={setActiveVentureId}
          onOpenCreateVenture={() => setCreateModalOpen(true)}
          isDailyCallActive={isDailyCallActive}
          setIsDailyCallActive={setIsDailyCallActive}
          onUpdateVenture={handleUpdateVenture}
        />

        {/* Dynamic Main Workspace Canvas */}
        <main className="flex-1 p-4 md:p-5 bg-slate-50/50 min-w-0">
          {activeTab === "Overview" && (
            <OverviewTab
              venture={activeVenture}
              onUpdateVenture={handleUpdateVenture}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "Board" && (
            <BoardTab
              venture={activeVenture}
              onUpdateVenture={handleUpdateVenture}
            />
          )}
          {activeTab === "Strategy" && <StrategyTab venture={activeVenture} />}
          {activeTab === "Assumptions" && (
            <AssumptionsTab
              venture={activeVenture}
              onUpdateVenture={handleUpdateVenture}
            />
          )}
          {activeTab === "Requirements" && <RequirementsTab venture={activeVenture} />}
          {activeTab === "Experiments" && (
            <ExperimentsTab
              venture={activeVenture}
              onUpdateVenture={handleUpdateVenture}
            />
          )}
          {activeTab === "Roadmap" && <RoadmapTab venture={activeVenture} />}
          {activeTab === "Metrics" && <MetricsTab venture={activeVenture} />}
          {activeTab === "Documents" && <DocumentsTab venture={activeVenture} />}
        </main>
      </div>

      {/* 3. Right AI Business Analyst Co-Pilot Panel */}
      <AiAnalystPanel
        isDailyCallActive={isDailyCallActive}
        setIsDailyCallActive={setIsDailyCallActive}
        venture={activeVenture}
        onUpdateVenture={handleUpdateVenture}
      />

      {/* 4. Create New Venture Modal */}
      <CreateVentureModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onVentureCreated={handleVentureCreated}
      />

      {/* 5. Daily Call 15 / 10 / 5 min Alarm Alert Modal */}
      <DailyCallAlertModal
        isDailyCallActive={isDailyCallActive}
        onJoinCall={() => {
          setIsDailyCallActive(true);
          setActiveTab("Board");
        }}
        ventureName={activeVenture.name}
      />

      {/* 6. Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        venture={activeVenture}
        onUpdateVenture={handleUpdateVenture}
      />

      {/* 7. Help & Support Modal */}
      <HelpSupportModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </div>
  );
}
