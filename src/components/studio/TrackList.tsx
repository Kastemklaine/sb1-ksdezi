import React from 'react';
import { ListView } from '@nativescript/core';
import { Track } from '../../types/track';
import { TrackItem } from './TrackItem';
import { useTheme } from '../../styles/ThemeProvider';

interface TrackListProps {
  tracks: Track[];
}

export function TrackList({ tracks }: TrackListProps) {
  const theme = useTheme();

  return (
    <ListView
      items={tracks}
      separatorColor={theme.colors.border}
      itemTemplate={(item) => <TrackItem track={item} />}
    />
  );
}