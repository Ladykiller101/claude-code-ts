"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  FileText,
  CheckSquare,
  AlertCircle,
  TrendingUp,
  Clock,
  Plus,
  Receipt
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import TasksList from "@/components/dashboard/TasksList";
import DeadlinesList from "@/components/dashboard/DeadlinesList";
import InvoicesChart from "@/components/dashboard/InvoicesChart";
import TasksStatusChart from "@/components/dashboard/TasksStatusChart";
import PriorityDistribution from "@/components/dashboard/PriorityDistribution";
import DeadlinesTimeline from "@/components/dashboard/DeadlinesTimeline";
import CategoryBreakdown from "@/components/dashboard/CategoryBreakdown";
import ClientsOverview from "@/components/dashboard/ClientsOverview";
import DocumentsStatus from "@/components/dashboard/DocumentsStatus";
import ActivityMiniCharts from "@/components/dashboard/ActivityMiniCharts";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchDashboardData() {
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) throw new Error("Failed to fetch dashboard data");
  return res.json();
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: fetchDashboardData,
  });

  const clients = data?.clients ?? [];
  const documents = data?.documents ?? [];
  const tasks = data?.tasks ?? [];
  const deadlines = data?.deadlines ?? [];
  const invoices = data?.invoices ?? [];

  // Calculs pour les stats
  const activeClients = clients.filter(c => c.status === "actif").length;
  const pendingDocuments = documents.filter(d => d.status === "en_attente").length;
  const pendingTasks = tasks.filter(t => t.status !== "terminée").length;
  const urgentTasks = tasks.filter(t => t.priority === "urgente" && t.status !== "terminée");

  // Tâches triées par priorité et date
  const sortedTasks = [...tasks]
    .filter(t => t.status !== "terminée")
    .sort((a, b) => {
      const priorityOrder = { urgente: 0, haute: 1, moyenne: 2, basse: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] ||
             new Date(a.due_date) - new Date(b.due_date);
    });

  // Échéances triées par date
  const sortedDeadlines = [...deadlines]
    .filter(d => d.status !== "terminée")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Tableau de bord - SYGMA Conseils
          </h1>
        </div>
        <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Erreur de chargement</h2>
          <p className="text-gray-400 mb-4 text-sm">Impossible de charger les données du tableau de bord.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          Tableau de bord - SYGMA Conseils
        </h1>
        <p className="text-gray-400 mt-1">
          Bienvenue ! Voici un aperçu de votre activité.
        </p>
      </motion.div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatsCard
            title="Clients actifs"
            value={activeClients}
            subtitle={`${clients.length} clients au total`}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Documents en attente"
            value={pendingDocuments}
            subtitle="À traiter"
            icon={FileText}
            color="indigo"
          />
          <StatsCard
            title="Tâches en cours"
            value={pendingTasks}
            subtitle={`${urgentTasks.length} urgente(s)`}
            icon={CheckSquare}
            color="emerald"
          />
          <StatsCard
            title="Échéances"
            value={sortedDeadlines.length}
            subtitle="À venir"
            icon={Clock}
            color="amber"
          />
        </div>
      )}

      {/* Activity Mini Charts */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <ActivityMiniCharts documents={documents} tasks={tasks} invoices={invoices} />
      )}

      {/* Charts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InvoicesChart invoices={invoices} />
            <TasksStatusChart tasks={tasks} />
          </div>

          {/* Secondary Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PriorityDistribution tasks={tasks} />
            <CategoryBreakdown invoices={invoices} />
            <ClientsOverview clients={clients} />
          </div>

          {/* Lists and Timeline Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TasksList tasks={sortedTasks} clients={clients} />
            <DeadlinesList deadlines={sortedDeadlines} clients={clients} />
            <DocumentsStatus documents={documents} />
          </div>

          {/* Full Width Timeline */}
          <DeadlinesTimeline deadlines={sortedDeadlines} />
        </>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OCR & Automation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 lg:p-8 shadow-xl shadow-indigo-500/20"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white">
                OCR & Extraction automatique
              </h3>
              <p className="text-indigo-100 mt-1 text-sm">
                Uploadez vos factures et laissez l&apos;IA extraire les données automatiquement
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/documents"
              className="px-5 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Uploader document
            </a>
            <a
              href="/invoices"
              className="px-5 py-2.5 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors inline-flex items-center gap-2 backdrop-blur-sm"
            >
              <Receipt className="w-4 h-4" />
              Voir factures
            </a>
          </div>
        </motion.div>

        {/* Task & Deadline Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 lg:p-8 shadow-xl shadow-emerald-500/20"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white">
                Suivi tâches & échéances
              </h3>
              <p className="text-emerald-100 mt-1 text-sm">
                Gérez vos tâches récurrentes et ne manquez plus aucune échéance
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/tasks"
              className="px-5 py-2.5 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-emerald-50 transition-colors inline-flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              Gérer tâches
            </a>
            <a
              href="/deadlines"
              className="px-5 py-2.5 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors inline-flex items-center gap-2 backdrop-blur-sm"
            >
              <Clock className="w-4 h-4" />
              Voir échéances
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
