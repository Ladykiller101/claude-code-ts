"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import DeadlineForm from "@/components/deadlines/DeadlineForm";

export default function Deadlines() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const queryClient = useQueryClient();

  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ["deadlines"],
    queryFn: () => db.deadlines.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.clients.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.deadlines.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.deadlines.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      setEditingDeadline(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.deadlines.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
  });

  const getClientName = (clientId) => {
    if (!clientId) return "Tous les clients";
    const client = clients.find((c) => c.id === clientId);
    return client?.company_name || "—";
  };

  const getTypeColor = (type) => {
    const colors = {
      TVA: "bg-indigo-500",
      IS: "bg-purple-500",
      CFE: "bg-blue-500",
      CVAE: "bg-cyan-500",
      liasse_fiscale: "bg-emerald-500",
      DSN: "bg-amber-500",
      bilan: "bg-rose-500",
      autre: "bg-gray-500",
    };
    return colors[type] || colors.autre;
  };

  const getDaysInfo = (date, status) => {
    if (status === "terminée") {
      return { text: "Terminé", color: "text-emerald-600", bg: "bg-emerald-50" };
    }

    const days = differenceInDays(new Date(date), new Date());

    if (days < 0) {
      return { text: `${Math.abs(days)}j en retard`, color: "text-rose-600", bg: "bg-rose-50", urgent: true };
    }
    if (days === 0) {
      return { text: "Aujourd'hui", color: "text-rose-600", bg: "bg-rose-50", urgent: true };
    }
    if (days === 1) {
      return { text: "Demain", color: "text-amber-600", bg: "bg-amber-50", urgent: true };
    }
    if (days <= 7) {
      return { text: `${days} jours`, color: "text-amber-600", bg: "bg-amber-50" };
    }
    if (days <= 30) {
      return { text: `${days} jours`, color: "text-blue-600", bg: "bg-blue-50" };
    }
    return { text: `${days} jours`, color: "text-gray-600", bg: "bg-gray-50" };
  };

  const filteredDeadlines = deadlines.filter((d) => {
    const matchesSearch =
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      getClientName(d.client_id).toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || d.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Sort by due date
  const sortedDeadlines = [...filteredDeadlines].sort((a, b) => {
    if (a.status === "terminée" && b.status !== "terminée") return 1;
    if (a.status !== "terminée" && b.status === "terminée") return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Échéances - SYGMA Conseils</h1>
          <p className="text-gray-400 mt-1">Gérez vos dates importantes</p>
        </div>
        <Button
          onClick={() => {
            setEditingDeadline(null);
            setFormOpen(true);
          }}
          className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle échéance
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="TVA">TVA</SelectItem>
            <SelectItem value="IS">IS</SelectItem>
            <SelectItem value="CFE">CFE</SelectItem>
            <SelectItem value="CVAE">CVAE</SelectItem>
            <SelectItem value="liasse_fiscale">Liasse fiscale</SelectItem>
            <SelectItem value="DSN">DSN</SelectItem>
            <SelectItem value="bilan">Bilan</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deadlines Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {sortedDeadlines.map((deadline, index) => {
              const daysInfo = getDaysInfo(deadline.due_date, deadline.status);

              return (
                <motion.div
                  key={deadline.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl border p-5 hover:shadow-lg transition-all group ${
                    deadline.status === "terminée" ? "opacity-60 border-gray-100" :
                    daysInfo.urgent ? "border-rose-200" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl ${getTypeColor(deadline.type)} flex items-center justify-center`}>
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingDeadline(deadline);
                          setFormOpen(true);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            updateMutation.mutate({
                              id: deadline.id,
                              data: { ...deadline, status: "terminée" }
                            });
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer terminée
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-600"
                          onClick={() => {
                            if (confirm("Supprimer cette échéance ?")) {
                              deleteMutation.mutate(deadline.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4">
                    <h3 className={`font-semibold text-gray-900 ${
                      deadline.status === "terminée" ? "line-through" : ""
                    }`}>
                      {deadline.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {getClientName(deadline.client_id)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <Badge variant="outline">{deadline.type}</Badge>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${daysInfo.bg} ${daysInfo.color}`}>
                      {daysInfo.text}
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mt-3">
                    {format(new Date(deadline.due_date), "EEEE d MMMM yyyy", { locale: fr })}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {!isLoading && sortedDeadlines.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune échéance</h3>
          <p className="text-gray-500 mt-1">Ajoutez vos dates importantes</p>
        </div>
      )}

      <DeadlineForm
        deadline={editingDeadline}
        clients={clients}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingDeadline(null);
        }}
        onSave={(data) => {
          if (editingDeadline) {
            updateMutation.mutate({ id: editingDeadline.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}
