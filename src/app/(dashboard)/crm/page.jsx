"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  Target,
  Briefcase,
  FileText,
  Receipt
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format, subMonths, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

const safeFmt = (d, fmt) => { if (!d) return "—"; try { const p = new Date(d); return isNaN(p.getTime()) ? "—" : format(p, fmt, { locale: fr }); } catch { return "—"; } };

export default function CRM() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.clients.list("-created_date"),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => db.invoices.list("-created_date"),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => db.tasks.list("-created_date"),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => db.documents.list("-created_date"),
  });

  const prospects = clients.filter(c => c.status === "prospect");
  const activeClients = clients.filter(c => c.status === "actif");
  const inactiveClients = clients.filter(c => c.status === "inactif");

  // Compute real stats
  const oneMonthAgo = subMonths(new Date(), 1);

  const newProspectsThisMonth = useMemo(() =>
    prospects.filter(c => {
      const d = new Date(c.created_at || c.created_date);
      return !isNaN(d.getTime()) && isAfter(d, oneMonthAgo);
    }).length
  , [prospects, oneMonthAgo]);

  const newClientsThisMonth = useMemo(() =>
    activeClients.filter(c => {
      const d = new Date(c.created_at || c.created_date);
      return !isNaN(d.getTime()) && isAfter(d, oneMonthAgo);
    }).length
  , [activeClients, oneMonthAgo]);

  // Pipeline: compute from real invoices
  const pipelineTotal = useMemo(() =>
    invoices.filter(inv => inv.status === "à_traiter").reduce((sum, inv) => sum + (inv.amount_ttc || 0), 0)
  , [invoices]);

  const totalOpportunities = useMemo(() =>
    invoices.filter(inv => inv.status === "à_traiter").length
  , [invoices]);

  const conversionRate = useMemo(() => {
    if (clients.length === 0) return 0;
    return Math.round((activeClients.length / clients.length) * 100);
  }, [clients, activeClients]);

  // Real pipeline from invoice statuses
  const pipeline = useMemo(() => {
    const pending = invoices.filter(i => i.status === "à_traiter");
    const accounted = invoices.filter(i => i.status === "comptabilisée");
    const paid = invoices.filter(i => i.status === "payée");
    return [
      { stage: "À traiter", count: pending.length, value: pending.reduce((s, i) => s + (i.amount_ttc || 0), 0), color: "bg-amber-500" },
      { stage: "Comptabilisées", count: accounted.length, value: accounted.reduce((s, i) => s + (i.amount_ttc || 0), 0), color: "bg-blue-500" },
      { stage: "Payées", count: paid.length, value: paid.reduce((s, i) => s + (i.amount_ttc || 0), 0), color: "bg-emerald-500" },
    ];
  }, [invoices]);

  const maxPipelineCount = Math.max(...pipeline.map(s => s.count), 1);

  // Recent activities from real data (last tasks, documents, invoices)
  const recentActivities = useMemo(() => {
    const activities = [];

    // Recent tasks
    tasks.slice(0, 3).forEach(t => {
      const clientName = clients.find(c => c.id === t.client_id)?.company_name || "—";
      activities.push({
        type: "task",
        client: clientName,
        description: t.title || "Tâche",
        date: safeFmt(t.created_at || t.created_date, "'le' d MMM"),
        icon: CheckCircle,
        color: "text-emerald-400"
      });
    });

    // Recent documents
    documents.slice(0, 2).forEach(d => {
      const clientName = clients.find(c => c.id === d.client_id)?.company_name || "—";
      activities.push({
        type: "document",
        client: clientName,
        description: d.name || "Document uploadé",
        date: safeFmt(d.created_at || d.created_date, "'le' d MMM"),
        icon: FileText,
        color: "text-blue-400"
      });
    });

    // Recent invoices
    invoices.slice(0, 2).forEach(inv => {
      const clientName = clients.find(c => c.id === inv.client_id)?.company_name || "—";
      activities.push({
        type: "invoice",
        client: clientName,
        description: `Facture ${inv.invoice_number || ""} — ${inv.vendor_name || ""}`.trim(),
        date: safeFmt(inv.created_at || inv.created_date, "'le' d MMM"),
        icon: Receipt,
        color: "text-purple-400"
      });
    });

    return activities.slice(0, 6);
  }, [tasks, documents, invoices, clients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          CRM & Prospection - SYGMA Conseils
        </h1>
        <p className="text-gray-400 mt-1">
          Gestion de la relation client et suivi commercial
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#14141f] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Prospects actifs</p>
                <p className="text-2xl font-bold text-white mt-1">{prospects.length}</p>
                {newProspectsThisMonth > 0 && (
                  <p className="text-emerald-400 text-sm mt-1">+{newProspectsThisMonth} ce mois</p>
                )}
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#14141f] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Clients actifs</p>
                <p className="text-2xl font-bold text-white mt-1">{activeClients.length}</p>
                {newClientsThisMonth > 0 && (
                  <p className="text-emerald-400 text-sm mt-1">+{newClientsThisMonth} ce mois</p>
                )}
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#14141f] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pipeline</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {pipelineTotal.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </p>
                <p className="text-indigo-400 text-sm mt-1">{totalOpportunities} facture(s) en attente</p>
              </div>
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#14141f] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Taux de conversion</p>
                <p className="text-2xl font-bold text-white mt-1">{conversionRate}%</p>
                <p className="text-gray-500 text-sm mt-1">{activeClients.length}/{clients.length} clients</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline */}
        <div className="lg:col-span-2">
          <Card className="bg-[#14141f] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                Pipeline factures
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pipeline.map((stage, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                        <span className="text-white font-medium">{stage.stage}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {stage.value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-gray-400 text-sm">{stage.count} facture(s)</p>
                      </div>
                    </div>
                    <Progress value={(stage.count / maxPipelineCount) * 100} className="h-2" />
                  </div>
                </motion.div>
              ))}
              {pipeline.every(s => s.count === 0) && (
                <p className="text-gray-500 text-center py-4">Aucune facture pour le moment</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div>
          <Card className="bg-[#14141f] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Activités récentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune activité récente</p>
              ) : (
                recentActivities.map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-[#1a1a2e] rounded-lg"
                  >
                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <activity.icon className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{activity.client}</p>
                      <p className="text-gray-400 text-xs mt-1 truncate">{activity.description}</p>
                      <p className="text-gray-500 text-xs mt-1">{activity.date}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Clients Tabs */}
      <Tabs defaultValue="prospects" className="space-y-4">
        <TabsList className="bg-[#14141f] border border-gray-800">
          <TabsTrigger value="prospects" className="data-[state=active]:bg-indigo-600">
            Prospects ({prospects.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-indigo-600">
            Clients actifs ({activeClients.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="data-[state=active]:bg-indigo-600">
            Inactifs ({inactiveClients.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prospects">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prospects.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center py-8">Aucun prospect</p>
            ) : prospects.map((client) => (
              <Card key={client.id} className="bg-[#14141f] border-gray-800 hover:border-indigo-500 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold">{client.company_name || "—"}</h4>
                    <Badge className="bg-blue-100 text-blue-700">Prospect</Badge>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{client.contact_name || "—"}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{client.email || "—"}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-3">
                    Ajouté {safeFmt(client.created_at || client.created_date, "d MMM yyyy")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeClients.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center py-8">Aucun client actif</p>
            ) : activeClients.map((client) => (
              <Card key={client.id} className="bg-[#14141f] border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold">{client.company_name || "—"}</h4>
                    <Badge className="bg-emerald-100 text-emerald-700">Actif</Badge>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{client.contact_name || "—"}</p>
                  <Badge variant="outline">{client.type || "—"}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inactive">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveClients.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center py-8">Aucun client inactif</p>
            ) : inactiveClients.map((client) => (
              <Card key={client.id} className="bg-[#14141f] border-gray-800 opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold">{client.company_name || "—"}</h4>
                    <Badge className="bg-gray-100 text-gray-700">Inactif</Badge>
                  </div>
                  <p className="text-gray-400 text-sm">{client.contact_name || "—"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
