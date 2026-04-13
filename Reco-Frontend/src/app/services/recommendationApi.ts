import { apiFetch, readJsonResponse } from './api';

export async function getRecommendations(sessionId: number) {
  const res = await apiFetch(`/api/sessions/${sessionId}/recommendations`);
  return readJsonResponse(res);
}

export async function regenerateRecommendations(sessionId: number, data: Record<string, unknown>) {
  const res = await apiFetch(`/api/sessions/${sessionId}/recommendations/regenerate/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return readJsonResponse(res);
}
