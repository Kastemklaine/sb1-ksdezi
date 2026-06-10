import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '';
const TEMPLATES = {
  welcome:    import.meta.env.VITE_EMAILJS_TEMPLATE_WELCOME ?? '',
  assignment: import.meta.env.VITE_EMAILJS_TEMPLATE_ASSIGNMENT ?? '',
  password:   import.meta.env.VITE_EMAILJS_TEMPLATE_PASSWORD ?? '',
  twoFaReset: import.meta.env.VITE_EMAILJS_TEMPLATE_2FA_RESET ?? '',
  reminder:   import.meta.env.VITE_EMAILJS_TEMPLATE_REMINDER ?? '',
};
const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin;

const isConfigured = () => SERVICE_ID && PUBLIC_KEY;

const send = async (templateId: string, params: Record<string, string>) => {
  if (!isConfigured() || !templateId) {
    // Dev mode: log instead of sending
    console.info('[EmailJS] Not configured — would send:', templateId, params);
    return;
  }
  try {
    await emailjs.send(SERVICE_ID, templateId, params, PUBLIC_KEY);
  } catch (err) {
    console.error('[EmailJS] Send error:', err);
  }
};

export const sendWelcomeEmail = (params: {
  toEmail: string;
  toName: string;
  password: string;
  role: string;
  projectName: string;
}) =>
  send(TEMPLATES.welcome, {
    to_email:    params.toEmail,
    to_name:     params.toName,
    password:    params.password,
    role:        params.role,
    project_name: params.projectName,
    app_url:     APP_URL,
  });

export const sendAssignmentEmail = (params: {
  toEmail: string;
  toName: string;
  workstreamName: string;
  projectName: string;
}) =>
  send(TEMPLATES.assignment, {
    to_email:        params.toEmail,
    to_name:         params.toName,
    workstream_name: params.workstreamName,
    project_name:    params.projectName,
    app_url:         APP_URL,
  });

export const sendPasswordChangedEmail = (params: {
  toEmail: string;
  toName: string;
}) =>
  send(TEMPLATES.password, {
    to_email: params.toEmail,
    to_name:  params.toName,
    app_url:  APP_URL,
  });

export const sendTwoFaResetEmail = (params: {
  toEmail: string;
  toName: string;
}) =>
  send(TEMPLATES.twoFaReset, {
    to_email: params.toEmail,
    to_name:  params.toName,
    app_url:  APP_URL,
  });

export const sendReminderEmail = (params: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  daysLeft: number;
  projectName: string;
}) =>
  send(TEMPLATES.reminder, {
    to_email:     params.toEmail,
    to_name:      params.toName,
    task_title:   params.taskTitle,
    days_left:    String(params.daysLeft),
    project_name: params.projectName,
    app_url:      APP_URL,
  });
