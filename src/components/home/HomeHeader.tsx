import React from 'react';
import { StackLayout, Label, Image } from '@nativescript/core';
import { User } from '../../types/user';
import { theme } from '../../styles/theme';

interface HomeHeaderProps {
  user: User | null;
}

export function HomeHeader({ user }: HomeHeaderProps) {
  return (
    <StackLayout className="p-4 bg-surface">
      <Image src="~/assets/logo.png" className="h-12 w-12 mb-2" />
      <Label 
        text={`Welcome${user ? `, ${user.name}` : ''}`}
        className="text-xl font-bold"
        style={{ color: theme.colors.text }}
      />
      {user?.isPremium && (
        <Label 
          text="Premium Member"
          className="text-sm"
          style={{ color: theme.colors.primary }}
        />
      )}
    </StackLayout>
  );
}