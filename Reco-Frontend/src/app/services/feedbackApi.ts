import { apiFetch } from './api';

export async function submitFeedback(sessionId: number, rating: number) {
  const res = await apiFetch('/api/feedback/', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, rating }),
  });
  return res.json();
}
