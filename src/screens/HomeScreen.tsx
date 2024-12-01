import React from 'react';
import { Page, StackLayout, Button, Label } from '@nativescript/core';
import { useUserStore } from '../store/useUserStore';
import { theme } from '../styles/theme';

export function HomeScreen({ navigation }: any) {
  const { currentUser } = useUserStore();

  return (
    <Page>
      <StackLayout className="p-4" backgroundColor={theme.colors.background}>
        <Label 
          text="Welcome to SingrdBeats"
          className="text-2xl text-center mb-4"
          color={theme.colors.primary}
        />
        
        <Button
          text="Start Recording"
          className="btn-primary mb-4"
          onTap={() => navigation.navigate('Studio')}
        />
        
        {!currentUser?.isPremium && (
          <Button
            text="Upgrade to Premium"
            className="btn-secondary"
            onTap={() => navigation.navigate('Profile')}
          />
        )}
      </StackLayout>
    </Page>
  );
}