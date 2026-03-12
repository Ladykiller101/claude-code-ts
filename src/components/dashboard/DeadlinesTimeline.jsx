"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertTriangle, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

export default function DeadlinesTimeline({ deadlines }) {
  const safeDate = (d) => {
    if (!d) return new Date(0);
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  const upcomingDeadlines = deadlines
    .filter(d => d.status !== 'terminée')
    .sort((a, b) => safeDate(a.due_date) - safeDate(b.due_date))
    .slice(0, 8);

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

  const safeFormatDate = (date, fmt) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt, { locale: fr });
  };

  const getDaysRemaining = (date) => {
    if (!date) return { text: "—", urgent: false, color: "text-gray-500" };
    const d = new Date(date);
    if (isNaN(d.getTime())) return { text: "—", urgent: false, color: "text-gray-500" };
    const days = differenceInDays(d, new Date());
    if (days < 0) return { text: "En retard", urgent: true, color: "text-rose-600" };
    if (days === 0) return { text: "Aujourd'hui", urgent: true, color: "text-rose-600" };
    if (days === 1) return { text: "Demain", urgent: true, color: "text-amber-600" };
    if (days <= 7) return { text: `${days}j`, urgent: true, color: "text-amber-600" };
    if (days <= 30) return { text: `${days}j`, urgent: false, color: "text-blue-600" };
    return { text: `${days}j`, urgent: false, color: "text-gray-500" };
  };

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Calendrier des échéances
        </CardTitle>
        <p className="text-sm text-gray-500">Prochaines dates importantes</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingDeadlines.map((deadline, index) => {
            const daysInfo = getDaysRemaining(deadline.due_date);

            return (
              <div
                key={deadline.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${getTypeColor(deadline.type)} flex items-center justify-center shrink-0`}>
                  <span className="text-white text-xs font-bold">
                    {deadline.type === "TVA" ? "TVA" :
                     deadline.type === "IS" ? "IS" :
                     deadline.type === "DSN" ? "DSN" :
                     safeFormatDate(deadline.due_date, "d")}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {deadline.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {safeFormatDate(deadline.due_date, "EEEE d MMMM")}
                  </p>
                </div>

                <div className={`flex items-center gap-1 ${daysInfo.color} font-semibold text-sm shrink-0`}>
                  {daysInfo.urgent && <Clock className="w-3.5 h-3.5" />}
                  {daysInfo.text}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
