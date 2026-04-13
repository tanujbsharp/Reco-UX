import { apiFetch, readJsonResponse } from './api';

export async function askQuestion(question: string, productIds: number[], sessionId: number) {
  const res = await apiFetch('/api/chat/ask', {
    method: 'POST',
    body: JSON.stringify({ question, product_ids: productIds, session_id: sessionId }),
  });
  return readJsonResponse<{ answer: string; sources?: Array<Record<string, unknown>> }>(res);
}

export async function getChatHistory(sessionId: number) {
  const res = await apiFetch(`/api/sessions/${sessionId}/chat/`);
  return readJsonResponse(res);
}
