"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export default function ClientsOverview({ clients }) {
  const typeCount = {};

  clients.forEach(client => {
    const type = client.type || 'Autre';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  const data = Object.entries(typeCount).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = {
    'TPE': '#3b82f6',
    'PME': '#8b5cf6',
    'ETI': '#ec4899',
    'Grand compte': '#f59e0b',
    'Particulier': '#10b981',
    'Autre': '#6b7280',
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{data.value} client{data.value > 1 ? 's' : ''}</p>
          <p className="text-xs text-gray-500 mt-1">
            {((data.value / clients.length) * 100).toFixed(0)}% du portefeuille
          </p>
        </div>
      );
    }
    return null;
  };

  // Status breakdown
  const statusCount = {
    actif: clients.filter(c => c.status === 'actif').length,
    prospect: clients.filter(c => c.status === 'prospect').length,
    inactif: clients.filter(c => c.status === 'inactif').length,
  };

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Portefeuille clients
        </CardTitle>
        <p className="text-sm text-gray-500">{clients.length} clients au total</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
            <p className="text-2xl font-bold text-emerald-700">{statusCount.actif}</p>
            <p className="text-xs text-emerald-600 mt-1">Actifs</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
            <p className="text-2xl font-bold text-blue-700">{statusCount.prospect}</p>
            <p className="text-xs text-blue-600 mt-1">Prospects</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
            <p className="text-2xl font-bold text-gray-700">{statusCount.inactif}</p>
            <p className="text-xs text-gray-600 mt-1">Inactifs</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-4">R\u00e9partition par type</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS.Autre} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
