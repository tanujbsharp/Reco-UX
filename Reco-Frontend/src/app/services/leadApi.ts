import { apiFetch } from './api';

export async function createHandoff(data: { session_id: number; product_id: number; discussion_note?: string }) {
  const res = await apiFetch('/api/handoff/', { method: 'POST', body: JSON.stringify(data) });
  return res.json();
}

export async function getPendingHandoffs() {
  const res = await apiFetch('/api/handoff/pending');
  return res.json();
}

export async function shareEmail(data: { session_id: number; recipient_email: string }) {
  const res = await apiFetch('/api/share/email', { method: 'POST', body: JSON.stringify(data) });
  return res.json();
}
