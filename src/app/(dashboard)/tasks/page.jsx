"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  CheckSquare,
  Clock,
  User,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle,
  Circle,
  AlertCircle
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
import { format, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import TaskForm from "@/components/tasks/TaskForm";

const safeDate = (d) => { if (!d) return null; const p = new Date(d); return isNaN(p.getTime()) ? null : p; };
const safeFmt = (d, fmt) => { const p = safeDate(d); return p ? format(p, fmt, { locale: fr }) : "—"; };

export default function Tasks() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();

  // Hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: tasks = [], isLoading, isError, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => db.tasks.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.clients.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.tasks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.tasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.company_name || "—";
  };

  const getPriorityStyle = (priority) => {
    const styles = {
      urgente: "bg-rose-900/40 text-rose-400 border-rose-800",
      haute: "bg-amber-900/40 text-amber-400 border-amber-800",
      moyenne: "bg-blue-900/40 text-blue-400 border-blue-800",
      basse: "bg-gray-800/40 text-gray-400 border-gray-700",
    };
    return styles[priority] || styles.moyenne;
  };

  const getStatusIcon = (status) => {
    const icons = {
      "à_faire": <Circle className="w-5 h-5 text-gray-400" />,
      en_cours: <Clock className="w-5 h-5 text-blue-500" />,
      en_attente_client: <AlertCircle className="w-5 h-5 text-amber-500" />,
      "terminée": <CheckCircle className="w-5 h-5 text-emerald-500" />,
    };
    return icons[status] || icons["à_faire"];
  };

  const handleStatusChange = (task, newStatus) => {
    updateMutation.mutate({ id: task.id, data: { status: newStatus } });
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title?.toLowerCase().includes(search.toLowerCase()) ||
      getClientName(task.client_id).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesClient = clientFilter === "all" || task.client_id === clientFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesClient;
  });

  // Sort by priority and due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { urgente: 0, haute: 1, moyenne: 2, basse: 3 };

    if (a.status === "terminée" && b.status !== "terminée") return 1;
    if (a.status !== "terminée" && b.status === "terminée") return -1;

    return priorityOrder[a.priority] - priorityOrder[b.priority] ||
           (safeDate(a.due_date)?.getTime() ?? 0) - (safeDate(b.due_date)?.getTime() ?? 0);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Tâches - SYGMA Conseils</h1>
          <p className="text-gray-400 mt-1">Suivez et gérez vos tâches</p>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            setFormOpen(true);
          }}
          className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle tâche
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="à_faire">À faire</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="en_attente_client">En attente client</SelectItem>
            <SelectItem value="terminée">Terminée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="moyenne">Moyenne</SelectItem>
            <SelectItem value="basse">Basse</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      {isError ? (
        <div className="text-center py-12 bg-[#13131a] rounded-2xl border border-red-900/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-white">Erreur de chargement</h3>
          <p className="text-gray-400 mt-1 max-w-md mx-auto">
            {error?.message || "Les tâches n'ont pas pu être chargées. Veuillez rafraîchir la page."}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
          >
            Réessayer
          </Button>
        </div>
      ) : !mounted || isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sortedTasks.map((task, index) => {
              const parsedDue = safeDate(task.due_date);
              const isOverdue = parsedDue && isPast(parsedDue) && task.status !== "terminée";
              const isDueToday = parsedDue && isToday(parsedDue);

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-[#13131a] rounded-2xl border p-5 hover:border-purple-500/30 transition-all group ${
                    task.status === "terminée" ? "opacity-60" : ""
                  } ${isOverdue ? "border-rose-800/50" : "border-[#1e1e2e]"}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Toggle */}
                    <button
                      onClick={() => handleStatusChange(
                        task,
                        task.status === "terminée" ? "à_faire" : "terminée"
                      )}
                      className="mt-1 hover:scale-110 transition-transform"
                    >
                      {getStatusIcon(task.status)}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-semibold text-white ${
                            task.status === "terminée" ? "line-through" : ""
                          }`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
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
                              setEditingTask(task);
                              setFormOpen(true);
                            }}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-rose-600"
                              onClick={() => {
                                if (confirm("Supprimer cette tâche ?")) {
                                  deleteMutation.mutate(task.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <Badge className={`${getPriorityStyle(task.priority)} border`}>
                          {task.priority}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          {getClientName(task.client_id)}
                        </span>
                        <span className={`flex items-center gap-1 text-sm ${
                          isOverdue ? "text-rose-400 font-medium" :
                          isDueToday ? "text-amber-400" : "text-gray-400"
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          {isOverdue ? "En retard \u2022 " : ""}
                          {safeFmt(task.due_date, "d MMM yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {!isLoading && sortedTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-white">Aucune tâche</h3>
          <p className="text-gray-400 mt-1">Créez votre première tâche</p>
        </div>
      )}

      <TaskForm
        task={editingTask}
        clients={clients}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        onSave={(data) => {
          if (editingTask) {
            updateMutation.mutate({ id: editingTask.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}
