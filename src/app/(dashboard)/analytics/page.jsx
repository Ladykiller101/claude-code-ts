"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  Sparkles,
  Target,
  Zap,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function Analytics() {
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.invoices.list("-created_date"),
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.clients.list(),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => db.tasks.list(),
  });

  const isLoading = loadingInvoices || loadingClients || loadingTasks;

  // Calculate metrics from real data
  const totalRevenue = invoices
    .filter(inv => inv.category === "vente")
    .reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);

  const totalExpenses = invoices
    .filter(inv => inv.category !== "vente")
    .reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  const activeClientsCount = clients.filter(c => c.status === "actif").length;
  const newClientsCount = useMemo(() => {
    const oneMonthAgo = subMonths(new Date(), 1);
    return clients.filter(c => {
      const d = new Date(c.created_at || c.created_date);
      return !isNaN(d.getTime()) && d > oneMonthAgo;
    }).length;
  }, [clients]);

  // Real AI Insights computed from data
  const aiInsights = useMemo(() => {
    const insights = [];
    const pendingInvoices = invoices.filter(i => i.status === "à_traiter");
    const overdueTasks = tasks.filter(t => {
      if (t.status === "terminée" || !t.due_date) return false;
      return new Date(t.due_date) < new Date();
    });

    if (pendingInvoices.length > 0) {
      const pendingTotal = pendingInvoices.reduce((s, i) => s + (i.amount_ttc || 0), 0);
      insights.push({
        type: "warning",
        title: `${pendingInvoices.length} facture(s) à traiter`,
        description: `${pendingTotal.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} en attente de traitement`,
        impact: "Moyenne",
        icon: AlertCircle,
        color: "text-amber-400"
      });
    }

    if (totalRevenue > 0) {
      insights.push({
        type: "success",
        title: "Chiffre d'affaires",
        description: `CA total de ${totalRevenue.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} sur les ventes enregistrées`,
        impact: "Élevé",
        icon: TrendingUp,
        color: "text-emerald-400"
      });
    }

    if (overdueTasks.length > 0) {
      insights.push({
        type: "alert",
        title: `${overdueTasks.length} tâche(s) en retard`,
        description: "Des tâches ont dépassé leur date d'échéance et nécessitent votre attention",
        impact: "Élevé",
        icon: AlertCircle,
        color: "text-rose-400"
      });
    }

    if (totalExpenses > 0) {
      insights.push({
        type: "info",
        title: "Suivi des dépenses",
        description: `Total des dépenses : ${totalExpenses.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}. Marge nette : ${profitMargin}%`,
        impact: "Moyenne",
        icon: Sparkles,
        color: "text-indigo-400"
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: "info",
        title: "Données en cours",
        description: "Ajoutez des factures et tâches pour voir les insights IA apparaître ici",
        impact: "—",
        icon: Sparkles,
        color: "text-indigo-400"
      });
    }

    return insights.slice(0, 3);
  }, [invoices, tasks, totalRevenue, totalExpenses, profitMargin]);

  // Revenue by month from real invoices (last 6 months)
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = startOfMonth(subMonths(new Date(), i - 1));
      const label = format(monthStart, "MMM", { locale: fr });

      const monthInvoices = invoices.filter(inv => {
        const d = new Date(inv.invoice_date || inv.created_at || inv.created_date);
        return !isNaN(d.getTime()) && d >= monthStart && d < monthEnd;
      });

      const revenue = monthInvoices.filter(i => i.category === "vente").reduce((s, i) => s + (i.amount_ttc || 0), 0);
      const expenses = monthInvoices.filter(i => i.category !== "vente").reduce((s, i) => s + (i.amount_ttc || 0), 0);

      months.push({ month: label.charAt(0).toUpperCase() + label.slice(1), revenue, expenses });
    }
    return months;
  }, [invoices]);

  // Expense categories from real data
  const expenseCategories = useMemo(() => {
    const categories = { achat: 0, "frais_généraux": 0, immobilisation: 0 };
    invoices.filter(i => i.category !== "vente").forEach(inv => {
      const cat = inv.category || "achat";
      if (categories[cat] !== undefined) categories[cat] += (inv.amount_ttc || 0);
      else categories.achat += (inv.amount_ttc || 0);
    });
    const total = Object.values(categories).reduce((s, v) => s + v, 0) || 1;
    return [
      { name: "Achats", value: Math.round((categories.achat / total) * 100), color: "#6366f1" },
      { name: "Frais généraux", value: Math.round((categories["frais_généraux"] / total) * 100), color: "#8b5cf6" },
      { name: "Immobilisations", value: Math.round((categories.immobilisation / total) * 100), color: "#a78bfa" }
    ];
  }, [invoices]);

  const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          Analytics & Insights IA - SYGMA Conseils
        </h1>
        <p className="text-gray-400 mt-1">
          Pilotez votre activité en temps réel avec l&apos;intelligence artificielle
        </p>
      </div>

      {/* AI Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 lg:p-8 shadow-xl shadow-purple-500/20"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Analyse IA activée</h2>
            <p className="text-purple-100 mt-1">
              Insights générés automatiquement à partir de vos {invoices.length} factures et {tasks.length} tâches
            </p>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#14141f] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Chiffre d&apos;affaires</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {totalRevenue.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-gray-500 text-sm">
                    <span>{invoices.filter(i => i.category === "vente").length} facture(s) de vente</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#14141f] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Dépenses</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {totalExpenses.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-gray-500 text-sm">
                    <span>{invoices.filter(i => i.category !== "vente").length} facture(s)</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#14141f] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Résultat net</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {netProfit.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-indigo-400 text-sm">
                    <Target className="w-4 h-4" />
                    <span>Marge: {profitMargin}%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#14141f] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Clients actifs</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {activeClientsCount}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-amber-400 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{newClientsCount > 0 ? `${newClientsCount} nouveau(x)` : `${clients.length} total`}</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Insights IA
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiInsights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-[#14141f] border-gray-800 hover:border-purple-500 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <insight.icon className={`w-5 h-5 ${insight.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-semibold">{insight.title}</h4>
                        <Badge variant="outline" className="text-xs">{insight.impact}</Badge>
                      </div>
                      <p className="text-gray-400 text-sm">{insight.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <Card className="bg-[#14141f] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Évolution du CA et dépenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value) => value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="CA" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Dépenses" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Distribution */}
        <Card className="bg-[#14141f] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Répartition des dépenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={expenseCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
