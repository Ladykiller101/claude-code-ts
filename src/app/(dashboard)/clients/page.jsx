"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MoreVertical,
  Pencil,
  Trash2,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import ClientForm from "@/components/clients/ClientForm";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [typeFilter, setTypeFilter] = useState("tous");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => db.clients.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.clients.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.clients.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditingClient(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.clients.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const handleSave = (data) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
      deleteMutation.mutate(id);
    }
  };

  const clientTypes = ["tous", ...Array.from(new Set(clients.map((c) => c.type).filter(Boolean)))];

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "tous" || c.status === statusFilter;
    const matchesType = typeFilter === "tous" || c.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status) => {
    const styles = {
      actif: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
      prospect: "bg-blue-900/40 text-blue-400 border-blue-800",
      inactif: "bg-gray-800/40 text-gray-400 border-gray-700",
    };
    return styles[status] || styles.prospect;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Clients - SYGMA Conseils</h1>
          <p className="text-gray-400 mt-1">Gérez votre portefeuille clients</p>
        </div>
        <Button
          onClick={() => {
            setEditingClient(null);
            setFormOpen(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau client
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un client..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["tous", "actif", "prospect", "inactif"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                statusFilter === s
                  ? s === "actif"
                    ? "bg-emerald-900/60 text-emerald-300 border-emerald-700"
                    : s === "prospect"
                    ? "bg-blue-900/60 text-blue-300 border-blue-700"
                    : s === "inactif"
                    ? "bg-gray-800 text-gray-300 border-gray-600"
                    : "bg-purple-900/60 text-purple-300 border-purple-700"
                  : "bg-[#13131a] text-gray-500 border-[#2a2a3e] hover:text-gray-300 hover:border-gray-600"
              }`}
            >
              {s === "tous" ? "Tous" : s}
              {s !== "tous" && (
                <span className="ml-1.5 opacity-70">
                  {clients.filter((c) => c.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Type filter — only shown if multiple types exist */}
        {clientTypes.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {clientTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  typeFilter === t
                    ? "bg-indigo-900/60 text-indigo-300 border-indigo-700"
                    : "bg-[#13131a] text-gray-500 border-[#2a2a3e] hover:text-gray-300 hover:border-gray-600"
                }`}
              >
                {t === "tous" ? "Tous types" : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active filter summary */}
      {(statusFilter !== "tous" || typeFilter !== "tous" || search) && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} trouvé{filteredClients.length !== 1 ? "s" : ""}</span>
          {(statusFilter !== "tous" || typeFilter !== "tous") && (
            <button
              onClick={() => { setStatusFilter("tous"); setTypeFilter("tous"); }}
              className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Clients Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredClients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#13131a] rounded-2xl border border-[#1e1e2e] p-6 hover:border-purple-500/30 transition-all group cursor-pointer"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#4f46e5] flex items-center justify-center text-white font-semibold text-lg">
                      {client.company_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white hover:text-purple-400 transition-colors">{client.company_name}</h3>
                      <p className="text-sm text-gray-400">{client.contact_name || "—"}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(client); }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-rose-600"
                        onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4 space-y-2">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.notes && (
                    <p className="text-xs text-gray-500 truncate">{client.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Badge className={`${getStatusBadge(client.status)} border`}>
                    {client.status}
                  </Badge>
                  {client.type && (
                    <span className="border border-[#2a2a3e] text-[#6a6a8a] text-xs px-2 py-0.5 rounded">
                      {client.type}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!isLoading && filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun client</h3>
          <p className="text-gray-500 mt-1">Commencez par ajouter votre premier client</p>
        </div>
      )}

      <ClientForm
        client={editingClient}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
