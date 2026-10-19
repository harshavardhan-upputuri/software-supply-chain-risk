import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, ChevronRight, Database } from "lucide-react";

export function Navbar({ onToggleSidebar }) {
  const location = useLocation();

  // Dynamic breadcrumb title based on path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === "/") {
      return [{ label: "Dashboard", path: "/" }];
    }
    if (path === "/projects") {
      return [
        { label: "Dashboard", path: "/" },
        { label: "Projects", path: "/projects" },
      ];
    }
    if (path.startsWith("/projects/") && path.endsWith("/graph")) {
      const id = path.split("/")[2];
      return [
        { label: "Projects", path: "/projects" },
        { label: `Project #${id}`, path: `/projects/${id}` },
        { label: "Dependency Graph", path },
      ];
    }
    if (path.startsWith("/projects/")) {
      const id = path.split("/")[2];
      return [
        { label: "Projects", path: "/projects" },
        { label: `Project #${id}`, path },
      ];
    }
    if (path === "/cache") {
      return [
        { label: "Dashboard", path: "/" },
        { label: "Cache Monitor", path: "/cache" },
      ];
    }
    return [{ label: "Platform", path: "/" }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb path */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path + idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              {idx === breadcrumbs.length - 1 ? (
                <span className="text-slate-900 font-semibold">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="hover:text-blue-600 transition-colors">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-mono text-[11px]">PostgreSQL 18: ssc_db</span>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
