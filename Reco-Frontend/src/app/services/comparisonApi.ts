import { apiFetch } from './api';

export async function compareProducts(productId1: number, productId2: number) {
  const res = await apiFetch('/api/comparisons/', {
    method: 'POST',
    body: JSON.stringify({ product_id_1: productId1, product_id_2: productId2 }),
  });
  return res.json();
}
