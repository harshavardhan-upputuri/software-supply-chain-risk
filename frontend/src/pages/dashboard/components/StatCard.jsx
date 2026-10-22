import React from "react";

export function StatCard({
  title,
  label,
  value,
  subtitle,
  meta,
  icon: Icon,
  trend = null,
  status,
  color = "blue",
}) {
  const displayLabel = label || title;
  const displayMeta = meta || subtitle;
  const displayStatus = status || (trend ? trend.value : null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {displayLabel}
          </p>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5">
            {value ?? 0}
          </div>
        </div>

        {Icon && typeof Icon === "function" && (
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {(displayMeta || displayStatus) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>{displayMeta}</span>
          {displayStatus && (
            <span className="font-medium text-slate-700">{displayStatus}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default StatCard;