import React from 'react';
import { Page, ScrollView, StackLayout } from '@nativescript/core';
import { useProjectStore } from '../../store/useProjectStore';
import { TransportControls } from '../studio/TransportControls';
import { TrackList } from '../studio/TrackList';

export function StudioScreen() {
  const { currentProject } = useProjectStore();

  if (!currentProject) {
    return (
      <Page className="bg-gray-900">
        <StackLayout className="p-4">
          <Label 
            text="Create or open a project to get started"
            className="text-gray-400 text-center"
          />
        </StackLayout>
      </Page>
    );
  }

  return (
    <Page className="bg-gray-900">
      <StackLayout>
        <TransportControls />
        <ScrollView>
          <StackLayout className="p-4">
            <TrackList />
          </StackLayout>
        </ScrollView>
      </StackLayout>
    </Page>
  );
}