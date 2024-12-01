import React from 'react';
import { StackLayout, Button } from '@nativescript/core';
import { theme } from '../../styles/theme';

interface StudioControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function StudioControls({
  isRecording,
  onStartRecording,
  onStopRecording
}: StudioControlsProps) {
  return (
    <StackLayout
      padding={16}
      backgroundColor={theme.colors.surface}
    >
      <Button
        text={isRecording ? "Stop Recording" : "Start Recording"}
        className={isRecording ? "btn-error" : "btn-primary"}
        onTap={isRecording ? onStopRecording : onStartRecording}
      />
    </StackLayout>
  );
}