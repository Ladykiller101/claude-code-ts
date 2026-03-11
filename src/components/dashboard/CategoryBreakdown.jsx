"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function CategoryBreakdown({ invoices }) {
  const categoryTotals = {};

  invoices.forEach(invoice => {
    const category = invoice.category || 'autre';
    if (!categoryTotals[category]) {
      categoryTotals[category] = {
        total: 0,
        count: 0,
      };
    }
    categoryTotals[category].total += invoice.amount_ttc || 0;
    categoryTotals[category].count++;
  });

  const categoryData = Object.entries(categoryTotals)
    .map(([category, data]) => ({
      name: category,
      ...data,
    }))
    .sort((a, b) => b.total - a.total);

  const totalAmount = categoryData.reduce((sum, cat) => sum + cat.total, 0);

  const getCategoryLabel = (category) => {
    const labels = {
      achat: "Achats",
      vente: "Ventes",
      "frais_généraux": "Frais généraux",
      immobilisation: "Immobilisations",
      autre: "Autres",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      achat: "bg-blue-500",
      vente: "bg-emerald-500",
      "frais_généraux": "bg-amber-500",
      immobilisation: "bg-purple-500",
      autre: "bg-gray-500",
    };
    return colors[category] || colors.autre;
  };

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Répartition par catégorie
        </CardTitle>
        <p className="text-sm text-gray-500">Montants totaux</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categoryData.map((category, index) => {
            const percentage = (category.total / totalAmount) * 100;

            return (
              <div key={category.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(category.name)}`} />
                    <span className="text-sm font-medium text-gray-900">
                      {getCategoryLabel(category.name)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({category.count})
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {category.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${getCategoryColor(category.name)} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {categoryData.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            Aucune donnée disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}
