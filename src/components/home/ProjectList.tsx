import React from 'react';
import { ListView, StackLayout, Label } from '@nativescript/core';
import { useProjectStore } from '../../store/useProjectStore';
import { ProjectListItem } from './ProjectListItem';
import { theme } from '../../styles/theme';

export function ProjectList() {
  const { projects } = useProjectStore();

  if (!projects?.length) {
    return (
      <StackLayout className="p-4">
        <Label 
          text="No projects yet. Create your first project!"
          style={{ color: theme.colors.textSecondary }}
          className="text-center"
        />
      </StackLayout>
    );
  }

  return (
    <ListView
      items={projects}
      className="flex-1"
      separatorColor={theme.colors.border}
      itemTemplate={(item) => <ProjectListItem project={item} />}
    />
  );
}