"use client";

import React, { useState } from "react";
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

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
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
      urgente: "bg-rose-100 text-rose-700 border-rose-200",
      haute: "bg-amber-100 text-amber-700 border-amber-200",
      moyenne: "bg-blue-100 text-blue-700 border-blue-200",
      basse: "bg-gray-100 text-gray-600 border-gray-200",
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
    updateMutation.mutate({ id: task.id, data: { ...task, status: newStatus } });
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
           new Date(a.due_date) - new Date(b.due_date);
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
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sortedTasks.map((task, index) => {
              const isOverdue = isPast(new Date(task.due_date)) && task.status !== "terminée";
              const isDueToday = isToday(new Date(task.due_date));

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl border p-5 hover:shadow-lg transition-all group ${
                    task.status === "terminée" ? "opacity-60" : ""
                  } ${isOverdue ? "border-rose-200" : "border-gray-100"}`}
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
                          <h3 className={`font-semibold text-gray-900 ${
                            task.status === "terminée" ? "line-through" : ""
                          }`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
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
                        <span className="text-sm text-gray-500">
                          {getClientName(task.client_id)}
                        </span>
                        <span className={`flex items-center gap-1 text-sm ${
                          isOverdue ? "text-rose-600 font-medium" :
                          isDueToday ? "text-amber-600" : "text-gray-500"
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          {isOverdue ? "En retard \u2022 " : ""}
                          {format(new Date(task.due_date), "d MMM yyyy", { locale: fr })}
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
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune tâche</h3>
          <p className="text-gray-500 mt-1">Créez votre première tâche</p>
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
