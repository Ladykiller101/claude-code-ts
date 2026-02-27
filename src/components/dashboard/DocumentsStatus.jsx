"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DocumentsStatus({ documents }) {
  const statusCount = {
    en_attente: 0,
    "trait\u00e9": 0,
    "valid\u00e9": 0,
    "rejet\u00e9": 0,
  };

  documents.forEach(doc => {
    if (statusCount.hasOwnProperty(doc.status)) {
      statusCount[doc.status]++;
    }
  });

  // Documents by category
  const categoryCount = {};
  documents.forEach(doc => {
    const cat = doc.category || 'autre';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  // Monthly upload trend (last 6 months)
  const monthlyUploads = {};
  documents.forEach(doc => {
    const date = new Date(doc.created_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('fr-FR', { month: 'short' });

    if (!monthlyUploads[monthKey]) {
      monthlyUploads[monthKey] = { month: monthLabel, count: 0 };
    }
    monthlyUploads[monthKey].count++;
  });

  const chartData = Object.keys(monthlyUploads)
    .sort()
    .slice(-6)
    .map(key => monthlyUploads[key]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-medium text-gray-900">{payload[0].payload.month}</p>
          <p className="text-sm text-gray-600">{payload[0].value} document{payload[0].value > 1 ? 's' : ''}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Gestion documentaire
        </CardTitle>
        <p className="text-sm text-gray-500">{documents.length} documents</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-600">En attente</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{statusCount.en_attente}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Trait\u00e9s</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{statusCount["trait\u00e9"]}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">Valid\u00e9s</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{statusCount["valid\u00e9"]}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-medium text-rose-600">Rejet\u00e9s</span>
            </div>
            <p className="text-2xl font-bold text-rose-700">{statusCount["rejet\u00e9"]}</p>
          </div>
        </div>

        {/* Upload Trend */}
        {chartData.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-4">Tendance des uploads</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  stroke="#9ca3af"
                  fontSize={11}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
