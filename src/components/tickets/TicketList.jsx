"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
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
  Search,
  Ticket,
  MessageSquare,
  Inbox,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABELS = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  attente_client: "Attente client",
  résolu: "Résolu",
  fermé: "Fermé",
};

const STATUS_COLORS = {
  nouveau: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  en_cours: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  attente_client: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  résolu: "bg-green-500/20 text-green-400 border-green-500/30",
  fermé: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const PRIORITY_COLORS = {
  urgente: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  haute: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  normale: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  basse: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function TicketList({ clientId, onSelectTicket }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", clientId],
    queryFn: () => db.tickets.list("-created_at"),
  });

  const filteredTickets = useMemo(() => {
    let result = tickets;

    if (clientId) {
      result = result.filter((t) => t.client_id === clientId);
    }

    if (statusFilter !== "tous") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.title?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tickets, clientId, statusFilter, search]);

  const openCount = useMemo(() => {
    const openStatuses = ["nouveau", "en_cours", "attente_client"];
    let base = tickets;
    if (clientId) base = base.filter((t) => t.client_id === clientId);
    return base.filter((t) => openStatuses.includes(t.status)).length;
  }, [tickets, clientId]);

  if (isLoading) {
    return (
      <div className="bg-[#14141f] rounded-xl border border-gray-800 p-8">
        <div className="flex items-center justify-center text-gray-400">
          Chargement des tickets...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#14141f] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Ticket className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white text-lg">Tickets</h3>
          </div>
          {openCount > 0 && (
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 border">
              {openCount} ouvert{openCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-10 bg-[#1a1a2e] border-gray-700"
              placeholder="Rechercher par titre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-[#1a1a2e] border-gray-700">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="nouveau">Nouveau</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="attente_client">Attente client</SelectItem>
              <SelectItem value="résolu">Résolu</SelectItem>
              <SelectItem value="fermé">Fermé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ticket list */}
      <div className="divide-y divide-gray-800/50">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucun ticket pour le moment</p>
          </div>
        ) : (
          filteredTickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectTicket(ticket)}
              className="p-4 hover:bg-[#1a1a2e] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {ticket.title}
                  </p>
                  {ticket.last_message && (
                    <p className="text-sm text-gray-500 mt-1 truncate flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      {ticket.last_message}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {ticket.category && (
                      <Badge className="bg-[#1a1a2e] text-gray-300 border border-gray-700 text-xs">
                        {ticket.category}
                      </Badge>
                    )}
                    <Badge className={`${PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normale} border text-xs`}>
                      {ticket.priority || "normale"}
                    </Badge>
                    <Badge className={`${STATUS_COLORS[ticket.status] || STATUS_COLORS.nouveau} border text-xs`}>
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </Badge>
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap mt-1">
                  {(() => { try { return ticket.created_at ? format(new Date(ticket.created_at), "d MMM yyyy", { locale: fr }) : ""; } catch { return ""; } })()}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
