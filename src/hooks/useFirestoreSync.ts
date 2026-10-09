import { useEffect, useRef } from 'react';
import { useProjectStore, curProject } from '../store/useProjectStore';
import { pushProject, watchProject } from '../lib/firestoreSync';
import type { Project } from '../types';

const DEBOUNCE_MS = 800;

// Merge remote into local: never let remote overwrite local-only additions
// (e.g. a newly created document not yet pushed). The canonical strategy is:
// keep any local item that the remote doesn't know about yet, and accept all
// other remote changes (edits, deletes by other users).
function mergeProject(remote: Project, local: Project | undefined): Project {
  if (!local) return remote;

  const keepLocalOnly = <T extends { id: string }>(remoteArr: T[], localArr: T[]): T[] => {
    const remoteIds = new Set(remoteArr.map(x => x.id));
    const localOnly = localArr.filter(x => !remoteIds.has(x.id));
    return [...remoteArr, ...localOnly];
  };

  return {
    ...remote,
    documents:    keepLocalOnly(remote.documents ?? [],    local.documents ?? []),
    tasks:        keepLocalOnly(remote.tasks ?? [],        local.tasks ?? []),
    iaDocuments:  keepLocalOnly(remote.iaDocuments ?? [],  local.iaDocuments ?? []),
    events:       keepLocalOnly(remote.events ?? [],       local.events ?? []),
    messages:     keepLocalOnly(remote.messages ?? [],     local.messages ?? []),
  };
}

export function useFirestoreSync() {
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const project = useProjectStore(curProject);
  const syncFromRemote = useProjectStore(s => s.syncFromRemote);

  const remoteRef = useRef<string>('');
  const localProjectRef = useRef<Project | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  // Keep a ref to the latest local project for use inside the watcher closure
  useEffect(() => {
    localProjectRef.current = project;
  }, [project]);

  // Watch remote changes
  useEffect(() => {
    const unsub = watchProject(
      currentProjectId,
      (remoteProject: Project) => {
        const remoteJson = JSON.stringify(remoteProject);
        if (remoteJson === remoteRef.current) return;
        remoteRef.current = remoteJson;
        isRemoteUpdate.current = true;
        // Merge so locally-created-but-not-yet-pushed items survive
        const merged = mergeProject(remoteProject, localProjectRef.current);
        syncFromRemote(merged);
      }
    );
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
