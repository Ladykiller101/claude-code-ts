"use client";

import React from "react";
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
  Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Calculate metrics
  const totalRevenue = invoices
    .filter(inv => inv.category === "vente")
    .reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);

  const totalExpenses = invoices
    .filter(inv => inv.category !== "vente")
    .reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0);

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // AI Insights
  const aiInsights = [
    {
      type: "warning",
      title: "Tr\u00e9sorerie en baisse",
      description: "Vos d\u00e9penses ont augment\u00e9 de 15% ce mois-ci par rapport au mois dernier",
      impact: "Moyenne",
      icon: AlertCircle,
      color: "text-amber-400"
    },
    {
      type: "success",
      title: "Performance positive",
      description: "Votre chiffre d'affaires est en hausse de 8% sur le trimestre",
      impact: "\u00c9lev\u00e9",
      icon: TrendingUp,
      color: "text-emerald-400"
    },
    {
      type: "info",
      title: "Opportunit\u00e9 d'optimisation",
      description: "3 factures fournisseurs offrent des remises pour paiement anticip\u00e9",
      impact: "Faible",
      icon: Sparkles,
      color: "text-indigo-400"
    }
  ];

  // Revenue by month (last 6 months)
  const monthlyData = [
    { month: "Juil", revenue: 12500, expenses: 8200 },
    { month: "Ao\u00fbt", revenue: 15200, expenses: 9100 },
    { month: "Sept", revenue: 14800, expenses: 8900 },
    { month: "Oct", revenue: 16500, expenses: 9500 },
    { month: "Nov", revenue: 18200, expenses: 10200 },
    { month: "D\u00e9c", revenue: 19800, expenses: 11100 },
  ];

  // Expense categories
  const expenseCategories = [
    { name: "Achats", value: 35, color: "#6366f1" },
    { name: "Frais g\u00e9n\u00e9raux", value: 45, color: "#8b5cf6" },
    { name: "Immobilisations", value: 20, color: "#a78bfa" }
  ];

  const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          Analytics & Insights IA - SYGMA Conseils
        </h1>
        <p className="text-gray-400 mt-1">
          Pilotez votre activit\u00e9 en temps r\u00e9el avec l&apos;intelligence artificielle
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
            <h2 className="text-xl font-semibold text-white">Analyse IA activ\u00e9e</h2>
            <p className="text-purple-100 mt-1">
              Notre IA surveille en continu vos donn\u00e9es pour vous alerter des opportunit\u00e9s et risques
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
                  <div className="flex items-center gap-1 mt-2 text-emerald-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+8.2%</span>
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
                  <p className="text-gray-400 text-sm">D\u00e9penses</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {totalExpenses.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-rose-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+15.3%</span>
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
                  <p className="text-gray-400 text-sm">R\u00e9sultat net</p>
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
                    {clients.filter(c => c.status === "actif").length}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-amber-400 text-sm">
                    <Zap className="w-4 h-4" />
                    <span>4 nouveaux</span>
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
            <CardTitle className="text-white">\u00c9volution du CA et d\u00e9penses</CardTitle>
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
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="CA" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="D\u00e9penses" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Distribution */}
        <Card className="bg-[#14141f] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">R\u00e9partition des d\u00e9penses</CardTitle>
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
