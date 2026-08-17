"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  PhoneCall,
  Clock,
  Bell,
  X,
  Volume2,
  Calendar,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { playAlertChime } from "@/lib/utils/soundAlert";

export interface DailyCallAlertModalProps {
  isDailyCallActive: boolean;
  onJoinCall: () => void;
  ventureName: string;
}

export function DailyCallAlertModal({
  isDailyCallActive,
  onJoinCall,
  ventureName,
}: DailyCallAlertModalProps) {
  const [scheduledTime, setScheduledTime] = useState<string>("09:00");
  const [activeAlertMinutes, setActiveAlertMinutes] = useState<number | null>(null);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [lastDismissedMinute, setLastDismissedMinute] = useState<number | null>(null);
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>("");

  // Load scheduled call time from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("founderally_daily_call_time");
      if (saved) setScheduledTime(saved);
    } catch {}
  }, []);

  // Monitor clock and trigger 15 / 10 / 5 min alerts
  useEffect(() => {
    const checkSchedule = () => {
      if (isDailyCallActive) {
        setActiveAlertMinutes(null);
        return;
      }

      const now = new Date();
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const callDate = new Date();
      callDate.setHours(hours, minutes, 0, 0);

      // If call time has already passed today, calculate for next day or just today
      let diffMs = callDate.getTime() - now.getTime();
      if (diffMs < -1000 * 60 * 30) {
        // More than 30 mins past, schedule for tomorrow
        callDate.setDate(callDate.getDate() + 1);
        diffMs = callDate.getTime() - now.getTime();
      }

      const diffMinutes = Math.round(diffMs / (1000 * 60));
      const diffSeconds = Math.max(0, Math.round(diffMs / 1000));
      const minsLeft = Math.floor(diffSeconds / 60);
      const secsLeft = diffSeconds % 60;
      setTimeRemainingStr(`${minsLeft}m ${secsLeft.toString().padStart(2, "0")}s`);

      // Check snooze
      if (snoozedUntil && now.getTime() < snoozedUntil) {
        return;
      }

      // Check 15 min, 10 min, 5 min, or 0 min intervals
      if (diffMinutes === 15 || diffMinutes === 10 || diffMinutes === 5 || diffMinutes === 0) {
        if (lastDismissedMinute !== diffMinutes && activeAlertMinutes !== diffMinutes) {
          setActiveAlertMinutes(diffMinutes);
          playAlertChime();
        }
      }
    };

    const interval = setInterval(checkSchedule, 1000);
    checkSchedule();
    return () => clearInterval(interval);
  }, [scheduledTime, isDailyCallActive, snoozedUntil, lastDismissedMinute, activeAlertMinutes]);

  const handleSnooze = () => {
    // Snooze for 5 minutes
    const snoozeTime = Date.now() + 5 * 60 * 1000;
    setSnoozedUntil(snoozeTime);
    setActiveAlertMinutes(null);
  };

  const handleDismiss = () => {
    if (activeAlertMinutes !== null) {
      setLastDismissedMinute(activeAlertMinutes);
    }
    setActiveAlertMinutes(null);
  };

  const handleJoin = () => {
    setActiveAlertMinutes(null);
    onJoinCall();
  };

  // For testing alarms directly in UI
  const triggerTestAlert = (minutes: number) => {
    setActiveAlertMinutes(minutes);
    playAlertChime();
  };

  return (
    <>
      {/* Floating Alert Card when alert is active */}
      {activeAlertMinutes !== null && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border-2 border-blue-500/80 ring-4 ring-blue-500/10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/30">
                    <PhoneCall className="w-5 h-5 animate-bounce" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
                      {activeAlertMinutes === 0
                        ? "Call Starting Now!"
                        : `Call in ${activeAlertMinutes} Minutes`}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mt-0.5">
                    Daily Standup with AI Business Analyst
                  </h4>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context & Avatar preview */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                <Image
                  src="/avatar-ai-ba.jpg"
                  alt="AI BA"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Ready to review today&apos;s priorities, stress-test hypotheses, and plan sprints for{" "}
                <strong className="text-slate-900">{ventureName}</strong>.
              </div>
            </div>

            {/* Actions: Join Now, Snooze 5m, Dismiss */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSnooze}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Snooze 5m
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>

              <button
                onClick={handleJoin}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Join Call</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Alarm Test Trigger (Wrapped neatly inside sidebar width) */}
      <div className="fixed bottom-3 left-3 z-40 hidden md:flex flex-col gap-1 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-slate-200/90 shadow-xs text-slate-600 text-[10px] font-medium max-w-[170px] select-none">
        <div className="flex items-center gap-1 font-bold text-slate-800">
          <Bell className="w-3 h-3 text-blue-600 shrink-0" />
          <span className="truncate">Alarm: 09:00 AM</span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-slate-400 font-medium">Test:</span>
          <button
            onClick={() => triggerTestAlert(15)}
            className="px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors"
          >
            15m
          </button>
          <button
            onClick={() => triggerTestAlert(10)}
            className="px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors"
          >
            10m
          </button>
          <button
            onClick={() => triggerTestAlert(5)}
            className="px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors"
          >
            5m
          </button>
        </div>
      </div>
    </>
  );
}
