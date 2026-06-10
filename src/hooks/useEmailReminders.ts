import { useEffect } from 'react';
import { useProjectStore, curProject } from '../store/useProjectStore';
import { useAuthStore } from '../store/useAuthStore';
import { sendReminderEmail } from '../lib/emailService';
import { parseISO, differenceInDays } from 'date-fns';

export function useEmailReminders() {
  const tasks = useProjectStore(s => curProject(s)?.tasks ?? []);
  const projectName = useProjectStore(s => curProject(s)?.name ?? '');
  const users = useAuthStore(s => s.users);

  useEffect(() => {
    const reminded = JSON.parse(localStorage.getItem('reminded-tasks') ?? '{}') as Record<string, string>;
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = new Date();
    let changed = false;

    tasks.forEach(task => {
      if (!task.endDate || task.status === 'done') return;
      const daysLeft = differenceInDays(parseISO(task.endDate), today);
      if (daysLeft < 0 || daysLeft > 3) return;

      task.assigneeIds.forEach(userId => {
        const key = `${task.id}-${userId}`;
        if (reminded[key] === todayStr) return;
        const user = users.find(u => u.id === userId);
        if (!user) return;
        sendReminderEmail({ toEmail: user.email, toName: user.name, taskTitle: task.title, daysLeft, projectName });
        reminded[key] = todayStr;
        changed = true;
      });
    });

    if (changed) localStorage.setItem('reminded-tasks', JSON.stringify(reminded));
  }, []); // run once on mount
}
