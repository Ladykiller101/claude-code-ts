"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { callN8n, N8N_WEBHOOKS } from "@/lib/n8n-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  User,
  Send,
  AlertTriangle,
  ExternalLink,
  TicketPlus,
} from "lucide-react";

function generateConversationId() {
  return "conv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

function MessageBubble({ message, onEscalate }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-indigo-400" />
        </div>
      )}

      <div className={`max-w-[75%] space-y-2`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? "bg-indigo-600 text-white"
              : "bg-[#1a1a2e] text-white border border-gray-800"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-headings:text-white prose-strong:text-white prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-0.5"
                    >
                      {children}
                      <ExternalLink className="w-3 h-3 inline shrink-0" />
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((source, i) =>
              source.url ? (
                <a
                  key={i}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded px-2 py-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  {source.title || `Source ${i + 1}`}
                </a>
              ) : (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-800 rounded px-2 py-1"
                >
                  {source.title}
                </span>
              )
            )}
          </div>
        )}

        {!isUser &&
          message.confidence !== undefined &&
          message.confidence < 0.8 && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs"
            >
              Confiance : {Math.round(message.confidence * 100)}%
            </Badge>
          )}

        {!isUser &&
          message.confidence !== undefined &&
          message.confidence < 0.7 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400">
                    Cette reponse necessite une verification. Voulez-vous
                    contacter votre expert-comptable ?
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={onEscalate}
                  >
                    Contacter l'expert-comptable
                  </Button>
                </div>
              </div>
            </div>
          )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4 text-gray-300" />
        </div>
      )}
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0 mt-1">
        <Bot className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg px-4 py-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Bonjour ! Je suis votre assistant juridique. Posez-moi vos questions sur le droit du travail, la fiscalite ou les obligations sociales.",
};

export default function LegalChatbot({
  clientId,
  currentUser,
  onEscalateToTicket,
}) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(generateConversationId);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleEscalate = () => {
    if (!onEscalateToTicket) return;
    const conversationText = messages
      .map(
        (m) =>
          `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`
      )
      .join("\n\n");
    onEscalateToTicket(conversationText);
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await callN8n(N8N_WEBHOOKS.chatbot, {
        conversation_id: conversationId,
        client_id: clientId,
        user_email: currentUser?.email || "",
        message: trimmed,
      });

      // Normalize sources: handle both string arrays and object arrays
      const rawSources = response.sources || [];
      const normalizedSources = rawSources
        .map((s) => {
          if (typeof s === "string") {
            // Try to extract URL if it looks like a link
            const urlMatch = s.match(/https?:\/\/[^\s)]+/);
            return { title: s.replace(/https?:\/\/[^\s)]+/g, "").trim() || s, url: urlMatch ? urlMatch[0] : "" };
          }
          return { title: s.title || s.name || "Source", url: s.url || s.link || "" };
        })
        .filter((s) => s.title);

      const assistantMessage = {
        role: "assistant",
        content:
          response.response ||
          response.reply ||
          response.message ||
          "Desole, je n'ai pas pu traiter votre demande.",
        sources: normalizedSources,
        confidence: response.confidence,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.suggest_escalation) {
        // The escalation prompt is shown automatically via the confidence badge
        // if confidence < 0.7, or we can force it by setting low confidence
        if (
          assistantMessage.confidence === undefined ||
          assistantMessage.confidence >= 0.7
        ) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              confidence: 0.6,
            };
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Desole, une erreur est survenue. Veuillez reessayer ou contacter votre expert-comptable.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] rounded-lg border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#14141f]">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <h3 className="text-white font-medium">Assistant juridique</h3>
        </div>
        {onEscalateToTicket && (
          <Button
            variant="outline"
            size="sm"
            className="text-gray-400 hover:text-white border-gray-700"
            onClick={handleEscalate}
          >
            <TicketPlus className="w-4 h-4 mr-1" />
            Exporter vers ticket
          </Button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400">
            Cet assistant fournit des informations a titre indicatif. Les
            reponses n'ont pas valeur de conseil juridique. Consultez votre
            expert-comptable pour validation.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message, i) => (
          <MessageBubble
            key={i}
            message={message}
            onEscalate={handleEscalate}
          />
        ))}
        {isLoading && <LoadingBubble />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800 bg-[#14141f]">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question..."
            className="min-h-[44px] max-h-[120px] resize-none bg-[#1a1a2e] border-gray-700 text-white placeholder:text-gray-500"
            disabled={isLoading}
            rows={1}
          />
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 shrink-0 h-[44px] w-[44px] p-0"
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
