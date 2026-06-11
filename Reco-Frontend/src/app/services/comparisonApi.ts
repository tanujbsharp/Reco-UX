import { apiFetch } from './api';

export async function compareProducts(
  productId1: number,
  productId2: number,
  sessionId?: number | null,
) {
  const body: Record<string, unknown> = {
    product_id_1: productId1,
    product_id_2: productId2,
  };
  if (sessionId) {
    body.session_id = sessionId;
  }
  const res = await apiFetch('/api/comparisons/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}
