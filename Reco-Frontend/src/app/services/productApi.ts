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
  const res = await apiFetch(`/api/products/search/?q=${encodeURIComponent(query)}`);
  return readJsonResponse(res);
}
