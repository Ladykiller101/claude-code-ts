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
      const docDate = new Date(doc.created_date);
      return format(docDate, "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd");
    }).length;
    return { label: day.label, value: count };
  });

  // Tasks completed per day
  const tasksData = last7Days.map((day) => {
    const count = tasks.filter((task) => {
      if (task.status !== "termin\u00e9e") return false;
      const taskDate = new Date(task.updated_date || task.created_date);
      return format(taskDate, "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd");
    }).length;
    return { label: day.label, value: count };
  });

  // Invoices processed per day
  const invoicesData = last7Days.map((day) => {
    const count = invoices.filter((inv) => {
      const invDate = new Date(inv.created_date);
      return format(invDate, "yyyy-MM-dd") === format(day.date, "yyyy-MM-dd");
    }).length;
    return { label: day.label, value: count };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MiniChart
        data={documentsData}
        title="Documents ajout\u00e9s"
        color="blue"
      />
      <MiniChart
        data={tasksData}
        title="T\u00e2ches compl\u00e9t\u00e9es"
        color="emerald"
      />
      <MiniChart
        data={invoicesData}
        title="Factures trait\u00e9es"
        color="indigo"
      />
    </div>
  );
}
