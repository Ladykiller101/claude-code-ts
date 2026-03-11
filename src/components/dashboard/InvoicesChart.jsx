"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoicesChart({ invoices }) {
  // Group invoices by month
  const monthlyData = {};

  invoices.forEach(invoice => {
    if (!invoice.invoice_date) return;
    const date = new Date(invoice.invoice_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthLabel,
        achats: 0,
        ventes: 0,
        total: 0,
      };
    }

    const amount = invoice.amount_ttc || 0;
    monthlyData[monthKey].total += amount;

    if (invoice.category === 'achat' || invoice.category === 'frais_généraux') {
      monthlyData[monthKey].achats += amount;
    } else if (invoice.category === 'vente') {
      monthlyData[monthKey].ventes += amount;
    }
  });

  const chartData = Object.keys(monthlyData)
    .sort()
    .slice(-6)
    .map(key => monthlyData[key]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900 mb-2">{payload[0].payload.month}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Évolution des factures
        </CardTitle>
        <p className="text-sm text-gray-500">6 derniers mois</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              stroke="#9ca3af"
              fontSize={12}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar dataKey="ventes" name="Ventes" fill="#10b981" radius={[8, 8, 0, 0]} />
            <Bar dataKey="achats" name="Achats" fill="#6366f1" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
