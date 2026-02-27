"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PriorityDistribution({ tasks }) {
  const priorityCount = {
    basse: 0,
    moyenne: 0,
    haute: 0,
    urgente: 0,
  };

  tasks.filter(t => t.status !== 'termin\u00e9e').forEach(task => {
    if (priorityCount.hasOwnProperty(task.priority)) {
      priorityCount[task.priority]++;
    }
  });

  const data = [
    { name: "Urgente", value: priorityCount.urgente, color: "#ef4444" },
    { name: "Haute", value: priorityCount.haute, color: "#f59e0b" },
    { name: "Moyenne", value: priorityCount.moyenne, color: "#3b82f6" },
    { name: "Basse", value: priorityCount.basse, color: "#9ca3af" },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{payload[0].payload.name}</p>
          <p className="text-sm text-gray-600">{payload[0].value} t\u00e2che{payload[0].value > 1 ? 's' : ''}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          T\u00e2ches par priorit\u00e9
        </CardTitle>
        <p className="text-sm text-gray-500">T\u00e2ches en cours</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" stroke="#9ca3af" fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#9ca3af"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
