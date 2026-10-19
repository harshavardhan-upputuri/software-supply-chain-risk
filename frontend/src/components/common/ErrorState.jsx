import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({
  title = "Failed to load data",
  message = "An error occurred while fetching information from the backend.",
  onRetry = null,
  className = "",
}) {
  return (
    <div className={`p-6 rounded-xl bg-rose-50 border border-rose-200 text-center flex flex-col items-center justify-center my-4 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-rose-600" />
      </div>
      <h4 className="text-base font-semibold text-rose-900">{title}</h4>
      <p className="text-sm text-rose-700 max-w-md mt-1">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="danger" size="sm" icon={RotateCcw} onClick={onRetry}>
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
}

export default ErrorState;
