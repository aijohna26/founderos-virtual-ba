import { Venture, KanbanCard } from "@/lib/store/ventureStore";
import { formatAssigneesForAdvisor } from "@/lib/venture/members";

/**
 * Downloads text/binary content as a file in the user's browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all Kanban board cards to CSV format.
 */
export function exportBoardToCSV(venture: Venture) {
  const headers = [
    "Column",
    "Card ID",
    "Title",
    "Category",
    "Priority",
    "Assignees",
    "Checklists Done",
    "Checklists Total",
    "Progress (%)",
    "Description",
    "Linked Assumption ID",
  ];

  const rows: string[][] = [headers];

  const colKeys: (keyof Venture["columns"])[] = ["backlog", "today", "in_progress", "done", "blocked"];

  colKeys.forEach((key) => {
    const col = venture.columns[key];
    if (!col) return;
    const items: KanbanCard[] = Array.isArray(col) ? col : (col as any).items || [];
    const colName = (col as any).name || key;

    items.forEach((card) => {
      const totalChecks = card.checklists?.length || 0;
      const doneChecks = card.checklists?.filter((c) => c.done).length || 0;
      const progress = card.progress ?? (totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0);

      rows.push([
        colName,
        card.id,
        card.title,
        card.category || "Feature",
        card.priority || "Medium",
        formatAssigneesForAdvisor(venture, card),
        String(doneChecks),
        String(totalChecks),
        `${progress}%`,
        (card.description || "").replace(/"/g, '""'),
        card.linkedAssumptionId || "",
      ]);
    });
  });

  const csvContent = rows
    .map((row) => row.map((cell) => `"${cell.replace(/\n/g, " ")}"`).join(","))
    .join("\n");

  const cleanName = (venture.name || "venture").toLowerCase().replace(/[^a-z0-9]/g, "-");
  downloadFile(csvContent, `${cleanName}-kanban-board.csv`, "text/csv;charset=utf-8;");
}

/**
 * Exports complete venture state as portable JSON backup.
 */
export function exportVentureToJSON(venture: Venture) {
  const jsonContent = JSON.stringify(venture, null, 2);
  const cleanName = (venture.name || "venture").toLowerCase().replace(/[^a-z0-9]/g, "-");
  downloadFile(jsonContent, `${cleanName}-venture-backup.json`, "application/json");
}

/**
 * Exports venture as a formatted Markdown Executive PRD Report.
 */
export function exportVentureToMarkdown(venture: Venture) {
  const cleanName = (venture.name || "venture").toLowerCase().replace(/[^a-z0-9]/g, "-");
  let md = `# Executive Venture Report: ${venture.name}\n\n`;
  md += `**Tagline:** ${venture.tagline || ""}\n`;
  md += `**Status:** ${venture.status || "Active"}\n`;
  md += `**Exported At:** ${new Date().toLocaleString()}\n\n`;

  md += `## 1. Problem & Customer Discovery\n`;
  md += `- **Problem Statement:** ${venture.problemStatement || "N/A"}\n`;
  md += `- **Target Customer:** ${venture.targetCustomer || "N/A"}\n\n`;

  md += `## 2. Core Value Hypotheses & Assumptions\n`;
  if (venture.assumptions && venture.assumptions.length > 0) {
    venture.assumptions.forEach((a, i) => {
      md += `${i + 1}. **[${a.category}]** ${a.statement} *(Status: ${a.status})*\n`;
    });
  } else {
    md += `*No assumptions recorded yet.*\n`;
  }
  md += `\n`;

  md += `## 3. Kanban Board & Active Sprint Tasks\n\n`;
  const colKeys: (keyof Venture["columns"])[] = ["today", "in_progress", "backlog", "done", "blocked"];

  colKeys.forEach((key) => {
    const col = venture.columns[key];
    if (!col) return;
    const items: KanbanCard[] = Array.isArray(col) ? col : (col as any).items || [];
    const colName = ((col as any).name || key).toUpperCase();

    md += `### List: ${colName} (${items.length})\n`;
    if (items.length === 0) {
      md += `*No cards in this column.*\n\n`;
      return;
    }

    items.forEach((card) => {
      md += `#### • [${card.category}] ${card.title} (${card.priority || "Medium"} Priority)\n`;
      if (card.description) {
        md += `> ${card.description.replace(/\n/g, "\n> ")}\n\n`;
      }
      if (card.checklists && card.checklists.length > 0) {
        md += `**Acceptance Criteria:**\n`;
        card.checklists.forEach((c) => {
          md += `- [${c.done ? "x" : " "}] ${c.text}\n`;
        });
        md += `\n`;
      }
    });
    md += `\n`;
  });

  downloadFile(md, `${cleanName}-executive-summary.md`, "text/markdown;charset=utf-8;");
}
