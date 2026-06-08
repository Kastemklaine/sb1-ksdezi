import { useEffect, useRef } from 'react';
import { useProjectStore, curProject } from '../store/useProjectStore';
import { pushProject, watchProject } from '../lib/firestoreSync';
import type { Project } from '../types';

const DEBOUNCE_MS = 2000;

export function useFirestoreSync() {
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const project = useProjectStore(curProject);
  const syncFromRemote = useProjectStore(s => s.syncFromRemote);

  const remoteRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  // Watch remote changes
  useEffect(() => {
    const unsub = watchProject(currentProjectId, (remoteProject: Project) => {
      const remoteJson = JSON.stringify(remoteProject);
      if (remoteJson === remoteRef.current) return;
      remoteRef.current = remoteJson;
      isRemoteUpdate.current = true;
      syncFromRemote(remoteProject);
    });
    return () => unsub();
  }, [currentProjectId, syncFromRemote]);

  // Push local changes (debounced)
  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const json = JSON.stringify(project);
      if (json !== remoteRef.current) {
        remoteRef.current = json;
        pushProject(project).catch(console.error);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [project]);
}
