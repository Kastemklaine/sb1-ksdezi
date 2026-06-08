import { ref, set, onValue, off } from 'firebase/database';
import { rtdb } from './firebase';
import type { Project } from '../types';

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function pushProject(project: Project): Promise<void> {
  await set(ref(rtdb, `projects/${project.id}`), stripUndefined(project));
}

export function watchProject(
  projectId: string,
  onChange: (p: Project) => void,
  onError?: () => void
): () => void {
  const dbRef = ref(rtdb, `projects/${projectId}`);
  onValue(
    dbRef,
    (snap) => { if (snap.exists()) onChange(snap.val() as Project); },
    () => { onError?.(); }
  );
  return () => off(dbRef);
}
