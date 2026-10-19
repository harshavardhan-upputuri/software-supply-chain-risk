import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "../../../components/common/Modal";

export function RebuildConfirmModal({ isOpen, onClose, onConfirm, loading = false, projectName = "" }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Force Rebuild Dependency Graph"
      confirmLabel="Yes, Rebuild Graph"
      confirmVariant="danger"
      onConfirm={onConfirm}
      loading={loading}
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="text-xs text-slate-600 space-y-2">
          <p className="font-semibold text-slate-800 text-sm">
            Are you sure you want to rebuild the dependency graph?
          </p>
          <p>
            This action will bypass existing cached graph data for{" "}
            <strong className="text-slate-900">{projectName}</strong>, re-query the
            upstream <span className="font-mono text-slate-700">deps.dev</span> API
            for all package versions, and re-compute the directed graph relationships.
          </p>
          <p className="text-[11px] text-slate-400">
            This operation is safe and reversible, but will issue live external API calls.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default RebuildConfirmModal;
