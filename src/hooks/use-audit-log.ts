"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/db";

export function useAuditLog() {
  const { user } = useAuth();

  const logAction = useCallback(
    async (
      action: string,
      entityType: string,
      entityId?: string | null,
      metadata: Record<string, unknown> = {}
    ) => {
      if (!user) return;
      try {
        await db.auditLogs.create({
          client_id: user.company_id || undefined,
          user_email: user.email,
          action,
          entity_type: entityType,
          entity_id: entityId ? String(entityId) : undefined,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            user_role: user.role,
          },
        } as never);
      } catch (err) {
        console.error("Audit log failed:", err);
      }
    },
    [user]
  );

  return { logAction };
}
