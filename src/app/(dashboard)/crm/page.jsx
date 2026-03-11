"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function CRM() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.clients.list("-created_date"),
  });

  const prospects = clients.filter(c => c.status === "prospect");
  const activeClients = clients.filter(c => c.status === "actif");
  const inactiveClients = clients.filter(c => c.status === "inactif");

  // Mock pipeline data
  const pipeline = [
    { stage: "Contact initial", count: 12, value: 45000, color: "bg-blue-500" },
    { stage: "Proposition", count: 8, value: 32000, color: "bg-indigo-500" },
    { stage: "Négociation", count: 5, value: 25000, color: "bg-purple-500" },
    { stage: "Signature", count: 3, value: 18000, color: "bg-pink-500" }
  ];

  const recentActivities = [
    {
      type: "meeting",
      client: "ABC Industries",
      description: "Réunion de découverte - Besoins comptables",
      date: "Il y a 2h",
      icon: Calendar,
      color: "text-blue-400"
    },
    {
      type: "call",
      client: "Tech Solutions",
      description: "Appel de suivi - Proposition envoyée",
      date: "Il y a 4h",
      icon: Phone,
      color: "text-emerald-400"
    },
    {
      type: "email",
      client: "Consulting Pro",
      description: "Email - Documents reçus",
      date: "Il y a 1 jour",
      icon: Mail,
      color: "text-purple-400"
    },
    {
      type: "signature",
      client: "Services Plus",
      description: "Contrat signé - Onboarding en cours",
      date: "Il y a 2 jours",
      icon: CheckCircle,
      color: "text-emerald-400"
    }
  ];

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
                <p className="text-emerald-400 text-sm mt-1">+12 ce mois</p>
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
                <p className="text-emerald-400 text-sm mt-1">+4 ce mois</p>
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
                <p className="text-2xl font-bold text-white mt-1">120K€</p>
                <p className="text-indigo-400 text-sm mt-1">28 opportunités</p>
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
                <p className="text-2xl font-bold text-white mt-1">32%</p>
                <p className="text-emerald-400 text-sm mt-1">+5% vs mois dernier</p>
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
                Pipeline commercial
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
                          {stage.value.toLocaleString("fr-FR")}€
                        </p>
                        <p className="text-gray-400 text-sm">{stage.count} prospects</p>
                      </div>
                    </div>
                    <Progress value={(stage.count / 12) * 100} className="h-2" />
                  </div>
                </motion.div>
              ))}
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
              {recentActivities.map((activity, index) => (
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
                    <p className="text-gray-400 text-xs mt-1">{activity.description}</p>
                    <p className="text-gray-500 text-xs mt-1">{activity.date}</p>
                  </div>
                </motion.div>
              ))}
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
            {prospects.map((client) => (
              <Card key={client.id} className="bg-[#14141f] border-gray-800 hover:border-indigo-500 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold">{client.company_name}</h4>
                    <Badge className="bg-blue-100 text-blue-700">Prospect</Badge>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{client.contact_name}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>
                  <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
                    Contacter
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeClients.map((client) => (
              <Card key={client.id} className="bg-[#14141f] border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold">{client.company_name}</h4>
                    <Badge className="bg-emerald-100 text-emerald-700">Actif</Badge>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{client.contact_name}</p>
                  <Badge variant="outline">{client.type}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inactive">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveClients.map((client) => (
              <Card key={client.id} className="bg-[#14141f] border-gray-800 opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-white font-semibold">{client.company_name}</h4>
                    <Badge className="bg-gray-100 text-gray-700">Inactif</Badge>
                  </div>
                  <p className="text-gray-400 text-sm">{client.contact_name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
