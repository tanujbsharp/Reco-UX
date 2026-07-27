import { apiFetch, readJsonResponse } from './api';

export async function getProduct(productId: number) {
  const res = await apiFetch(`/api/products/${productId}`);
  return readJsonResponse(res);
}

export async function getPacket(packetId: number) {
  const res = await apiFetch(`/api/packets/${packetId}`);
  return readJsonResponse(res);
}

export async function searchProducts(query: string) {
  const res = await apiFetch(`/api/products/?q=${encodeURIComponent(query)}`);
  return readJsonResponse(res);
}

/**
 * Score any catalog product against the session's answers. Returns the same
 * record shape as a recommendation, including personalized implications.
 */
export async function getProductFit(sessionId: number, productId: number) {
  const res = await apiFetch(`/api/sessions/${sessionId}/product-fit/${productId}`);
  return readJsonResponse(res);
}
