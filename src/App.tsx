import { useCallback, useEffect, useState } from 'react';
import { BuilderWorkspace } from './components/BuilderWorkspace';
import { CompareView } from './components/CompareView';
import { DrawerTarget, EquipmentDrawer } from './components/EquipmentDrawer';
import { MetaAndSyncView } from './components/MetaAndSyncView';
import { OwnedRecommendationsView } from './components/OwnedRecommendationsView';
import { TopBar, WorkspaceTab } from './components/TopBar';
import { TrainingSimulatorView } from './components/TrainingSimulatorView';
import {
  ArmorItem,
  BuildLoadout,
  HunterProfile,
  InventoryState,
  WeaponItem,
} from './types/sunbreak';
import {
  decodeBuildFromHash,
  encodeBuildToShareUrl,
  loadActiveBuild,
  loadFavoriteIds,
  loadHunterProfile,
  loadInventoryState,
  loadSavedBuilds,
  saveActiveBuild,
  saveBuildsList,
  saveFavoriteIds,
  saveHunterProfile,
  saveInventoryState,
} from './utils/storageAndShare';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('builder');
  const [savedBuilds, setSavedBuilds] = useState<BuildLoadout[]>(() => loadSavedBuilds());
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavoriteIds());
  const [activeBuild, setActiveBuild] = useState<BuildLoadout>(() => {
    const shared = decodeBuildFromHash(window.location.hash);
    if (shared) {
      return { ...shared, id: `shared_${Date.now()}` };
    }
    return loadActiveBuild();
  });
  const [profile, setProfile] = useState<HunterProfile>(() => loadHunterProfile());
  const [inventory, setInventory] = useState<InventoryState>(() => loadInventoryState());
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [metaSubTabRequest, setMetaSubTabRequest] = useState<{
    tab: 'recommendations' | 'steam_sync' | 'database';
    key: number;
  }>({ tab: 'recommendations', key: 0 });

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Show notice if hydrated from a shared community URL
  useEffect(() => {
    if (window.location.hash.includes('build=')) {
      const shared = decodeBuildFromHash(window.location.hash);
      if (shared) {
        showToast(`Loaded shared community build: ${shared.name}`);
      }
    }
  }, [showToast]);

  // Persist active build, saved builds, favorites, profile, inventory
  useEffect(() => {
    saveActiveBuild(activeBuild);
  }, [activeBuild]);

  useEffect(() => {
    saveBuildsList(savedBuilds);
  }, [savedBuilds]);

  useEffect(() => {
    saveFavoriteIds(favoriteIds);
  }, [favoriteIds]);

  useEffect(() => {
    saveHunterProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveInventoryState(inventory);
  }, [inventory]);

  // Real-time inventory auto-sync polling when enabled
  useEffect(() => {
    if (!inventory.autoSyncEnabled) return;
    const runSync = async () => {
      try {
        const res = await fetch('/api/inventory/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mr: profile.mr, ar: profile.ar }),
        });
        const data = await res.json();
        if (data?.ok) {
          setInventory((prev) => ({
            ...prev,
            ownedWeaponIds: Array.from(
              new Set([...prev.ownedWeaponIds, ...(data.unlockedWeaponIds ?? [])])
            ),
            ownedArmorIds: Array.from(
              new Set([...prev.ownedArmorIds, ...(data.unlockedArmorIds ?? [])])
            ),
            ownedDecoIds: Array.from(
              new Set([...prev.ownedDecoIds, ...(data.unlockedDecoIds ?? [])])
            ),
            lastInventorySyncAt: data.syncedAt,
          }));
        }
      } catch {
        // Silent background retry on next interval
      }
    };

    const interval = setInterval(runSync, 15000);
    return () => clearInterval(interval);
  }, [inventory.autoSyncEnabled, profile.mr, profile.ar]);

  const handleSaveBuild = () => {
    const stamped: BuildLoadout = {
      ...activeBuild,
      updatedAt: new Date().toISOString(),
    };
    setActiveBuild(stamped);
    setSavedBuilds((prev) => {
      const exists = prev.some((b) => b.id === stamped.id);
      if (exists) {
        return prev.map((b) => (b.id === stamped.id ? stamped : b));
      }
      return [stamped, ...prev];
    });
    showToast(`Saved "${stamped.name}" to your local loadouts.`);
  };

  const handleToggleFavorite = (buildId: string) => {
    const exists = favoriteIds.includes(buildId);
    const next = exists
      ? favoriteIds.filter((id) => id !== buildId)
      : [...favoriteIds, buildId];
    setFavoriteIds(next);

    // Ensure build is also in savedBuilds when favorited
    if (!exists && !savedBuilds.some((b) => b.id === buildId)) {
      setSavedBuilds((prev) => [activeBuild, ...prev]);
    }
    showToast(exists ? 'Removed from Favorites.' : 'Pinned to Favorites.');
  };

  const handleDeleteSavedBuild = (buildId: string) => {
    setSavedBuilds((prev) => prev.filter((b) => b.id !== buildId));
    setFavoriteIds((prev) => prev.filter((id) => id !== buildId));
    if (activeBuild.id === buildId) {
      const fallback = savedBuilds.find((b) => b.id !== buildId);
      if (fallback) setActiveBuild(fallback);
    }
  };

  const handleShareBuild = async () => {
    const url = encodeBuildToShareUrl(activeBuild);
    window.history.replaceState(null, '', url.slice(window.location.origin.length));
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      showToast('Shareable community build link copied to clipboard.');
      setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      setCopiedShare(true);
      showToast('Build URL updated in address bar for sharing.');
      setTimeout(() => setCopiedShare(false), 2200);
    }
  };

  const handleSelectWeapon = (weapon: WeaponItem) => {
    setActiveBuild((prev) => ({
      ...prev,
      weaponClass: weapon.weaponClass,
      weaponId: weapon.id,
      decorations: {
        ...prev.decorations,
        weapon: ['', '', ''],
      },
      updatedAt: new Date().toISOString(),
    }));
    setDrawerTarget(null);
  };

  const handleSelectArmor = (armor: ArmorItem) => {
    setActiveBuild((prev) => {
      const slotMap = {
        Helm: { idKey: 'helmId' as const, decoKey: 'helm' as const },
        Chest: { idKey: 'chestId' as const, decoKey: 'chest' as const },
        Arms: { idKey: 'armsId' as const, decoKey: 'arms' as const },
        Waist: { idKey: 'waistId' as const, decoKey: 'waist' as const },
        Legs: { idKey: 'legsId' as const, decoKey: 'legs' as const },
      };
      const mapping = slotMap[armor.slot];
      return {
        ...prev,
        [mapping.idKey]: armor.id,
        decorations: {
          ...prev.decorations,
          [mapping.decoKey]: ['', '', ''],
        },
        updatedAt: new Date().toISOString(),
      };
    });
    setDrawerTarget(null);
  };

  const handleSelectDecoration = (decoId: string) => {
    if (drawerTarget?.kind !== 'decoration') return;
    const { slotKey, slotIndex } = drawerTarget;
    setActiveBuild((prev) => {
      const group = [...(prev.decorations[slotKey] ?? ['', '', ''])];
      while (group.length <= slotIndex) group.push('');
      group[slotIndex] = decoId;
      return {
        ...prev,
        decorations: {
          ...prev.decorations,
          [slotKey]: group,
        },
        updatedAt: new Date().toISOString(),
      };
    });
    setDrawerTarget(null);
  };

  const handleSelectRampageDeco = (decoId: string) => {
    setActiveBuild((prev) => ({
      ...prev,
      rampageDecoId: decoId,
      updatedAt: new Date().toISOString(),
    }));
    setDrawerTarget(null);
  };

  const selectedArmorId =
    drawerTarget?.kind === 'armor'
      ? activeBuild[
          drawerTarget.slot === 'Helm'
            ? 'helmId'
            : drawerTarget.slot === 'Chest'
            ? 'chestId'
            : drawerTarget.slot === 'Arms'
            ? 'armsId'
            : drawerTarget.slot === 'Waist'
            ? 'waistId'
            : 'legsId'
        ]
      : undefined;

  const selectedDecoId =
    drawerTarget?.kind === 'decoration'
      ? activeBuild.decorations[drawerTarget.slotKey]?.[drawerTarget.slotIndex]
      : drawerTarget?.kind === 'rampage'
      ? activeBuild.rampageDecoId
      : undefined;

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#ECEFF4] flex flex-col">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onShareBuild={handleShareBuild}
        copiedShare={copiedShare}
      />

      <main className="flex-1 pb-12">
        {activeTab === 'builder' && (
          <BuilderWorkspace
            loadout={activeBuild}
            savedBuilds={savedBuilds}
            favoriteIds={favoriteIds}
            inventory={inventory}
            onUpdateLoadout={setActiveBuild}
            onUpdateInventory={setInventory}
            onSaveBuild={handleSaveBuild}
            onToggleFavorite={handleToggleFavorite}
            onSelectSavedBuild={(b) => {
              setActiveBuild(b);
              showToast(`Loaded "${b.name}"`);
            }}
            onDeleteSavedBuild={handleDeleteSavedBuild}
            onOpenDrawer={setDrawerTarget}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView
            activeBuild={activeBuild}
            savedBuilds={savedBuilds}
            onLoadIntoBuilder={(b) => {
              setActiveBuild(b);
              setActiveTab('builder');
              showToast(`Loaded "${b.name}" into Builder.`);
            }}
          />
        )}

        {activeTab === 'training' && (
          <TrainingSimulatorView loadout={activeBuild} />
        )}

        {activeTab === 'owned' && (
          <OwnedRecommendationsView
            profile={profile}
            inventory={inventory}
            onUpdateInventory={setInventory}
            onLoadBuild={(b) => {
              setActiveBuild(b);
              setActiveTab('builder');
              showToast(`Loaded "${b.name}" into Builder.`);
            }}
            onGoToSync={() => {
              setMetaSubTabRequest((prev) => ({
                tab: 'steam_sync',
                key: prev.key + 1,
              }));
              setActiveTab('meta');
            }}
          />
        )}

        {activeTab === 'meta' && (
          <MetaAndSyncView
            profile={profile}
            inventory={inventory}
            savedBuilds={savedBuilds}
            initialSubTab={metaSubTabRequest.tab}
            subTabRequestKey={metaSubTabRequest.key}
            onUpdateProfile={setProfile}
            onUpdateInventory={setInventory}
            onLoadBuild={(b) => {
              setActiveBuild(b);
              setActiveTab('builder');
              showToast(`Loaded "${b.name}" into Builder.`);
            }}
          />
        )}
      </main>

      <footer className="border-t border-white/[0.07] bg-[#0B0D10] py-5">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 text-xs text-[#667085]">
          <span>Elgado Forge · Monster Hunter Rise: Sunbreak Steam Build Workbench</span>
          <span>
            Local Browser Storage · AppID 1446780 Progression Sync
          </span>
        </div>
      </footer>

      <EquipmentDrawer
        target={drawerTarget}
        inventory={inventory}
        selectedWeaponId={activeBuild.weaponId}
        selectedArmorId={selectedArmorId}
        selectedDecoId={selectedDecoId}
        onClose={() => setDrawerTarget(null)}
        onSelectWeapon={handleSelectWeapon}
        onSelectArmor={handleSelectArmor}
        onSelectDecoration={handleSelectDecoration}
        onSelectRampageDeco={handleSelectRampageDeco}
      />

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 rounded-lg border border-[#D4A853]/50 bg-[#171C24] px-4 py-2.5 text-xs font-medium text-[#ECEFF4] shadow-lg"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
