"use client";

import React from "react";
import { MiniChart } from "@/components/ui/mini-chart";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";

export default function ActivityMiniCharts({ documents, tasks, invoices }) {
  // Get last 8 weeks for meaningful data visualization
  const getWeeklyBuckets = () => {
    const now = new Date();
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: format(weekStart, "d/M", { locale: fr }),
      });
    }
    return weeks;
  };

  const weeks = getWeeklyBuckets();

  const isInWeek = (dateStr, weekStart, weekEnd) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d >= weekStart && d <= weekEnd;
  };

  // Documents uploaded per week
  const documentsData = weeks.map((week) => {
    const count = documents.filter((doc) =>
      isInWeek(doc.created_at || doc.created_date, week.start, week.end)
    ).length;
    return { label: week.label, value: count };
  });

  // Tasks completed per week (based on update date or creation date)
  const tasksData = weeks.map((week) => {
    const count = tasks.filter((task) => {
      if (task.status !== "terminée") return false;
      return isInWeek(task.updated_at || task.updated_date || task.created_at || task.created_date, week.start, week.end);
    }).length;
    return { label: week.label, value: count };
  });

  // Invoices created per week
  const invoicesData = weeks.map((week) => {
    const count = invoices.filter((inv) =>
      isInWeek(inv.created_at || inv.created_date || inv.invoice_date, week.start, week.end)
    ).length;
    return { label: week.label, value: count };
  });

  // If all weekly data is zero, fall back to showing totals as a summary
  const allDocsZero = documentsData.every(d => d.value === 0);
  const allTasksZero = tasksData.every(d => d.value === 0);
  const allInvZero = invoicesData.every(d => d.value === 0);

  // Fallback: show monthly data (last 8 months) if weekly is all zero
  const getMonthlyBuckets = () => {
    const months = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      months.push({
        start,
        end,
        label: format(start, "MMM", { locale: fr }).charAt(0).toUpperCase() + format(start, "MMM", { locale: fr }).slice(1, 3),
      });
    }
    return months;
  };

  const useMonthly = allDocsZero && allTasksZero && allInvZero;
  const months = useMonthly ? getMonthlyBuckets() : [];

  const docsDisplay = useMonthly
    ? months.map(m => ({
        label: m.label,
        value: documents.filter(doc => isInWeek(doc.created_at || doc.created_date, m.start, m.end)).length,
      }))
    : documentsData;

  const tasksDisplay = useMonthly
    ? months.map(m => ({
        label: m.label,
        value: tasks.filter(t => {
          const raw = t.updated_at || t.updated_date || t.created_at || t.created_date;
          return isInWeek(raw, m.start, m.end);
        }).length,
      }))
    : tasksData;

  const invDisplay = useMonthly
    ? months.map(m => ({
        label: m.label,
        value: invoices.filter(inv => isInWeek(inv.created_at || inv.created_date || inv.invoice_date, m.start, m.end)).length,
      }))
    : invoicesData;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MiniChart
        data={docsDisplay}
        title={`Documents ajoutés (${documents.length})`}
        color="blue"
      />
      <MiniChart
        data={tasksDisplay}
        title={`Tâches complétées (${tasks.filter(t => t.status === "terminée").length})`}
        color="emerald"
      />
      <MiniChart
        data={invDisplay}
        title={`Factures traitées (${invoices.length})`}
        color="indigo"
      />
    </div>
  );
}
