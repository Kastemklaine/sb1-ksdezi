import React from 'react';
import { Transport } from '../transport/Transport';
import { TrackList } from '../track/TrackList';
import { useProjectStore } from '../../store/useProjectStore';

export const Workspace = () => {
  const { currentProject } = useProjectStore();

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <p className="text-gray-400">Create or open a project to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <Transport />
      <div className="flex-1 overflow-y-auto p-4">
        <TrackList />
      </div>
    </div>
  );
};