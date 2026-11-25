import type { ArmorSlot, QuriousArmorAugment, QuriousWeaponAugment } from '../types/sunbreak';

export const EMPTY_Q_WEAPON: QuriousWeaponAugment = {
  attackLevel: 0,
  elementLevel: 0,
  affinityLevel: 0,
  sharpnessBoost: false,
  extraSlotLevel: 0,
};

export const EMPTY_ARMOR_AUGMENT: QuriousArmorAugment = {
  defenseDelta: 0,
  skillAddedId: '',
  skillAddedPoints: 0,
  slotUpgrade: 0,
};

export const EMPTY_Q_ARMOR: Record<ArmorSlot, QuriousArmorAugment> = {
  Helm: { ...EMPTY_ARMOR_AUGMENT },
  Chest: { ...EMPTY_ARMOR_AUGMENT },
  Arms: { ...EMPTY_ARMOR_AUGMENT },
  Waist: { ...EMPTY_ARMOR_AUGMENT },
  Legs: { ...EMPTY_ARMOR_AUGMENT },
};
