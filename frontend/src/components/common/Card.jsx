import React from "react";
import clsx from "clsx";

export function Card({ children, className = "", hover = false, ...props }) {
  return (
    <div
      className={clsx(
        "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
        hover && "transition-shadow duration-200 hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action = null, className = "" }) {
  return (
    <div className={clsx("px-6 py-4 border-b border-slate-100 flex items-center justify-between", className)}>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={clsx("p-6", className)}>{children}</div>;
}

export default Card;
