"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Bot,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Settings,
  TrendingUp,
  Activity,
  AlertCircle,
  Shield,
  FileCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function Automation() {
  const [bots, setBots] = useState([
    {
      id: 1,
      name: "Robot TVA",
      description: "Depot automatique des declarations TVA",
      status: "active",
      tasksCompleted: 245,
      timesSaved: "52h",
      lastRun: "Il y a 2h",
      schedule: "Tous les mois",
      successRate: 98
    },
    {
      id: 2,
      name: "Robot Paie",
      description: "Preparation automatique des bulletins de paie",
      status: "active",
      tasksCompleted: 1520,
      timesSaved: "380h",
      lastRun: "Il y a 1 jour",
      schedule: "Chaque debut de mois",
      successRate: 99
    },
    {
      id: 3,
      name: "Rapprochement Bancaire",
      description: "Recuperation et rapprochement des releves bancaires",
      status: "paused",
      tasksCompleted: 89,
      timesSaved: "28h",
      lastRun: "Il y a 3 jours",
      schedule: "Tous les jours a 2h",
      successRate: 95
    },
    {
      id: 4,
      name: "Declarations URSSAF",
      description: "Soumission automatique aux organismes sociaux",
      status: "active",
      tasksCompleted: 156,
      timesSaved: "62h",
      lastRun: "Il y a 12h",
      schedule: "Trimestriel",
      successRate: 97
    }
  ]);

  const complianceChecks = [
    {
      name: "Verification TVA",
      description: "Controle automatique des montants et coherence",
      checks: 1240,
      anomalies: 12,
      icon: FileCheck,
      color: "text-blue-400"
    },
    {
      name: "Conformite Paie",
      description: "Validation des cotisations et taux",
      checks: 856,
      anomalies: 5,
      icon: Shield,
      color: "text-emerald-400"
    },
    {
      name: "Audit Documents",
      description: "Detection de doublons et documents manquants",
      checks: 2341,
      anomalies: 18,
      icon: AlertCircle,
      color: "text-amber-400"
    }
  ];

  const getStatusColor = (status) => {
    const colors = {
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      error: "bg-rose-500/20 text-rose-400 border-rose-500/30"
    };
    return colors[status] || colors.paused;
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: "Actif",
      paused: "En pause",
      error: "Erreur"
    };
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
          Robots intelligents et automatisations avancees pour votre cabinet
        </p>
      </div>

      {/* Stats Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl p-6 lg:p-8 shadow-xl shadow-cyan-500/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-cyan-100 text-sm">Temps economise</p>
              <p className="text-2xl font-bold text-white">522h</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-cyan-100 text-sm">Robots actifs</p>
              <p className="text-2xl font-bold text-white">3 / 4</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-cyan-100 text-sm">Taches automatisees</p>
              <p className="text-2xl font-bold text-white">2,010</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bots List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          Robots RPA
        </h3>
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
                        <Bot className="w-5 h-5 text-cyan-400" />
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
                      <p className="text-gray-400 text-xs">Taches completees</p>
                      <p className="text-white font-semibold">{bot.tasksCompleted}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Temps economise</p>
                      <p className="text-white font-semibold">{bot.timesSaved}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Derniere execution</p>
                      <p className="text-white text-sm">{bot.lastRun}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Planification</p>
                      <p className="text-white text-sm">{bot.schedule}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Taux de reussite</span>
                      <span className="text-white font-medium">{bot.successRate}%</span>
                    </div>
                    <Progress value={bot.successRate} className="h-2" />
                  </div>

                  <div className="flex gap-2">
                    {bot.status === "active" ? (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Play className="w-4 h-4 mr-1" />
                        Demarrer
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Compliance Checks */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Controles de conformite automatises
        </h3>
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
                      <p className="text-gray-400 text-xs">Verifications</p>
                      <p className="text-white font-semibold text-lg">{check.checks}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Anomalies detectees</p>
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
      </div>
    </div>
  );
}
