"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "";
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
          <h3 className="text-lg font-semibold text-white">
            {this.props.title || "Une erreur est survenue"}
          </h3>
          <p className="text-sm text-gray-400 max-w-md">
            {this.props.message || "Ce module n'a pas pu se charger. Veuillez réessayer."}
          </p>
          {errorMessage && (
            <details className="text-xs text-gray-500 max-w-lg w-full">
              <summary className="cursor-pointer hover:text-gray-300">Détails techniques</summary>
              <pre className="mt-2 p-3 bg-[#0a0a0f] rounded-lg text-left overflow-x-auto whitespace-pre-wrap break-all border border-gray-800">
                {errorMessage}
              </pre>
            </details>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
