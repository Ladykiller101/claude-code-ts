"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useMessages } from "@/hooks/use-messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Loader2,
  MessageSquare,
  User,
  Building,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function isFirmRole(role) {
  return role === "firm_admin" || role === "accountant" || role === "payroll_manager";
}

function getRoleLabel(role) {
  const labels = {
    firm_admin: "Administrateur",
    accountant: "Comptable",
    payroll_manager: "Gestionnaire paie",
    client_admin: "Client (Admin)",
    client_hr: "Client (RH)",
    client_readonly: "Client",
  };
  return labels[role] || role;
}

function safeFmt(d, fmt) {
  if (!d) return "";
  try {
    const p = new Date(d);
    return isNaN(p.getTime()) ? "" : format(p, fmt, { locale: fr });
  } catch {
    return "";
  }
}

export default function MessageThread({ clientId, currentUser, compactHeader = false }) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const { messages, isLoading, sendMessage, isSending, markAsRead } = useMessages(clientId);

  const currentUserId = currentUser?.id;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when the component is visible
  useEffect(() => {
    if (clientId && messages.length > 0) {
      markAsRead();
    }
  }, [clientId, messages.length, markAsRead]);

  const handleSend = () => {
    if (!newMessage.trim() || !clientId) return;
    sendMessage(
      { content: newMessage.trim(), client_id: clientId },
      { onSuccess: () => setNewMessage("") }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <MessageSquare className="w-12 h-12 mb-3 text-gray-600" />
        <p className="text-sm">Aucun client associe pour la messagerie.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#14141f] rounded-xl border border-gray-800">
      {/* Header */}
      {!compactHeader && (
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            Messages
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            Echangez directement avec votre interlocuteur
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Chargement des messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <MessageSquare className="w-10 h-10 mb-3 text-gray-600" />
            <p className="text-sm font-medium">Aucun message</p>
            <p className="text-xs text-gray-600 mt-1">
              Envoyez le premier message ci-dessous
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.sender_id === currentUserId;
            const isFirm = isFirmRole(msg.sender_role);

            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${isMine ? "items-end" : "items-start"}`}>
                  {/* Sender info */}
                  <div className={`flex items-center gap-1.5 mb-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    {isFirm ? (
                      <Building className="w-3 h-3 text-purple-400" />
                    ) : (
                      <User className="w-3 h-3 text-indigo-400" />
                    )}
                    <span className={`text-xs font-medium ${isFirm ? "text-purple-400" : "text-indigo-400"}`}>
                      {msg.sender_name || msg.sender_email || "Inconnu"}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {getRoleLabel(msg.sender_role)}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`rounded-xl px-4 py-2.5 ${
                      isMine
                        ? isFirm
                          ? "bg-purple-600/20 border border-purple-500/30"
                          : "bg-indigo-600/20 border border-indigo-500/30"
                        : "bg-[#1a1a2e] border border-gray-700"
                    }`}
                  >
                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>

                  {/* Timestamp + read indicator */}
                  <div className={`flex items-center gap-1.5 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-gray-600">
                      {safeFmt(msg.created_at, "d MMM HH:mm")}
                    </span>
                    {isMine && msg.read_at && (
                      <span className="text-[10px] text-emerald-500">Lu</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <Textarea
            className="min-h-[40px] max-h-[120px] resize-none bg-[#1a1a2e] border-gray-700 text-sm"
            placeholder="Votre message... (Ctrl+Enter pour envoyer)"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
            className="bg-purple-600 hover:bg-purple-700 shrink-0 h-10 w-10 p-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 text-right">
          Ctrl+Enter pour envoyer
        </p>
      </div>
    </div>
  );
}
