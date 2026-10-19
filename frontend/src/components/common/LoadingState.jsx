import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading data...", className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm text-slate-600 font-medium">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Connecting to backend services</p>
    </div>
  );
}

export default LoadingState;
