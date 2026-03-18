"use client";

import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

export function useMessages(clientId: string | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["messages", clientId];

  // Fetch messages for this client
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery<Message[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        table: "messages",
        orderBy: "created_at",
        ascending: "true",
      });
      const res = await fetch(`/api/query?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch messages");
      }
      const data: Message[] = await res.json();
      // Filter by client_id (the query route already filters for client roles,
      // but firm users get all — we filter on the frontend for the specific client)
      return clientId ? data.filter((m) => m.client_id === clientId) : [];
    },
    enabled: !!clientId,
    refetchInterval: 30000, // Fallback polling every 30s
  });

  // Send a message
  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      client_id,
    }: {
      content: string;
      client_id: string;
    }) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id, content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: (newMessage) => {
      // Optimistically add the new message
      queryClient.setQueryData<Message[]>(queryKey, (old = []) => [
        ...old,
        newMessage,
      ]);
    },
  });

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!clientId) return;
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });
    } catch {
      // Silently fail — not critical
    }
  }, [clientId]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!clientId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          queryClient.setQueryData<Message[]>(queryKey, (old = []) => {
            // Avoid duplicates (from optimistic update)
            if (old.some((m) => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient, queryKey]);

  return {
    messages,
    isLoading,
    error,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
    markAsRead,
  };
}

export function useUnreadCount(
  clientId: string | null | undefined,
  currentUserId: string | null | undefined
) {
  const { messages } = useMessages(clientId);

  if (!currentUserId) return 0;
  return messages.filter(
    (m) => !m.read_at && m.sender_id !== currentUserId
  ).length;
}
