"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calendar, AlertTriangle } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";

export default function DeadlinesList({ deadlines, clients }) {
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || "Tous clients";
  };

  const getDaysRemaining = (date) => {
    if (!date) return { text: "—", urgent: false };
    const d = new Date(date);
    if (isNaN(d.getTime())) return { text: "—", urgent: false };
    const days = differenceInDays(d, new Date());
    if (days < 0) return { text: "En retard", urgent: true };
    if (days === 0) return { text: "Aujourd'hui", urgent: true };
    if (days === 1) return { text: "Demain", urgent: true };
    if (days <= 7) return { text: `${days} jours`, urgent: true };
    return { text: `${days} jours`, urgent: false };
  };

  const safeFormatDate = (date, fmt) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt, { locale: fr });
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Échéances à venir</h3>
        <p className="text-sm text-gray-500 mt-1">Prochaines dates importantes</p>
      </div>
      <div className="divide-y divide-gray-50">
        {deadlines.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucune échéance à venir
          </div>
        ) : (
          deadlines.slice(0, 5).map((deadline, index) => {
            const remaining = getDaysRemaining(deadline.due_date);
            return (
              <motion.div
                key={deadline.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${getTypeColor(deadline.type)} flex items-center justify-center`}>
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{deadline.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{getClientName(deadline.client_id)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${remaining.urgent ? "text-rose-600" : "text-gray-600"}`}>
                      {remaining.text}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {safeFormatDate(deadline.due_date, "d MMM yyyy")}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
