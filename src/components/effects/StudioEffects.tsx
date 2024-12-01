import React from 'react';
import { Sliders } from 'lucide-react';
import { Track } from '../../types/track';
import { EffectControls } from './EffectControls';
import { Button } from '../ui/Button';

interface StudioEffectsProps {
  track: Track;
  isPremium: boolean;
  onEffectChange: (effectId: string, parameter: string, value: number) => void;
  onEffectToggle: (effectId: string) => void;
}

export const StudioEffects: React.FC<StudioEffectsProps> = ({
  track,
  isPremium,
  onEffectChange,
  onEffectToggle,
}) => {
  return (
    <div className="bg-gray-800 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Sliders className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Studio Effects</h2>
        </div>
        {!isPremium && (
          <Button variant="premium" size="sm">
            Upgrade
          </Button>
        )}
      </div>

      {!isPremium && (
        <div className="bg-yellow-900/50 text-yellow-200 p-3 rounded-lg mb-4">
          Upgrade to Premium for professional studio effects!
        </div>
      )}

      <div className="space-y-6">
        {track.effects.map((effect) => (
          <div key={effect.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">{effect.type}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEffectToggle(effect.id)}
                className={effect.enabled ? 'text-purple-400' : 'text-gray-500'}
                disabled={!isPremium}
              >
                {effect.enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            {effect.enabled && (
              <EffectControls
                effect={effect}
                onParameterChange={(parameter, value) =>
                  onEffectChange(effect.id, parameter, value)
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};