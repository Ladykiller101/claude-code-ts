"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { callN8n, N8N_WEBHOOKS } from "@/lib/n8n-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CalendarPlus,
  Clock,
  MapPin,
  Video,
  ExternalLink,
  X,
  Check,
  CheckCheck,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import AppointmentForm from "./AppointmentForm";

const TYPE_BADGES = {
  bilan_annuel: { label: "Bilan annuel", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  paie: { label: "Paie", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  urgent: { label: "Urgent", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  onboarding: { label: "Onboarding", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  conseil: { label: "Conseil", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const STATUS_BADGES = {
  demande: { label: "Demande", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  confirme: { label: "Confirme", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  annule: { label: "Annule", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  termine: { label: "Termine", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

function AppointmentCard({ appointment, onCancel, onConfirm, onComplete }) {
  const type = TYPE_BADGES[appointment.appointment_type] || TYPE_BADGES.conseil;
  const status = STATUS_BADGES[appointment.status] || STATUS_BADGES.demande;
  const scheduledDate = appointment.scheduled_date
    ? new Date(appointment.scheduled_date)
    : null;
  const canCancel =
    appointment.status === "demande" || appointment.status === "confirme";

  return (
    <Card className="bg-[#14141f] border-gray-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h4 className="text-white font-medium truncate">
              {appointment.subject}
            </h4>
            <Badge variant="outline" className={type.color}>
              {type.label}
            </Badge>
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            {scheduledDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {format(scheduledDate, "d MMMM yyyy 'a' HH:mm", {
                  locale: fr,
                })}
              </span>
            )}
            {appointment.duration_minutes && (
              <span>{appointment.duration_minutes} min</span>
            )}
            {appointment.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {appointment.location}
              </span>
            )}
          </div>

          {appointment.meeting_url && (
            <a
              href={appointment.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-400 hover:text-indigo-300"
            >
              <Video className="w-3.5 h-3.5" />
              Rejoindre la visioconference
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {appointment.status === "demande" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-green-400 hover:bg-green-500/10"
              onClick={() => onConfirm(appointment.id)}
            >
              <Check className="w-4 h-4 mr-1" />
              Confirmer
            </Button>
          )}
          {appointment.status === "confirme" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-blue-400 hover:bg-blue-500/10"
              onClick={() => onComplete(appointment.id)}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Terminer
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => onCancel(appointment.id)}
            >
              <X className="w-4 h-4 mr-1" />
              Annuler
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AppointmentList({ clientId, currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", clientId],
    queryFn: async () => {
      const all = await db.appointments.list("-scheduled_date");
      return clientId
        ? all.filter((a) => a.client_id === clientId)
        : all;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const appointment = await db.appointments.create({
        ...data,
        status: "demande",
        requested_by: currentUser?.email || "",
      });
      try {
        await callN8n(N8N_WEBHOOKS.appointment, {
          appointment_id: appointment.id,
          client_id: data.client_id,
          type: data.appointment_type,
          subject: data.subject,
          scheduled_date: data.scheduled_date,
          client_email: currentUser?.email,
          client_name: currentUser?.full_name || currentUser?.name,
          accountant_email: "teamdialloai@gmail.com",
          location: data.location,
          duration_minutes: data.duration_minutes,
        });
      } catch (err) {
        console.error("n8n appointment notification failed:", err);
      }
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", clientId] });
      setShowForm(false);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id) => db.appointments.update(id, { status: "confirme" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments", clientId] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id) => db.appointments.update(id, { status: "termine" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments", clientId] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => db.appointments.update(id, { status: "annule" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments", clientId] }),
  });

  const upcoming = appointments.filter(
    (a) => a.status === "demande" || a.status === "confirme"
  );
  const past = appointments.filter(
    (a) => a.status === "termine" || a.status === "annule"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Rendez-vous</h2>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setShowForm(true)}
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          Nouveau rendez-vous
        </Button>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-center py-8">Chargement...</div>
      ) : (
        <>
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              A venir
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                Aucun rendez-vous a venir.
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onCancel={(id) => cancelMutation.mutate(id)}
                    onConfirm={(id) => confirmMutation.mutate(id)}
                    onComplete={(id) => completeMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Passes
            </h3>
            {past.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                Aucun rendez-vous passe.
              </p>
            ) : (
              <div className="space-y-3">
                {past.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onCancel={(id) => cancelMutation.mutate(id)}
                    onConfirm={(id) => confirmMutation.mutate(id)}
                    onComplete={(id) => completeMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AppointmentForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={(data) => createMutation.mutate(data)}
        clientId={clientId}
      />
    </div>
  );
}
