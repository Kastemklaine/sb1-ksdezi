import { ref, set, onValue, off } from 'firebase/database';
import { rtdb } from './firebase';
import type { Project } from '../types';

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Firebase RTDB converts arrays to objects {0:..., 1:...} — convert back
function toArray<T>(val: T[] | Record<string, T> | null | undefined): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.values(val);
}

function normalizeProject(p: Project): Project {
  return {
    ...p,
    workstreams: toArray(p.workstreams).map(ws => ({
      ...ws,
      assigneeIds: toArray(ws.assigneeIds),
      subSections: toArray(ws.subSections),
    })),
    tasks: toArray(p.tasks).map(t => ({
      ...t,
      assigneeIds: toArray(t.assigneeIds),
      dependsOn: toArray(t.dependsOn),
    })),
    governance: toArray(p.governance).map(g => ({
      ...g,
      memberIds: toArray(g.memberIds),
      workstreamIds: toArray(g.workstreamIds),
    })),
    documents: toArray(p.documents),
    discussions: toArray(p.discussions).map(d => ({
      ...d,
      messages: toArray(d.messages),
    })),
    events: toArray(p.events).map(e => ({
      ...e,
      assigneeIds: toArray(e.assigneeIds),
    })),
    messages: toArray(p.messages).map(m => ({
      ...m,
      attachments: toArray(m.attachments),
      readBy: toArray(m.readBy),
    })),
    iaDocuments: toArray(p.iaDocuments),
  };
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
    (snap) => { if (snap.exists()) onChange(normalizeProject(snap.val() as Project)); },
    () => { onError?.(); }
  );
  return () => off(dbRef);
}
