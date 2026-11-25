import type { HunterProfile, InventoryState } from '../types/sunbreak';
import {
  evaluateOwnedBuildMatches,
  synthesizeOwnedBoxBuilds,
  type BuildPreference,
  type BuildObjective,
  type SynthesizedBoxBuild,
  type BuildSearchConstraints,
  type OwnedTemplateMatch,
  type SynthesizeBoxResult,
} from './ownedBuildOptimizer';
import { DEFAULT_SIM_CONFIG, simulateTrainingDps } from './damageCalculator';

export interface OwnedBuildRequest {
  inventory: InventoryState;
  profile: HunterProfile;
  weaponFilter: string;
  preference: BuildPreference;
  allowHealthDrain: boolean;
  craftableNow: boolean;
  constraints?: BuildSearchConstraints;
  objectiveWeaponId?: string;
}

export interface OwnedBuildResponse {
  synthesized: SynthesizeBoxResult;
  matches: OwnedTemplateMatch[];
  alternatives?: Array<{ objective: BuildObjective; build?: SynthesizedBoxBuild }>;
}

self.onmessage = ({ data }: MessageEvent<OwnedBuildRequest>) => {
  const { inventory, profile, weaponFilter, preference, allowHealthDrain, craftableNow, constraints, objectiveWeaponId } = data;
  const result: OwnedBuildResponse = {
    synthesized: synthesizeOwnedBoxBuilds(inventory, {
      weaponClassFilter: weaponFilter,
      maxBuilds: weaponFilter === 'All' ? 42 : 24,
      preference,
      allowHealthDrain,
      craftingMr: craftableNow ? profile.mr : undefined,
      constraints,
    }),
    matches: evaluateOwnedBuildMatches(profile, inventory, { weaponFilter, preference }),
  };
  if (objectiveWeaponId) {
    const objectives: BuildObjective[] = ['damage', 'comfort', 'cost'];
    result.alternatives = objectives.map(objective => ({
      objective,
      build: synthesizeOwnedBoxBuilds(inventory, {
        objective,
        maxBuilds: 1,
        preference: objective === 'comfort' ? 'comfort' : 'balanced',
        allowHealthDrain,
        craftingMr: craftableNow ? profile.mr : undefined,
        constraints: { ...constraints, weaponId: objectiveWeaponId },
      }).builds[0],
    }));
    const lowest = result.alternatives.flatMap(item => item.build ? [item.build] : [])
      .filter(build => build.craftingCost !== undefined)
      .sort((a, b) => a.craftingCost! - b.craftingCost!)[0];
    if (lowest) result.alternatives[2].build = lowest;
    for (const alternative of result.alternatives) {
      if (alternative.build && alternative.build.objectiveDps === undefined) {
        const simulation = simulateTrainingDps(alternative.build.loadout, DEFAULT_SIM_CONFIG);
        alternative.build.objectiveDps = simulation.dps;
        if (simulation.dps === undefined && simulation.isBowgunMagazine) {
          alternative.build.objectiveMagazineDamage = simulation.comboDamage;
        }
      }
    }
  }
  self.postMessage(result);
};
