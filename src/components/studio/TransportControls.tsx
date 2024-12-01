import React from 'react';
import { StackLayout, Button } from '@nativescript/core';
import { useTheme } from '../../styles/ThemeProvider';

export function TransportControls() {
  const theme = useTheme();

  return (
    <StackLayout
      orientation="horizontal"
      className="p-4"
      style={{ backgroundColor: theme.colors.surface }}
    >
      <Button
        text="Play"
        className="btn-primary mr-2"
      />
      <Button
        text="Stop"
        className="btn-secondary"
      />
    </StackLayout>
  );
}