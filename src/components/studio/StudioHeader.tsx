import React from 'react';
import { GridLayout, Label, Button } from '@nativescript/core';
import { theme } from '../../styles/theme';

interface StudioHeaderProps {
  projectName: string;
  isRecording: boolean;
  onRecord: () => void;
  onStopRecord: () => void;
}

export function StudioHeader({
  projectName,
  isRecording,
  onRecord,
  onStopRecord
}: StudioHeaderProps) {
  return (
    <GridLayout columns="*, auto" className="p-4 bg-surface">
      <Label
        text={projectName}
        className="text-xl font-bold"
        style={{ color: theme.colors.text }}
        col={0}
      />
      <Button
        text={isRecording ? "Stop Recording" : "Record"}
        className={isRecording ? "btn-error" : "btn-primary"}
        onTap={isRecording ? onStopRecord : onRecord}
        col={1}
      />
    </GridLayout>
  );
}