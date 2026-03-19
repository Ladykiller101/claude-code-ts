"use client";

import { Toaster } from "sonner";

export function SonnerToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#13131a",
          border: "1px solid #1e1e2e",
          color: "#fff",
        },
      }}
    />
  );
}
