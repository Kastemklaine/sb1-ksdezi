import React from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useProjectStore } from '../../store/useProjectStore';

export const Transport = () => {
  const { currentProject } = useProjectStore();
  const { togglePlayback } = useAudioEngine();

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-center space-x-4">
        <Button variant="ghost" size="icon" onClick={togglePlayback}>
          <Play className="w-6 h-6" />
        </Button>
        <Button variant="ghost" size="icon">
          <Square className="w-6 h-6" />
        </Button>
        <div className="text-gray-400">
          BPM: {currentProject?.bpm || 120}
        </div>
      </div>
    </div>
  );
};