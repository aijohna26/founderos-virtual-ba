/**
 * FounderAlly Feature Flags Configuration
 *
 * Controls whether advanced startup OS modules (Strategy, Assumptions,
 * Requirements, Experiments, Roadmap, Metrics) are visible in the primary navigation
 * or hidden behind the focused AI Business Analyst experience (Today, Board, Stand-up, Retrospective, Documents).
 */

export const SHOW_ADVANCED_FEATURES: boolean =
  typeof process !== "undefined" &&
  (process.env.NEXT_PUBLIC_SHOW_ADVANCED_FEATURES === "true" ||
    process.env.SHOW_ADVANCED_FEATURES === "true");

export function isAdvancedFeaturesEnabled(): boolean {
  return SHOW_ADVANCED_FEATURES;
}

export interface NavTabItem {
  id: string;
  label: string;
  isAdvanced?: boolean;
}

export const PRIMARY_TABS: NavTabItem[] = [
  { id: "Today", label: "Today" },
  { id: "Board", label: "Board" },
  { id: "Standup", label: "Stand-up" },
  { id: "Retrospective", label: "Retrospective" },
  { id: "Documents", label: "Documents" },
];

export const ADVANCED_TABS: NavTabItem[] = [
  { id: "Strategy", label: "Strategy", isAdvanced: true },
  { id: "Assumptions", label: "Assumptions", isAdvanced: true },
  { id: "Requirements", label: "Requirements", isAdvanced: true },
  { id: "Experiments", label: "Experiments", isAdvanced: true },
  { id: "Roadmap", label: "Roadmap", isAdvanced: true },
  { id: "Metrics", label: "Metrics", isAdvanced: true },
];

export function getVisibleTabs(showAdvanced: boolean = SHOW_ADVANCED_FEATURES): NavTabItem[] {
  if (showAdvanced) {
    return [...PRIMARY_TABS, ...ADVANCED_TABS];
  }
  return PRIMARY_TABS;
}
