import React from 'react';
import { GridLayout, Label, Slider } from '@nativescript/core';
import { Track } from '../../types/track';
import { useTheme } from '../../styles/ThemeProvider';

interface TrackItemProps {
  track: Track;
}

export function TrackItem({ track }: TrackItemProps) {
  const theme = useTheme();

  return (
    <GridLayout rows="auto, auto" columns="*, auto" className="p-2">
      <Label 
        text={track.name}
        style={{ color: theme.colors.text }}
        row={0}
        col={0}
      />
      <Slider
        value={track.volume}
        minValue={0}
        maxValue={1}
        row={1}
        col={0}
        colSpan={2}
      />
    </GridLayout>
  );
}