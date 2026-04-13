import { apiFetch, readJsonResponse } from './api';

export async function createSession(data: { packet_id?: number; outlet_id?: number; discovery_mode?: string }) {
  const res = await apiFetch('/api/sessions/', { method: 'POST', body: JSON.stringify(data) });
  return readJsonResponse(res);
}

export async function getSession(sessionId: number) {
  const res = await apiFetch(`/api/sessions/${sessionId}/`);
  return readJsonResponse(res);
}

export async function updateSession(sessionId: number, data: Record<string, unknown>) {
  const res = await apiFetch(`/api/sessions/${sessionId}/`, { method: 'PATCH', body: JSON.stringify(data) });
  return readJsonResponse(res);
}
