import React from 'react';
import { Share2, Check } from 'lucide-react';

export type WorkspaceTab = 'builder' | 'compare' | 'training' | 'owned' | 'meta';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onShareBuild: () => void;
  copiedShare: boolean;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'builder', label: 'Builder' },
  { id: 'compare', label: 'Compare' },
  { id: 'training', label: 'Training' },
  { id: 'owned', label: 'Owned Builds' },
  { id: 'meta', label: 'Meta & Sync' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onShareBuild,
  copiedShare,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B0D10]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
        <button
          type="button"
          onClick={() => onSelectTab('builder')}
          className="font-display text-lg font-bold tracking-tight text-[#ECEFF4] whitespace-nowrap shrink-0 hover:text-[#D4A853] transition-colors focus-visible:outline-2 focus-visible:outline-[#D4A853]"
        >
          Elgado Forge
        </button>

        <nav aria-label="Primary Workspace" className="flex items-center gap-6 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-[#D4A853] ${
                  isActive
                    ? 'text-[#D4A853]'
                    : 'text-[#98A2B3] hover:text-[#ECEFF4]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-[#D4A853]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onShareBuild}
          className="inline-flex items-center gap-2 rounded-lg bg-[#D4A853] px-4 py-2 text-xs font-semibold text-[#0B0D10] hover:bg-[#E1BA6B] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A853]"
        >
          {copiedShare ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Link Copied</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Share Build</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
