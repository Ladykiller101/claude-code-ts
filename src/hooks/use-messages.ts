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
      // Use the dedicated messages GET endpoint which filters by client_id
      // server-side for both firm and client users
      const res = await fetch(`/api/messages?client_id=${encodeURIComponent(clientId!)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch messages");
      }
      return res.json() as Promise<Message[]>;
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

/**
 * Global unread message count — for the sidebar badge.
 * For firm users: counts unread messages across ALL clients (sent by non-firm users).
 * For client users: counts unread messages for their company_id (sent by non-client users).
 */
export function useGlobalUnreadCount(currentUserId: string | null | undefined) {
  const { data: count = 0 } = useQuery<number>({
    queryKey: ["messages-unread-global", currentUserId],
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-count");
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count ?? 0;
    },
    enabled: !!currentUserId,
    refetchInterval: 30000, // Poll every 30s
  });
  return count;
}
