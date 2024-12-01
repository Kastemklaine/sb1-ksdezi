import React from 'react';
import { GridLayout, Label } from '@nativescript/core';
import { useNavigation } from '@react-navigation/native';
import { Project } from '../../types/project';
import { theme } from '../../styles/theme';
import { formatDate } from '../../utils/date';

interface ProjectListItemProps {
  project: Project;
}

export function ProjectListItem({ project }: ProjectListItemProps) {
  const navigation = useNavigation();

  return (
    <GridLayout
      columns="*, auto"
      rows="auto, auto"
      className="p-4"
      onTap={() => navigation.navigate('Studio', { projectId: project.id })}
    >
      <Label
        text={project.name}
        className="font-bold"
        style={{ color: theme.colors.text }}
        row={0}
        col={0}
      />
      <Label
        text={`${project.tracks.length} tracks`}
        style={{ color: theme.colors.textSecondary }}
        row={1}
        col={0}
      />
      <Label
        text={formatDate(project.updatedAt)}
        style={{ color: theme.colors.textSecondary }}
        row={0}
        col={1}
      />
    </GridLayout>
  );
}