"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { motion } from "framer-motion";
import {
  Zap,
  Bot,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  AlertCircle,
  Shield,
  FileCheck,
  Receipt,
  FileText,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function Automation() {
  const { data: invoices = [], isLoading: li } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.invoices.list("-created_date"),
  });

  const { data: documents = [], isLoading: ld } = useQuery({
    queryKey: ["documents"],
    queryFn: () => db.documents.list("-created_date"),
  });

  const { data: tasks = [], isLoading: lt } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => db.tasks.list("-created_date"),
  });

  const { data: deadlines = [], isLoading: lde } = useQuery({
    queryKey: ["deadlines"],
    queryFn: () => db.deadlines.list("-created_date"),
  });

  const isLoading = li || ld || lt || lde;

  // Compute real automation stats
  const ocrProcessed = documents.filter(d => d.status === "traité" || d.status === "validé").length;
  const ocrTotal = documents.filter(d => d.category === "facture").length;
  const invoicesCreated = invoices.length;
  const tasksCompleted = tasks.filter(t => t.status === "terminée").length;
  const deadlinesCompleted = deadlines.filter(d => d.status === "terminée").length;

  const totalAutomated = ocrProcessed + invoicesCreated + tasksCompleted + deadlinesCompleted;

  // Build bots from real operations
  const bots = useMemo(() => [
    {
      id: 1,
      name: "OCR & Extraction",
      description: "Extraction automatique des données de factures par OCR",
      status: ocrTotal > 0 ? "active" : "paused",
      tasksCompleted: ocrProcessed,
      total: ocrTotal,
      icon: FileText,
      successRate: ocrTotal > 0 ? Math.round((ocrProcessed / ocrTotal) * 100) : 0
    },
    {
      id: 2,
      name: "Gestion Factures",
      description: "Création et suivi automatique des factures",
      status: invoicesCreated > 0 ? "active" : "paused",
      tasksCompleted: invoicesCreated,
      total: invoicesCreated,
      icon: Receipt,
      successRate: invoicesCreated > 0 ? Math.round((invoices.filter(i => i.status === "payée").length / invoicesCreated) * 100) : 0
    },
    {
      id: 3,
      name: "Suivi Tâches",
      description: "Gestion et suivi automatique des tâches comptables",
      status: tasks.length > 0 ? "active" : "paused",
      tasksCompleted: tasksCompleted,
      total: tasks.length,
      icon: CheckCircle,
      successRate: tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0
    },
    {
      id: 4,
      name: "Échéances fiscales",
      description: "Alertes et suivi des échéances réglementaires",
      status: deadlines.length > 0 ? "active" : "paused",
      tasksCompleted: deadlinesCompleted,
      total: deadlines.length,
      icon: Calendar,
      successRate: deadlines.length > 0 ? Math.round((deadlinesCompleted / deadlines.length) * 100) : 0
    }
  ], [ocrProcessed, ocrTotal, invoicesCreated, invoices, tasksCompleted, tasks, deadlinesCompleted, deadlines]);

  const activeBots = bots.filter(b => b.status === "active").length;

  // Compliance checks from real data
  const complianceChecks = useMemo(() => {
    const invoiceAnomalies = invoices.filter(i => !i.amount_ttc || !i.invoice_number).length;
    const docAnomalies = documents.filter(d => d.status === "rejeté").length;
    const taskAnomalies = tasks.filter(t => {
      if (t.status === "terminée" || !t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length;

    return [
      {
        name: "Vérification Factures",
        description: "Contrôle automatique des montants et numéros de facture",
        checks: invoices.length,
        anomalies: invoiceAnomalies,
        icon: FileCheck,
        color: "text-blue-400"
      },
      {
        name: "Conformité Documents",
        description: "Validation des documents uploadés et statuts",
        checks: documents.length,
        anomalies: docAnomalies,
        icon: Shield,
        color: "text-emerald-400"
      },
      {
        name: "Tâches en retard",
        description: "Détection des tâches ayant dépassé leur échéance",
        checks: tasks.length,
        anomalies: taskAnomalies,
        icon: AlertCircle,
        color: "text-amber-400"
      }
    ];
  }, [invoices, documents, tasks]);

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      error: "bg-rose-500/20 text-rose-400 border-rose-500/30"
    };
    return colors[status] || colors.paused;
  };

  const getStatusLabel = (status) => {
    const labels = { active: "Actif", paused: "En pause", error: "Erreur" };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          Automatisation & RPA - SYGMA Conseils
        </h1>
        <p className="text-gray-400 mt-1">
          Robots intelligents et automatisations avancées pour votre cabinet
        </p>
      </div>

      {/* Stats Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl p-6 lg:p-8 shadow-xl shadow-cyan-500/20"
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-cyan-100 text-sm">Opérations traitées</p>
                <p className="text-2xl font-bold text-white">{totalAutomated}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-cyan-100 text-sm">Modules actifs</p>
                <p className="text-2xl font-bold text-white">{activeBots} / {bots.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-cyan-100 text-sm">Documents & factures</p>
                <p className="text-2xl font-bold text-white">{documents.length + invoices.length}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Bots List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          Modules d&apos;automatisation
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bots.map((bot, index) => (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-[#14141f] border-gray-800 hover:border-cyan-500 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                          <bot.icon className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">{bot.name}</h4>
                          <p className="text-gray-400 text-sm mt-1">{bot.description}</p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(bot.status)} border`}>
                        {getStatusLabel(bot.status)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-xs">Complétées</p>
                        <p className="text-white font-semibold">{bot.tasksCompleted}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Total</p>
                        <p className="text-white font-semibold">{bot.total}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Taux de complétion</span>
                        <span className="text-white font-medium">{bot.successRate}%</span>
                      </div>
                      <Progress value={bot.successRate} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Compliance Checks */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Contrôles de conformité automatisés
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {complianceChecks.map((check, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-[#14141f] border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <check.icon className={`w-5 h-5 ${check.color}`} />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{check.name}</h4>
                        <p className="text-gray-400 text-sm mt-1">{check.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs">Vérifications</p>
                        <p className="text-white font-semibold text-lg">{check.checks}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Anomalies détectées</p>
                        <p className={`font-semibold text-lg ${check.anomalies > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {check.anomalies}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
