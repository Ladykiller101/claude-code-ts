"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, User, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { fr } from "date-fns/locale";

export default function TasksList({ tasks, clients }) {
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || "\u2014";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgente: "bg-rose-100 text-rose-700 border-rose-200",
      haute: "bg-amber-100 text-amber-700 border-amber-200",
      moyenne: "bg-blue-100 text-blue-700 border-blue-200",
      basse: "bg-gray-100 text-gray-600 border-gray-200",
    };
    return colors[priority] || colors.moyenne;
  };

  const formatDueDate = (date) => {
    const d = new Date(date);
    if (isToday(d)) return "Aujourd'hui";
    if (isTomorrow(d)) return "Demain";
    return format(d, "d MMM", { locale: fr });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">T\u00e2ches urgentes</h3>
        <p className="text-sm text-gray-500 mt-1">\u00c0 traiter en priorit\u00e9</p>
      </div>
      <div className="divide-y divide-gray-50">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucune t\u00e2che urgente
          </div>
        ) : (
          tasks.slice(0, 5).map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  task.priority === "urgente" ? "bg-rose-500" :
                  task.priority === "haute" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{task.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      {getClientName(task.client_id)}
                    </span>
                    <span className={`flex items-center gap-1 ${
                      isPast(new Date(task.due_date)) && task.status !== "termin\u00e9e"
                        ? "text-rose-600"
                        : "text-gray-500"
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {formatDueDate(task.due_date)}
                    </span>
                  </div>
                </div>
                <Badge className={`${getPriorityColor(task.priority)} border`}>
                  {task.priority}
                </Badge>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
