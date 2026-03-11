"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TasksStatusChart({ tasks }) {
  const statusCount = {
    "à_faire": 0,
    en_cours: 0,
    en_attente_client: 0,
    "terminée": 0,
  };

  tasks.forEach(task => {
    if (statusCount.hasOwnProperty(task.status)) {
      statusCount[task.status]++;
    }
  });

  const data = [
    { name: "À faire", value: statusCount["à_faire"], color: "#9ca3af" },
    { name: "En cours", value: statusCount.en_cours, color: "#3b82f6" },
    { name: "En attente", value: statusCount.en_attente_client, color: "#f59e0b" },
    { name: "Terminées", value: statusCount["terminée"], color: "#10b981" },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{data.value} tâche{data.value > 1 ? 's' : ''}</p>
          <p className="text-xs text-gray-500 mt-1">
            {((data.value / tasks.length) * 100).toFixed(0)}% du total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Répartition des tâches
        </CardTitle>
        <p className="text-sm text-gray-500">Par statut</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
