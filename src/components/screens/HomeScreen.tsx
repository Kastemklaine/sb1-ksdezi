import React from 'react';
import { StackScreenProps } from '@react-navigation/stack';
import { Page, StackLayout, Button, Label } from '@nativescript/core';
import { useUserStore } from '../../store/useUserStore';

type RootStackParamList = {
  Home: undefined;
  Studio: undefined;
};

type Props = StackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { currentUser } = useUserStore();

  return (
    <Page className="bg-gray-900">
      <StackLayout className="p-4">
        <Label 
          text="Welcome to SingrdBeats"
          className="text-2xl text-purple-400 font-bold text-center"
        />
        {currentUser ? (
          <>
            <Button
              text="Enter Studio"
              className="bg-purple-600 text-white p-4 rounded-lg mt-4"
              onTap={() => navigation.navigate('Studio')}
            />
            {!currentUser.isPremium && (
              <Button
                text="Upgrade to Premium"
                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4 rounded-lg mt-4"
              />
            )}
          </>
        ) : (
          <Button
            text="Sign In"
            className="bg-purple-600 text-white p-4 rounded-lg mt-4"
          />
        )}
      </StackLayout>
    </Page>
  );
}