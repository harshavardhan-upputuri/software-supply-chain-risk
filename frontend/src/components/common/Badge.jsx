import React from "react";
import clsx from "clsx";

export function Badge({ children, variant = "default", size = "md", className = "" }) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    primary: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    maven: "bg-amber-50 text-amber-800 border-amber-300 font-medium",
    pypi: "bg-sky-50 text-sky-800 border-sky-300 font-medium",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs font-medium",
    lg: "px-3 py-1.5 text-sm font-medium",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border tracking-wide",
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const statusUpper = (status || "").toUpperCase();
  const map = {
    COMPLETE: { label: "Complete", variant: "success" },
    PARTIAL: { label: "Partial", variant: "warning" },
    FAILED: { label: "Failed", variant: "danger" },
    PENDING: { label: "Pending", variant: "default" },
    EMPTY: { label: "Empty", variant: "default" },
  };

  const conf = map[statusUpper] || { label: status || "Unknown", variant: "default" };

  return <Badge variant={conf.variant}>{conf.label}</Badge>;
}

export function EcosystemBadge({ ecosystem }) {
  const ecoUpper = (ecosystem || "").toUpperCase();
  const isMaven = ecoUpper === "MAVEN";
  return (
    <Badge variant={isMaven ? "maven" : "pypi"}>
      {isMaven ? "Maven" : "PyPI"}
    </Badge>
  );
}

export default Badge;
