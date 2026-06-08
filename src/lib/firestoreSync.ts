import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import type { Project } from '../types';

// Firestore rejects undefined values — strip them via JSON round-trip
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function pushProject(project: Project): Promise<void> {
  await setDoc(doc(db, 'projects', project.id), stripUndefined(project));
}

export async function fetchProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, 'projects', projectId));
  return snap.exists() ? (snap.data() as Project) : null;
}

export function watchProject(projectId: string, onChange: (p: Project) => void): Unsubscribe {
  return onSnapshot(doc(db, 'projects', projectId), (snap) => {
    if (snap.exists()) onChange(snap.data() as Project);
  });
}
