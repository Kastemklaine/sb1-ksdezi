import React from 'react';
import { Slider } from '../ui/Slider';
import { TrackEffect } from '../../types/track';

interface EffectControlsProps {
  effect: TrackEffect;
  onParameterChange: (parameter: string, value: number) => void;
}

export const EffectControls: React.FC<EffectControlsProps> = ({
  effect,
  onParameterChange,
}) => {
  const getParameterConfig = (type: string, parameter: string) => {
    const configs = {
      reverb: {
        mix: { min: 0, max: 1, step: 0.01, label: 'Mix' },
        decay: { min: 0.1, max: 10, step: 0.1, label: 'Decay' },
      },
      compression: {
        threshold: { min: -60, max: 0, step: 1, label: 'Threshold' },
        ratio: { min: 1, max: 20, step: 0.5, label: 'Ratio' },
      },
      eq: {
        low: { min: -12, max: 12, step: 0.5, label: 'Low' },
        mid: { min: -12, max: 12, step: 0.5, label: 'Mid' },
        high: { min: -12, max: 12, step: 0.5, label: 'High' },
      },
    };

    return configs[type as keyof typeof configs]?.[parameter];
  };

  return (
    <div className="space-y-4">
      {Object.entries(effect.parameters).map(([parameter, value]) => {
        const config = getParameterConfig(effect.type, parameter);
        if (!config) return null;

        return (
          <div key={parameter} className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">{config.label}</span>
              <span className="text-sm text-gray-400">{value}</span>
            </div>
            <Slider
              value={value}
              min={config.min}
              max={config.max}
              step={config.step}
              onChange={(newValue) => onParameterChange(parameter, newValue)}
            />
          </div>
        );
      })}
    </div>
  );
};