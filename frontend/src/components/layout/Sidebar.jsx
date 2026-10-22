
import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Database,
  ShieldCheck,
  Server,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ChevronRight,
} from "lucide-react";

export function Sidebar({
  isOpen,
  onClose,
  onToggle,
  collapsed = false,
  onCollapsedChange,
}) {
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
    // {
    //   label: "Cache Monitor",
    //   path: "/cache",
    //   icon: Database,
    //   end: false,
    // },
  ];

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else if (onCollapsedChange) {
      onCollapsedChange(!collapsed);
    } else if (onClose) {
      onClose();
    }
  };

  const closeMobileSidebar = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col overflow-hidden
          border-r border-slate-800/80
          bg-slate-950 text-slate-300
          shadow-xl shadow-slate-950/10
          transition-[width,transform] duration-300 ease-in-out
          ${collapsed ? "w-[76px]" : "w-64"}
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Brand */}
        <div
          className={`flex h-[76px] shrink-0 items-center border-b border-slate-800/80 ${collapsed ? "justify-center px-2" : "justify-between px-5"
            }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {/* Expand button in collapsed desktop mode */}
            {collapsed && (
              <button
                type="button"
                onClick={handleToggle}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="mx-auto mt-4 hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:inline-flex"
              >
                <PanelLeftOpen size={19} />
              </button>
            )}

            {!collapsed && (
              <div className="min-w-0">
                <h1 className="whitespace-nowrap text-[13px] font-bold uppercase tracking-wide text-white">
                  Supply Chain <span className="text-blue-400">Risk</span>
                </h1>
                <p className="mt-1 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                  Cascading impact analysis
                </p>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              type="button"
              onClick={handleToggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white lg:inline-flex"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>



        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-6">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Workspace
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={closeMobileSidebar}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative mb-1 flex min-h-11 items-center gap-3 rounded-xl text-[13px] transition-all duration-200 ${collapsed
                    ? "justify-center px-2"
                    : "px-3.5"
                  } ${isActive
                    ? "bg-blue-600 font-semibold text-white shadow-md shadow-blue-950/30"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-blue-300" />
                    )}

                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className={`shrink-0 ${isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-200"
                        }`}
                    />

                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <ChevronRight
                            size={15}
                            className="text-blue-200"
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section: provider + system status */}
        <div className="mt-auto shrink-0 border-t border-slate-800/80">
          {/* Data Providers */}
          <div className={collapsed ? "px-3 py-4" : "px-4 pb-4 pt-5"}>
            {!collapsed && (
              <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Data Providers
              </p>
            )}

            <a
              href="https://deps.dev"
              target="_blank"
              rel="noreferrer"
              title={collapsed ? "deps.dev v3 API" : undefined}
              className={`group flex min-h-10 items-center rounded-lg text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white ${collapsed
                  ? "justify-center px-2"
                  : "justify-between px-3"
                }`}
            >
              <span className="flex items-center gap-3">
                <Server
                  size={16}
                  className="shrink-0 text-blue-400"
                />
                {!collapsed && <span>deps.dev v3 API</span>}
              </span>

              {!collapsed && (
                <ExternalLink
                  size={13}
                  className="text-slate-600 transition group-hover:text-slate-300"
                />
              )}
            </a>
          </div>


        </div>
      </aside>
    </>
  );
}

export default Sidebar;
