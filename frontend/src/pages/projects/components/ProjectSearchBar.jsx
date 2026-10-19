import React from "react";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "../../../components/common/Button";

export function ProjectSearchBar({
  searchQuery,
  onSearchChange,
  selectedEcosystem,
  onEcosystemChange,
  onRefresh,
  loading = false,
}) {
  const ecosystems = [
    { label: "All Ecosystems", value: "ALL" },
    { label: "Maven", value: "MAVEN" },
    { label: "PyPI", value: "PYPI" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by project or repository name..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Ecosystem Filter Pills & Refresh */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {ecosystems.map((eco) => {
            const isSelected = selectedEcosystem === eco.value;
            return (
              <button
                key={eco.value}
                onClick={() => onEcosystemChange(eco.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {eco.label}
              </button>
            );
          })}
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={RotateCcw}
          onClick={onRefresh}
          loading={loading}
          title="Refresh Projects"
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}

export default ProjectSearchBar;
