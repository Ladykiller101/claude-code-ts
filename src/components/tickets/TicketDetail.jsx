"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/upload";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Loader2,
  User,
  Calendar,
  Tag,
  X,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABELS = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  attente_client: "Attente client",
  "r\u00e9solu": "R\u00e9solu",
  "ferm\u00e9": "Ferm\u00e9",
};

const STATUS_COLORS = {
  nouveau: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  en_cours: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  attente_client: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "r\u00e9solu": "bg-green-500/20 text-green-400 border-green-500/30",
  "ferm\u00e9": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const PRIORITY_COLORS = {
  urgente: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  haute: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  normale: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  basse: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

// Determine the sender_role based on the user's profile role
function getSenderRole(userRole) {
  if (!userRole) return "client";
  if (userRole === "firm_admin" || userRole === "accountant" || userRole === "payroll_manager") {
    return "firm";
  }
  return "client";
}

export default function TicketDetail({ ticket, onBack, currentUser }) {
  const [replyContent, setReplyContent] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const clientId = currentUser?.company_id;

  // FIX BUG 1: Fetch messages filtered by ticket_id server-side via query param
  // instead of fetching ALL ticket_messages and filtering client-side
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["ticket-messages", ticket.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/query?table=ticket_messages&orderBy=created_at&ascending=true&filter_ticket_id=${ticket.id}`
      );
      if (!res.ok) {
        // Fallback: fetch all and filter (for backward compat if filter not supported)
        const allMessages = await db.ticketMessages.list("created_at");
        return allMessages.filter((m) => m.ticket_id === ticket.id);
      }
      return res.json();
    },
  });

  // FIX BUG 5: Realtime subscription for new messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ticket-messages-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        () => {
          // Invalidate query to refetch messages when a new one arrives
          queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticket.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.id, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async (messageData) => {
      const created = await db.ticketMessages.create(messageData);

      // FIX BUG 4: Update the parent ticket's last_message field
      try {
        await db.tickets.update(ticket.id, {
          last_message: messageData.content.substring(0, 200),
        });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      } catch (err) {
        // Non-blocking: don't fail the message send if last_message update fails
        console.warn("Failed to update ticket last_message:", err);
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticket.id] });
      setReplyContent("");
      setReplyAttachments([]);
      setSendError(null);
    },
    // FIX BUG 8: Add error handler for user feedback
    onError: (error) => {
      console.error("Failed to send message:", error);
      setSendError("Erreur lors de l'envoi du message. Veuillez r\u00e9essayer.");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!replyContent.trim() && replyAttachments.length === 0) return;
    setSendError(null);

    // FIX BUG 2 & 3: Send correct fields matching the DB schema
    // - sender_role: populated from user's actual role
    // - sender_name: now a real DB column (added via migration)
    // - attachments: now a real JSONB column (added via migration)
    // FIX BUG 9: Don't send client-side created_at — let the DB default handle it
    sendMutation.mutate({
      ticket_id: ticket.id,
      sender_email: currentUser?.email || "",
      sender_role: getSenderRole(currentUser?.role),
      sender_name: currentUser?.full_name || currentUser?.email || "Utilisateur",
      content: replyContent.trim(),
      attachments: replyAttachments.length > 0 ? replyAttachments : null,
    });
  }, [replyContent, replyAttachments, ticket.id, currentUser, sendMutation]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const file_url = await uploadFile(file, clientId);
      setReplyAttachments((prev) => [
        ...prev,
        { name: file.name, url: file_url },
      ]);
    } catch (err) {
      console.error("Erreur upload:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  const isCurrentUser = (senderEmail) => {
    return senderEmail === currentUser?.email;
  };

  return (
    <div className="bg-[#14141f] rounded-xl border border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="mt-1 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {ticket.title}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                className={`${STATUS_COLORS[ticket.status] || STATUS_COLORS.nouveau} border text-xs`}
              >
                {STATUS_LABELS[ticket.status] || ticket.status}
              </Badge>
              <Badge
                className={`${PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normale} border text-xs`}
              >
                {ticket.priority || "normale"}
              </Badge>
              {ticket.category && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Tag className="w-3 h-3" />
                  {ticket.category}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {(() => { try { return ticket.created_at ? format(new Date(ticket.created_at), "d MMM yyyy '\u00e0' HH:mm", { locale: fr }) : ""; } catch { return ""; } })()}
              </span>
              {ticket.assigned_to && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  {ticket.assigned_to}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {ticket.description && (
          <div className="mt-4 ml-8 p-3 bg-[#1a1a2e] rounded-lg text-sm text-gray-300">
            {ticket.description}
          </div>
        )}
      </div>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Chargement des messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucun message pour le moment. Envoyez le premier message ci-dessous.
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = isCurrentUser(msg.sender_email);
            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    isMine
                      ? "bg-indigo-600/30 border border-indigo-500/30"
                      : "bg-[#1a1a2e] border border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium ${
                        isMine ? "text-indigo-300" : "text-gray-400"
                      }`}
                    >
                      {msg.sender_name || msg.sender_email}
                    </span>
                    {msg.sender_role === "firm" && !isMine && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 border text-[10px] px-1 py-0">
                        Cabinet
                      </Badge>
                    )}
                    <span className="text-xs text-gray-600">
                      {(() => { try { return msg.created_at ? format(new Date(msg.created_at), "d MMM HH:mm", { locale: fr }) : ""; } catch { return ""; } })()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  {msg.attachments?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {(Array.isArray(msg.attachments) ? msg.attachments : []).map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          <Paperclip className="w-3 h-3" />
                          {att.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send error feedback */}
      {sendError && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-800/50 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{sendError}</p>
          <button
            onClick={() => setSendError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Reply box */}
      <div className="p-4 border-t border-gray-800">
        {replyAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {replyAttachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1 bg-[#1a1a2e] px-2 py-1 rounded text-xs text-gray-300"
              >
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{att.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="text-gray-500 hover:text-gray-300 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <label className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1a1a2e] border border-gray-700 cursor-pointer hover:bg-[#1e1e35] transition-colors shrink-0">
            {uploading ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4 text-gray-400" />
            )}
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
          <Textarea
            className="min-h-[40px] max-h-[120px] resize-none bg-[#1a1a2e] border-gray-700"
            placeholder="Votre message... (Ctrl+Enter pour envoyer)"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            onClick={handleSend}
            disabled={
              sendMutation.isPending ||
              (!replyContent.trim() && replyAttachments.length === 0)
            }
            className="bg-indigo-600 hover:bg-indigo-700 shrink-0 h-10 w-10 p-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
