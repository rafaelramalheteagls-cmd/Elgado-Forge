import React from 'react';
import { SharpnessTier } from '../types/sunbreak';

interface SharpnessBarProps {
  sharpness: SharpnessTier;
  gauge?: number[];
  compact?: boolean;
}

const SEGMENTS: Array<{ tier: SharpnessTier; color: string; width: string }> = [
  { tier: 'Red', color: '#DC2626', width: '10%' },
  { tier: 'Orange', color: '#EA580C', width: '12%' },
  { tier: 'Yellow', color: '#EAB308', width: '14%' },
  { tier: 'Green', color: '#22C55E', width: '16%' },
  { tier: 'Blue', color: '#3B82F6', width: '16%' },
  { tier: 'White', color: '#F8FAFC', width: '18%' },
  { tier: 'Purple', color: '#A855F7', width: '14%' },
];

const ORDER: SharpnessTier[] = [
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Blue',
  'White',
  'Purple',
];

export const SharpnessBar: React.FC<SharpnessBarProps> = ({ sharpness, gauge, compact }) => {
  const maxIdx = ORDER.indexOf(sharpness);
  const gaugeMax = gauge ? Math.max(400, gauge.reduce((sum, points) => sum + points, 0)) : 400;

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex overflow-hidden rounded border border-white/15 bg-[#0B0D10] ${
          compact ? 'h-2 w-24' : 'h-2.5 w-32'
        }`}
        aria-label={`Sharpness: ${sharpness}`}
      >
        {SEGMENTS.map((seg, idx) => {
          const active = idx <= maxIdx;
          return (
            <div
              key={seg.tier}
              style={{
                width: gauge ? `${(gauge[idx] ?? 0) / gaugeMax * 100}%` : seg.width,
                backgroundColor: active ? seg.color : 'transparent',
                opacity: active ? 1 : 0.15,
              }}
            />
          );
        })}
      </div>
      <span className="font-mono-tabular text-xs font-medium text-[#ECEFF4]">
        {sharpness}
      </span>
    </div>
  );
};
