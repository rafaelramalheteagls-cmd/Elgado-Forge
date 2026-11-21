import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, FileCode2, Sparkles, X } from 'lucide-react';
import {
  downloadReFrameworkLuaScript,
  REFRAMEWORK_EXPORT_FILENAME,
  REFRAMEWORK_LUA_FILENAME,
  REFRAMEWORK_LUA_SCRIPT,
  SAMPLE_REFRAMEWORK_EXPORT_JSON,
} from '../utils/reframeworkLuaScript';

interface ReFrameworkScriptModalProps {
  open: boolean;
  onClose: () => void;
  onLoadSampleJson?: (jsonText: string) => void;
}

export const ReFrameworkScriptModal: React.FC<ReFrameworkScriptModalProps> = ({
  open,
  onClose,
  onLoadSampleJson,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopyLua = async () => {
    try {
      await navigator.clipboard.writeText(REFRAMEWORK_LUA_SCRIPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reframework-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0B0D10]">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.09] bg-[#12161C] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D4A853]/30 bg-[#D4A853]/10 text-[#D4A853]">
              <FileCode2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="reframework-modal-title"
                className="font-display text-lg font-semibold text-[#ECEFF4]"
              >
                REFramework Lua Exporter ({REFRAMEWORK_LUA_FILENAME})
              </h2>
              <p className="text-xs text-[#98A2B3]">
                Exports Material Item Box, Talismans, Weapons, Armor, Decorations, and HR/MR/AR directly from Monster Hunter Rise: Sunbreak
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Close</span>
          </button>
        </header>

        {/* Setup Steps & Actions */}
        <div className="space-y-4 border-b border-white/[0.08] bg-[#12161C]/70 px-6 py-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/[0.08] bg-[#0B0D10] p-3">
              <p className="text-xs font-semibold text-[#D4A853]">01. Install Autorun Script</p>
              <p className="mt-1 text-xs leading-relaxed text-[#98A2B3]">
                Download <span className="font-mono-tabular text-[#ECEFF4]">{REFRAMEWORK_LUA_FILENAME}</span> and place it inside{' '}
                <span className="font-mono-tabular text-[#ECEFF4]">reframework/autorun/</span> in your Steam MHRise folder.
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-[#0B0D10] p-3">
              <p className="text-xs font-semibold text-[#D4A853]">02. Export Inside Game</p>
              <p className="mt-1 text-xs leading-relaxed text-[#98A2B3]">
                Load your hunter in Kamura or Elgado, press <span className="font-mono-tabular text-[#ECEFF4]">Insert</span> to open REFramework, expand{' '}
                <span className="text-[#ECEFF4]">Elgado Forge Sync Exporter</span>, and click Export File or Copy JSON.
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-[#0B0D10] p-3">
              <p className="text-xs font-semibold text-[#D4A853]">03. Drop or Paste Here</p>
              <p className="mt-1 text-xs leading-relaxed text-[#98A2B3]">
                Drag <span className="font-mono-tabular text-[#ECEFF4]">reframework/data/{REFRAMEWORK_EXPORT_FILENAME}</span> into the importer or paste the copied JSON to sync materials, ranks, charms, and gear.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={downloadReFrameworkLuaScript}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-4 py-2 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B] transition-colors"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Download {REFRAMEWORK_LUA_FILENAME}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLua}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0D10] px-3.5 py-2 text-xs font-medium text-[#ECEFF4] hover:border-[#D4A853] transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-[#D4A853]" aria-hidden="true" />
                )}
                <span>{copied ? 'Copied Script!' : 'Copy Lua Script'}</span>
              </button>
            </div>

            {onLoadSampleJson && (
              <button
                type="button"
                onClick={() => {
                  onLoadSampleJson(SAMPLE_REFRAMEWORK_EXPORT_JSON);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4A853] hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Load Sample Snapshot JSON in Importer</span>
              </button>
            )}
          </div>
        </div>

        {/* Script Preview */}
        <div className="flex-1 overflow-auto bg-[#0B0D10] p-5">
          <pre className="rounded-lg border border-white/[0.08] bg-[#12161C] p-4 font-mono-tabular text-[11px] leading-relaxed text-[#ECEFF4] overflow-x-auto">
            <code>{REFRAMEWORK_LUA_SCRIPT}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
