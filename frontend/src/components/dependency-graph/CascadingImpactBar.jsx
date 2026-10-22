import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  ShieldAlert,
  Layers,
  ArrowRight,
  GitBranch,
  AlertTriangle,
} from "lucide-react";

export function CascadingImpactBar({
  summary,
  hasVulnerabilities,
  currentStep,
  totalSteps,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onResume,
  onRestart,
  onStop,
}) {
  if (!hasVulnerabilities) {
    return (
      <div className="bg-amber-50/70 border-b border-amber-200 px-4 py-2 text-xs flex items-center justify-between text-amber-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span className="font-medium">
            No confirmed vulnerable packages found in this project. Cascading impact flow is disabled.
          </span>
        </div>
      </div>
    );
  }

  const isCompleted = currentStep && currentStep.isComplete;
  const isStarted = currentStep !== null;

  return (
    <div className="border-b border-rose-200/80 bg-gradient-to-r from-rose-50/90 via-amber-50/70 to-slate-50 px-4 py-3 space-y-2.5 transition-all">
      {/* Top Row: Metrics & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Metrics Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>Vulnerable Packages: {summary.vulnerableCount}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
            <span>Direct Dependents: <strong className="text-slate-900">{summary.directDependentsCount}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Indirect Dependents: <strong className="text-slate-900">{summary.indirectDependentsCount}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
            <span>Total Unique Reachable: <strong className="text-indigo-900">{summary.totalUniqueDependents}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
            <span>Max Depth: <strong className="text-slate-800">{summary.maxImpactDepth} hops</strong></span>
          </div>
        </div>

        {/* Animation Control Buttons */}
        <div className="flex items-center gap-1.5">
          {!isPlaying && !isPaused && (
            <button
              type="button"
              onClick={onPlay}
              className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 active:scale-95"
            >
              <Play size={13} className="fill-white" />
              <span>Play Impact Flow</span>
            </button>
          )}

          {isPlaying && (
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700"
            >
              <Pause size={13} className="fill-white" />
              <span>Pause</span>
            </button>
          )}

          {isPaused && (
            <button
              type="button"
              onClick={onResume}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
            >
              <Play size={13} className="fill-white" />
              <span>Resume</span>
            </button>
          )}

          {isStarted && (
            <>
              <button
                type="button"
                onClick={onRestart}
                className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                title="Restart from Step 1"
              >
                <RotateCcw size={12} />
                <span>Restart</span>
              </button>

              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                title="Stop animation and reset highlight"
              >
                <Square size={12} className="fill-slate-500" />
                <span>Stop</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Step Indicator / Status Message */}
      {/* {isStarted && (
        <div className="flex items-center justify-between rounded-lg bg-white/90 border border-amber-200/70 px-3 py-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                isCompleted
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : currentStep?.isOrigin
                  ? "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {isCompleted ? "Completed" : `Step ${currentStep?.stepIndex} of ${totalSteps}`}
            </span>
            <span className="font-semibold text-slate-900">{currentStep?.title}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">{currentStep?.description}</span>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            Visualizing potential ripple effects along dependency paths
          </div>
        </div>
      )} */}
    </div>
  );
}

export default CascadingImpactBar;
