"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Heart, Palmtree, Clock, DoorOpen, CalendarDays, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const EVENT_CONFIG = {
  arret_maladie: {
    label: "Arret maladie",
    icon: Heart,
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  conge_paye: {
    label: "Conge paye",
    icon: Palmtree,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  absence: {
    label: "Absence",
    icon: Clock,
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  depart: {
    label: "Depart",
    icon: DoorOpen,
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
};

const STATUS_CONFIG = {
  en_attente: {
    label: "En attente",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  approuve: {
    label: "Approuve",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  refuse: {
    label: "Refuse",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  traite: {
    label: "Traite",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd MMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
};

export default function HREventList({ events }) {
  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(b.start_date) - new Date(a.start_date)
    );
  }, [events]);

  if (sortedEvents.length === 0) {
    return (
      <div className="text-center py-8 bg-[#14141f] rounded-xl border border-gray-800">
        <CalendarDays className="w-10 h-10 text-gray-600 mx-auto" />
        <p className="mt-3 text-gray-400">Aucun evenement RH</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedEvents.map((event) => {
        const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.absence;
        const statusConfig =
          STATUS_CONFIG[event.status] || STATUS_CONFIG.en_attente;
        const Icon = config.icon;

        return (
          <div
            key={event.id}
            className="bg-[#14141f] rounded-xl border border-gray-800 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-lg bg-[#1a1a2e]">
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={config.color}>{config.label}</Badge>
                    <Badge className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">
                    {formatDate(event.start_date)}
                    {event.end_date && ` - ${formatDate(event.end_date)}`}
                  </p>
                  {event.duration_days && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {event.duration_days} jour
                      {event.duration_days > 1 ? "s" : ""}
                    </p>
                  )}
                  {event.reason && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                      {event.reason}
                    </p>
                  )}
                  {event.supporting_doc_url && (
                    <a
                      href={event.supporting_doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded px-2 py-1"
                    >
                      <Paperclip className="w-3 h-3" />
                      Justificatif joint
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
