import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { TrackControls } from './TrackControls';
import { StudioEffects } from '../effects/StudioEffects';
import { useUserStore } from '../../store/useUserStore';

export const TrackList = () => {
  const { currentProject } = useProjectStore();
  const { currentUser } = useUserStore();
  const isPremium = currentUser?.isPremium ?? false;

  if (!currentProject) return null;

  return (
    <div className="space-y-4">
      {currentProject.tracks.map((track) => (
        <div key={track.id} className="space-y-2">
          <TrackControls track={track} />
          <StudioEffects
            track={track}
            isPremium={isPremium}
            onEffectChange={(effectId, parameter, value) => {
              // Handle effect parameter changes
            }}
            onEffectToggle={(effectId) => {
              // Handle effect toggle
            }}
          />
        </div>
      ))}
    </div>
  );
};