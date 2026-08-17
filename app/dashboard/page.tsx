"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { BoardTab } from "@/components/dashboard/BoardTab";
import { StandupTab } from "@/components/dashboard/StandupTab";
import { RetroTab } from "@/components/dashboard/RetroTab";
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
import { SHOW_ADVANCED_FEATURES } from "@/lib/config/featureFlags";
import { VoiceEngine } from "@/lib/voice/voiceEngine";
import { CommitmentStore } from "@/lib/store/commitmentStore";
import { MemoryService } from "@/lib/db/memoryService";
import { AIOperationsLogger } from "@/lib/agent/aiOperationsLog";
import { PersistenceClient } from "@/lib/store/persistenceClient";
import { useAuth } from "@clerk/nextjs";

export default function DashboardPage() {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  PersistenceClient.setUserScope(userId);
  const [activeTab, setActiveTab] = useState<string>("Today");
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [activeVentureId, setActiveVentureId] = useState<string>("founderally");
  const [isDailyCallActive, setIsDailyCallActive] = useState<boolean>(false);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [mobileAiPanelOpen, setMobileAiPanelOpen] = useState<boolean>(false);
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

  useEffect(() => {
    if (!mounted || !isAuthLoaded || !activeVenture?.id) return;
    let active = true;
    void Promise.all([
      CommitmentStore.hydrate(activeVenture.id),
      MemoryService.hydrate(activeVenture.id),
      AIOperationsLogger.hydrate(activeVenture.id),
    ]).then(() => {
      if (active) CommitmentStore.detectFromSprintHistory(activeVenture.id, activeVenture.sprintHistory);
    });
    return () => {
      active = false;
    };
  }, [mounted, isAuthLoaded, userId, activeVenture?.id, activeVenture?.sprintHistory]);

  const handleUpdateVenture = (updated: Venture) => {
    setVentures((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v))
    );
  };

  const handleVentureCreated = (newVenture: Venture) => {
    VoiceEngine.stopSpeaking();
    VoiceEngine.stopListening();
    setIsDailyCallActive(false);
    setVentures((prev) => [...prev, newVenture]);
    setActiveVentureId(newVenture.id);
  };

  const handleActiveVentureChange = (ventureId: string) => {
    if (ventureId === activeVentureId) return;
    VoiceEngine.stopSpeaking();
    VoiceEngine.stopListening();
    setIsDailyCallActive(false);
    setActiveVentureId(ventureId);
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

  // Determine current tab to render with route protection
  const isPrimaryTab = ["Today", "Overview", "Board", "Standup", "Retrospective", "Retro", "Documents"].includes(activeTab);
  const effectiveTab = isPrimaryTab || SHOW_ADVANCED_FEATURES ? activeTab : "Today";

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* 1. Left Sidebar Navigation (Desktop persistent + Mobile Drawer) */}
      <Sidebar
        activeTab={effectiveTab}
        setActiveTab={setActiveTab}
        activeVentureId={activeVenture.id}
        setActiveVentureId={handleActiveVentureChange}
        ventures={ventures}
        onOpenCreateVenture={() => setCreateModalOpen(true)}
        isDailyCallActive={isDailyCallActive}
        setIsDailyCallActive={setIsDailyCallActive}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar with Venture Switcher & Sub-tabs */}
        <TopHeader
          activeTab={effectiveTab}
          setActiveTab={setActiveTab}
          activeVenture={activeVenture}
          ventures={ventures}
          setActiveVentureId={handleActiveVentureChange}
          onOpenCreateVenture={() => setCreateModalOpen(true)}
          isDailyCallActive={isDailyCallActive}
          setIsDailyCallActive={setIsDailyCallActive}
          onUpdateVenture={handleUpdateVenture}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onToggleMobileAiPanel={() => setMobileAiPanelOpen(!mobileAiPanelOpen)}
        />

        {/* Dynamic Main Workspace Canvas */}
        <main className="flex-1 p-3 sm:p-5 bg-slate-50/50 min-w-0">
          {(effectiveTab === "Today" || effectiveTab === "Overview") && (
            <OverviewTab
              venture={activeVenture}
              onUpdateVenture={handleUpdateVenture}
              setActiveTab={setActiveTab}
            />
          )}
          {effectiveTab === "Board" && (
            <BoardTab
              venture={activeVenture}
              onUpdateVenture={handleUpdateVenture}
            />
          )}
          {effectiveTab === "Standup" && (
            <StandupTab
              key={activeVenture.id}
              venture={activeVenture}
              onUpdateVenture={handleUpdateVenture}
              isDailyCallActive={isDailyCallActive}
              setIsDailyCallActive={setIsDailyCallActive}
              setActiveTab={setActiveTab}
            />
          )}
          {(effectiveTab === "Retrospective" || effectiveTab === "Retro") && (
            <RetroTab
              venture={activeVenture}
              onUpdateVenture={handleUpdateVenture}
              setActiveTab={setActiveTab}
            />
          )}
          {effectiveTab === "Documents" && <DocumentsTab venture={activeVenture} />}

          {/* Advanced Tabs (Guarded by SHOW_ADVANCED_FEATURES) */}
          {SHOW_ADVANCED_FEATURES && (
            <>
              {effectiveTab === "Strategy" && <StrategyTab venture={activeVenture} />}
              {effectiveTab === "Assumptions" && (
                <AssumptionsTab
                  venture={activeVenture}
                  onUpdateVenture={handleUpdateVenture}
                />
              )}
              {effectiveTab === "Requirements" && <RequirementsTab venture={activeVenture} />}
              {effectiveTab === "Experiments" && (
                <ExperimentsTab
                  venture={activeVenture}
                  onUpdateVenture={handleUpdateVenture}
                />
              )}
              {effectiveTab === "Roadmap" && <RoadmapTab venture={activeVenture} />}
              {effectiveTab === "Metrics" && <MetricsTab venture={activeVenture} />}
            </>
          )}
        </main>
      </div>

      {/* 3. Right AI Business Analyst Co-Pilot Panel (Desktop persistent + Mobile Drawer / FAB) */}
      <AiAnalystPanel
        key={activeVenture.id}
        isDailyCallActive={isDailyCallActive}
        setIsDailyCallActive={setIsDailyCallActive}
        venture={activeVenture}
        onUpdateVenture={handleUpdateVenture}
        isMobileOpen={mobileAiPanelOpen}
        onMobileClose={() => setMobileAiPanelOpen(false)}
        onMobileOpen={() => setMobileAiPanelOpen(true)}
        voiceControlsManagedExternally={effectiveTab === "Standup"}
        activeWorkspace={effectiveTab}
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
        advisorId={activeVenture.advisorId}
        advisorVoiceName={activeVenture.advisorVoiceName}
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
