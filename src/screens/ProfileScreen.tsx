import React from 'react';
import { Page, StackLayout, Label, Button } from '@nativescript/core';
import { useUserStore } from '../store/useUserStore';
import { useTheme } from '../styles/ThemeProvider';

export function ProfileScreen() {
  const theme = useTheme();
  const { currentUser } = useUserStore();

  return (
    <Page className="bg-background">
      <StackLayout className="p-4">
        <Label
          text={currentUser?.name || 'Guest'}
          className="text-xl font-bold mb-4"
          style={{ color: theme.colors.text }}
        />
        {!currentUser?.isPremium && (
          <Button
            text="Upgrade to Premium"
            className="btn-primary"
          />
        )}
      </StackLayout>
    </Page>
  );
}