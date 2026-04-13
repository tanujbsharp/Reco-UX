import { apiFetch, readJsonResponse } from './api';

/**
 * GET /api/sessions/{id}/questions/ — Get the first LLM-generated question
 */
export async function getFirstQuestion(sessionId: number) {
  const res = await apiFetch(`/api/sessions/${sessionId}/questions/`);
  return readJsonResponse(res);
}

/**
 * POST /api/sessions/{id}/answer — Submit answer, get next question or done signal
 * Returns: { question, type, options, ... } or { done: true }
 */
export async function submitAnswer(
  sessionId: number,
  data: {
    question_text: string;
    answer_value: string;
    from_voice?: boolean;
    score_effect?: Record<string, unknown> | Array<Record<string, unknown>>;
  },
) {
  const res = await apiFetch(`/api/sessions/${sessionId}/answer`, { method: 'POST', body: JSON.stringify(data) });
  return readJsonResponse(res);
}
