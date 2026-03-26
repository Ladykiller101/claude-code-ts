import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/lib/query-client";
import { SonnerToaster } from "@/components/ui/sonner-toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinFlow — SYGMA Conseils",
  description: "Portail de gestion comptable et financiere",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Suppress browser extension DOM errors that crash React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                const origError = window.onerror;
                window.onerror = function(msg) {
                  if (typeof msg === 'string' && (
                    msg.includes('insertBefore') ||
                    msg.includes('removeChild') ||
                    msg.includes('appendChild') ||
                    msg.includes('not a child of this node')
                  )) {
                    return true; // suppress the error
                  }
                  return origError ? origError.apply(this, arguments) : false;
                };
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
          <SonnerToaster />
        </QueryProvider>
      </body>
    </html>
  );
}
