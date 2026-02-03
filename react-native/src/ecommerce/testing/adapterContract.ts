import type { CommerceAdapter } from '../adapters/CommerceAdapter';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export type AdapterContractOptions = {
  pageSize?: number;
};

/**
 * Lightweight runtime validation for a CommerceAdapter.
 *
 * This is intentionally framework-agnostic so consumers can run it in Jest/Vitest.
 */
export async function validateCommerceAdapterContract(
  adapter: CommerceAdapter,
  options: AdapterContractOptions = {}
) {
  const pageSize = options.pageSize ?? 10;

  const categories = await adapter.listCategories();
  assert(Array.isArray(categories), 'listCategories() must return an array');
  for (const c of categories) {
    assert(isNonEmptyString(c.id), 'Category.id is required');
    assert(isNonEmptyString(c.slug), 'Category.slug is required');
    assert(isNonEmptyString(c.name), 'Category.name is required');
  }

  const list = await adapter.listProducts({ page: 1, pageSize });
  assert(list && Array.isArray(list.items), 'listProducts() must return { items: Product[] }');
  assert(typeof list.page === 'number', 'listProducts().page must be a number');
  assert(typeof list.pageSize === 'number', 'listProducts().pageSize must be a number');

  if (list.items.length > 0) {
    const p = list.items[0]!;
    assert(isNonEmptyString(p.id), 'Product.id is required');
    assert(isNonEmptyString(p.slug), 'Product.slug is required');
    assert(isNonEmptyString(p.title), 'Product.title is required');
    assert(typeof p.description === 'string', 'Product.description must be a string');
    assert(Array.isArray(p.images), 'Product.images must be an array');
    assert(typeof p.price === 'number', 'Product.price must be a number');
    assert(isNonEmptyString(p.currency), 'Product.currency is required');
    assert(Array.isArray(p.tags), 'Product.tags must be an array');
    assert(Array.isArray(p.categoryIds), 'Product.categoryIds must be an array');

    const fetched = await adapter.getProductBySlug(p.slug);
    assert(fetched === null || isNonEmptyString(fetched.id), 'getProductBySlug() must return Product or null');
  }

  const orders = await adapter.getOrderHistory();
  assert(Array.isArray(orders), 'getOrderHistory() must return an array');
  for (const o of orders) {
    assert(isNonEmptyString(o.id), 'Order.id is required');
    assert(isNonEmptyString(o.createdAt), 'Order.createdAt is required');
    assert(typeof o.total === 'number', 'Order.total must be a number');
    assert(isNonEmptyString(o.currency), 'Order.currency is required');
    assert(Array.isArray(o.items), 'Order.items must be an array');
  }
}
