import React from 'react';
import { Page, StackLayout } from '@nativescript/core';
import { StudioControls } from '../components/studio/StudioControls';
import { TrackList } from '../components/studio/TrackList';
import { useRecordingManager } from '../hooks/useRecordingManager';
import { theme } from '../styles/theme';

export function StudioScreen() {
  const { isRecording, startRecording, stopRecording } = useRecordingManager();

  return (
    <Page>
      <StackLayout backgroundColor={theme.colors.background}>
        <StudioControls
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />
        <TrackList />
      </StackLayout>
    </Page>
  );
}