"use client";

import React, { useMemo } from "react";
import { MiniChart } from "@/components/ui/mini-chart";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ActivityMiniCharts({ documents, tasks, invoices }) {
  // Always use monthly buckets - covers all data regardless of when it was created
  const months = useMemo(() => {
    const result = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = format(start, "MMM", { locale: fr });
      result.push({
        start,
        end,
        label: label.charAt(0).toUpperCase() + label.slice(1, 3),
      });
    }
    return result;
  }, []);

  const isInRange = (dateStr, rangeStart, rangeEnd) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d >= rangeStart && d <= rangeEnd;
  };

  // Documents per month
  const docsData = useMemo(() =>
    months.map(m => ({
      label: m.label,
      value: documents.filter(doc =>
        isInRange(doc.created_at || doc.created_date, m.start, m.end)
      ).length,
    }))
  , [documents, months]);

  // ALL tasks created per month (shows activity volume)
  const tasksData = useMemo(() =>
    months.map(m => ({
      label: m.label,
      value: tasks.filter(t =>
        isInRange(t.created_at || t.created_date, m.start, m.end)
      ).length,
    }))
  , [tasks, months]);

  // Invoices per month
  const invData = useMemo(() =>
    months.map(m => ({
      label: m.label,
      value: invoices.filter(inv =>
        isInRange(inv.invoice_date || inv.created_at || inv.created_date, m.start, m.end)
      ).length,
    }))
  , [invoices, months]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MiniChart
        data={docsData}
        title={`Documents (${documents.length})`}
        color="blue"
      />
      <MiniChart
        data={tasksData}
        title={`Tâches (${tasks.length})`}
        color="emerald"
      />
      <MiniChart
        data={invData}
        title={`Factures (${invoices.length})`}
        color="indigo"
      />
    </div>
  );
}
