import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Database,
  ShieldCheck,
  Server,
  ExternalLink,
} from "lucide-react";

export function Sidebar({ isOpen, onClose }) {
  const navItems = [
    {
      label: "Dashboard",
      path: "/",
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: "Projects",
      path: "/projects",
      icon: Boxes,
      end: false,
    },
    {
      label: "Cache Monitor",
      path: "/cache",
      icon: Database,
      end: false,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">
              SupplyChain <span className="text-blue-400">Risk</span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
              Dependency Platform
            </p>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-6 px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Data Providers
          </div>
          <a
            href="https://deps.dev"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              deps.dev v3 API
            </span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>

        {/* System status footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Backend Connected
            </span>
            <span className="font-mono text-[10px] text-slate-500">v1.0</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            PostgreSQL 18 • Django 5
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
