"use client";

import React from "react";
import { MiniChart } from "@/components/ui/mini-chart";
import { subDays, format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ActivityMiniCharts({ documents, tasks, invoices }) {
  // Get last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      days.push({
        date,
        label: format(date, "EEE", { locale: fr }).charAt(0).toUpperCase(),
      });
    }
    return days;
  };

  const last7Days = getLast7Days();

  // Documents uploaded per day
  const documentsData = last7Days.map((day) => {
    const count = documents.filter((doc) => {
      const raw = doc.created_at || doc.created_date;
      if (!raw) return false;
      const docDate = new Date(raw);
      if (isNaN(docDate.getTime())) return false;
      return format(docDate, "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd");
    }).length;
    return { label: day.label, value: count };
  });

  // Tasks completed per day
  const tasksData = last7Days.map((day) => {
    const count = tasks.filter((task) => {
      if (task.status !== "terminée") return false;
      const raw = task.updated_at || task.updated_date || task.created_at || task.created_date;
      if (!raw) return false;
      const taskDate = new Date(raw);
      if (isNaN(taskDate.getTime())) return false;
      return format(taskDate, "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd");
    }).length;
    return { label: day.label, value: count };
  });

  // Invoices processed per day
  const invoicesData = last7Days.map((day) => {
    const count = invoices.filter((inv) => {
      const raw = inv.created_at || inv.created_date;
      if (!raw) return false;
      const invDate = new Date(raw);
      if (isNaN(invDate.getTime())) return false;
      return format(invDate, "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd");
    }).length;
    return { label: day.label, value: count };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MiniChart
        data={documentsData}
        title="Documents ajoutés"
        color="blue"
      />
      <MiniChart
        data={tasksData}
        title="Tâches complétées"
        color="emerald"
      />
      <MiniChart
        data={invoicesData}
        title="Factures traitées"
        color="indigo"
      />
    </div>
  );
}
