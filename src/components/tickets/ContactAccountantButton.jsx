"use client";

import React, { useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Headset } from "lucide-react";
import { toast } from "sonner";
import { callN8n, N8N_WEBHOOKS } from "@/lib/n8n-client";
import TicketForm from "./TicketForm";

export default function ContactAccountantButton({
  clientId,
  currentUser,
  chatbotContext,
}) {
  const [formOpen, setFormOpen] = useState(false);

  const prefillData = {
    priority: "urgente",
    source: chatbotContext ? "chatbot" : "manual",
    chatbot_context: chatbotContext || undefined,
  };

  const handleSave = async (ticketData) => {
    try {
      const created = await db.tickets.create({
        ...ticketData,
        created_by: currentUser?.email || "",
      });

      // Notify firm via n8n webhook
      try {
        await callN8n(N8N_WEBHOOKS.ticketCreate, {
          ticket_id: created.id,
          client_id: clientId,
          title: ticketData.title,
          description: ticketData.description,
          priority: ticketData.priority,
          category: ticketData.category,
          source: ticketData.source,
          client_email: currentUser?.email,
          client_name: currentUser?.name,
        });
      } catch (n8nErr) {
        // Don't block ticket creation if webhook fails
        console.warn("Notification n8n echouee:", n8nErr);
      }

      toast.success("Ticket cree avec succes", {
        description: "Votre expert-comptable a ete notifie.",
      });

      setFormOpen(false);
    } catch (err) {
      console.error("Erreur creation ticket:", err);
      toast.error("Erreur lors de la creation du ticket");
      throw err;
    }
  };

  return (
    <>
      <Button
        onClick={() => setFormOpen(true)}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all"
      >
        <Headset className="w-4 h-4 mr-2" />
        Contacter votre expert-comptable
      </Button>

      <TicketForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        clientId={clientId}
        prefillData={prefillData}
      />
    </>
  );
}
