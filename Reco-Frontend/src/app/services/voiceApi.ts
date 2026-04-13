import { apiFetch, API_BASE_URL, readJsonResponse } from './api';

function inferAudioExtension(audioBlob: Blob): string {
  const mimeType = audioBlob.type.toLowerCase();

  if (mimeType.includes('webm')) {
    return 'webm';
  }
  if (mimeType.includes('ogg')) {
    return 'ogg';
  }
  if (mimeType.includes('mp4') || mimeType.includes('mpeg') || mimeType.includes('aac')) {
    return 'm4a';
  }
  if (mimeType.includes('wav')) {
    return 'wav';
  }

  return 'webm';
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ transcript: string; language: string; tags: Array<{ tag: string; category: string; confidence: number }> }> {
  const formData = new FormData();
  const extension = inferAudioExtension(audioBlob);
  formData.append('audio', audioBlob, `recording.${extension}`);

  const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
  const res = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
  });
  return readJsonResponse(res);
}

export async function analyzeText(text: string): Promise<{ tags: Array<{ tag: string; category: string; confidence: number }> }> {
  const res = await apiFetch('/api/voice/analyze-text', { method: 'POST', body: JSON.stringify({ text }) });
  return readJsonResponse(res);
}
