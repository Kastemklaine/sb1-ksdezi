import { knownFolders, Folder, File } from '@nativescript/core';

export function getRecordingsFolder(): Folder {
  const documents = knownFolders.documents();
  return documents.getFolder('recordings');
}

export function generateRecordingFileName(): string {
  const timestamp = new Date().getTime();
  return `recording_${timestamp}.m4a`;
}

export async function ensureRecordingsFolderExists(): Promise<void> {
  const folder = getRecordingsFolder();
  if (!folder.exists()) {
    await folder.create();
  }
}

export function getRecordingPath(fileName: string): string {
  const folder = getRecordingsFolder();
  return `${folder.path}/${fileName}`;
}