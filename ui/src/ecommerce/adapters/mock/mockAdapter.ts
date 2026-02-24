import type {
  CommerceAdapter,
  CheckoutSessionPayload,
  CheckoutSessionResult,
  ProductListParams,
  SubscriptionStatus,
  SubscriptionTier,
} from '../CommerceAdapter';
import type { CartSnapshot, Category, ListResult, Order, Product } from '../../types';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const demoCategories: Category[] = [
  {
    id: 'cat_all',
    slug: 'all',
    name: 'All Products',
    description: 'Everything in the catalog.',
  },
  {
    id: 'cat_apparel',
    slug: 'apparel',
    name: 'Apparel',
    description: 'Soft goods and daily wear.',
  },
  {
    id: 'cat_accessories',
    slug: 'accessories',
    name: 'Accessories',
    description: 'Carry, attach, decorate.',
  },
];

const demoProducts: Product[] = [
  {
    id: 'p_tee',
    slug: 'cedros-tee',
    title: 'Cedros Tee',
    description: 'A heavyweight tee with a clean silhouette.',
    images: [
      { url: 'https://picsum.photos/seed/cedros-tee/900/900', alt: 'Cedros Tee' },
      { url: 'https://picsum.photos/seed/cedros-tee-2/900/900', alt: 'Cedros Tee detail' },
    ],
    price: 38,
    currency: 'USD',
    tags: ['new', 'cotton'],
    categoryIds: ['cat_apparel'],
    compareAtPrice: 48,
    inventoryStatus: 'in_stock',
    variants: [
      { id: 'v_tee_s', title: 'Small / Black', options: { Size: 'S', Color: 'Black' } },
      { id: 'v_tee_m', title: 'Medium / Black', options: { Size: 'M', Color: 'Black' } },
      { id: 'v_tee_l', title: 'Large / Black', options: { Size: 'L', Color: 'Black' } },
    ],
    shippingProfile: 'physical',
  },
  {
    id: 'p_crewneck',
    slug: 'cedros-crewneck',
    title: 'Cedros Crewneck',
    description: 'Midweight fleece with a relaxed fit and embroidered mark.',
    images: [{ url: 'https://picsum.photos/seed/cedros-crewneck/900/900', alt: 'Cedros Crewneck' }],
    price: 64,
    currency: 'USD',
    tags: ['fleece', 'core'],
    categoryIds: ['cat_apparel'],
    inventoryStatus: 'in_stock',
    compareAtPrice: 78,
    variants: [
      { id: 'v_crew_s', title: 'Small / Heather', options: { Size: 'S', Color: 'Heather' } },
      { id: 'v_crew_m', title: 'Medium / Heather', options: { Size: 'M', Color: 'Heather' } },
      { id: 'v_crew_l', title: 'Large / Heather', options: { Size: 'L', Color: 'Heather' } },
    ],
    shippingProfile: 'physical',
  },
  {
    id: 'p_hoodie',
    slug: 'cedros-hoodie',
    title: 'Cedros Hoodie',
    description: 'Pullover hoodie with soft interior and structured hood.',
    images: [
      { url: 'https://picsum.photos/seed/cedros-hoodie/900/900', alt: 'Cedros Hoodie' },
      { url: 'https://picsum.photos/seed/cedros-hoodie-2/900/900', alt: 'Cedros Hoodie detail' },
    ],
    price: 74,
    currency: 'USD',
    tags: ['fleece', 'new'],
    categoryIds: ['cat_apparel'],
    inventoryStatus: 'low',
    variants: [
      { id: 'v_hoodie_s', title: 'Small / Black', options: { Size: 'S', Color: 'Black' } },
      { id: 'v_hoodie_m', title: 'Medium / Black', options: { Size: 'M', Color: 'Black' } },
      { id: 'v_hoodie_l', title: 'Large / Black', options: { Size: 'L', Color: 'Black' } },
    ],
    shippingProfile: 'physical',
  },
  {
    id: 'p_cap',
    slug: 'cedros-cap',
    title: 'Cedros Cap',
    description: 'Unstructured cap with adjustable strap and curved brim.',
    images: [{ url: 'https://picsum.photos/seed/cedros-cap/900/900', alt: 'Cedros Cap' }],
    price: 28,
    currency: 'USD',
    tags: ['core'],
    categoryIds: ['cat_apparel'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_socks',
    slug: 'cedros-socks',
    title: 'Cedros Socks',
    description: 'Rib-knit socks designed for everyday comfort.',
    images: [{ url: 'https://picsum.photos/seed/cedros-socks/900/900', alt: 'Cedros Socks' }],
    price: 14,
    currency: 'USD',
    tags: ['cotton'],
    categoryIds: ['cat_apparel'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_tote',
    slug: 'cedros-tote',
    title: 'Cedros Tote',
    description: 'Heavy canvas tote with reinforced handles.',
    images: [{ url: 'https://picsum.photos/seed/cedros-tote/900/900', alt: 'Cedros Tote' }],
    price: 32,
    currency: 'USD',
    tags: ['gift', 'canvas'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_stickers',
    slug: 'cedros-sticker-pack',
    title: 'Sticker Pack',
    description: 'Five durable vinyl stickers for laptops and water bottles.',
    images: [{ url: 'https://picsum.photos/seed/cedros-stickers/900/900', alt: 'Sticker Pack' }],
    price: 8,
    currency: 'USD',
    tags: ['gift'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_keychain',
    slug: 'cedros-keychain',
    title: 'Enamel Keychain',
    description: 'Polished enamel keychain with a subtle mark.',
    images: [{ url: 'https://picsum.photos/seed/cedros-keychain/900/900', alt: 'Enamel Keychain' }],
    price: 12,
    currency: 'USD',
    tags: ['gift'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'low',
    shippingProfile: 'physical',
  },
  {
    id: 'p_lanyard',
    slug: 'cedros-lanyard',
    title: 'Woven Lanyard',
    description: 'Soft woven lanyard with swivel clasp.',
    images: [{ url: 'https://picsum.photos/seed/cedros-lanyard/900/900', alt: 'Woven Lanyard' }],
    price: 10,
    currency: 'USD',
    tags: ['core'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_notebook',
    slug: 'cedros-notebook',
    title: 'Dot Grid Notebook',
    description: 'Lay-flat notebook for sketches, notes, and plans.',
    images: [{ url: 'https://picsum.photos/seed/cedros-notebook/900/900', alt: 'Dot Grid Notebook' }],
    price: 18,
    currency: 'USD',
    tags: ['gift'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_waterbottle',
    slug: 'cedros-water-bottle',
    title: 'Insulated Bottle',
    description: 'Vacuum-insulated bottle that keeps drinks cold for hours.',
    images: [{ url: 'https://picsum.photos/seed/cedros-bottle/900/900', alt: 'Insulated Bottle' }],
    price: 36,
    currency: 'USD',
    tags: ['gift', 'new'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'backorder',
    shippingProfile: 'physical',
  },
  {
    id: 'p_posters',
    slug: 'cedros-poster-set',
    title: 'Poster Set',
    description: 'Two prints on thick matte stock.',
    images: [{ url: 'https://picsum.photos/seed/cedros-posters/900/900', alt: 'Poster Set' }],
    price: 24,
    currency: 'USD',
    tags: ['gift', 'limited'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'out_of_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_pins',
    slug: 'cedros-pin-set',
    title: 'Pin Set',
    description: 'Two enamel pins with rubber backings.',
    images: [{ url: 'https://picsum.photos/seed/cedros-pins/900/900', alt: 'Pin Set' }],
    price: 16,
    currency: 'USD',
    tags: ['gift'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_brandbook',
    slug: 'cedros-brand-book',
    title: 'Brand Book (PDF)',
    description: 'A compact brand book: typography, color, layout, and voice.',
    images: [{ url: 'https://picsum.photos/seed/cedros-brandbook/900/900', alt: 'Brand Book cover' }],
    price: 19,
    currency: 'USD',
    tags: ['digital'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'digital',
    checkoutRequirements: { email: 'optional', name: 'none', phone: 'none', shippingAddress: false, billingAddress: false },
    fulfillment: {
      type: 'digital_download',
      notes: 'This is a digital product and will be downloadable from your account after purchase.',
    },
  },
  {
    id: 'p_wallpaper',
    slug: 'cedros-wallpaper-pack',
    title: 'Wallpaper Pack',
    description: 'A set of desktop + mobile wallpapers in multiple colorways.',
    images: [{ url: 'https://picsum.photos/seed/cedros-wallpaper/900/900', alt: 'Wallpaper Pack' }],
    price: 6,
    currency: 'USD',
    tags: ['digital', 'new'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'digital',
  },
  {
    id: 'p_longsleeve',
    slug: 'cedros-long-sleeve',
    title: 'Long Sleeve Tee',
    description: 'Soft long sleeve tee with rib cuff and relaxed drape.',
    images: [{ url: 'https://picsum.photos/seed/cedros-longsleeve/900/900', alt: 'Long Sleeve Tee' }],
    price: 44,
    currency: 'USD',
    tags: ['cotton'],
    categoryIds: ['cat_apparel'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_shorts',
    slug: 'cedros-shorts',
    title: 'Everyday Shorts',
    description: 'Lightweight shorts with a comfortable waistband.',
    images: [{ url: 'https://picsum.photos/seed/cedros-shorts/900/900', alt: 'Everyday Shorts' }],
    price: 40,
    currency: 'USD',
    tags: ['new'],
    categoryIds: ['cat_apparel'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'physical',
  },
  {
    id: 'p_beanie',
    slug: 'cedros-beanie',
    title: 'Rib Beanie',
    description: 'Warm rib beanie with a clean folded cuff.',
    images: [{ url: 'https://picsum.photos/seed/cedros-beanie/900/900', alt: 'Rib Beanie' }],
    price: 20,
    currency: 'USD',
    tags: ['core'],
    categoryIds: ['cat_apparel'],
    inventoryStatus: 'low',
    shippingProfile: 'physical',
  },
  {
    id: 'p_jacket',
    slug: 'cedros-coach-jacket',
    title: 'Coach Jacket',
    description: 'Lightweight jacket with snap front and subtle sheen.',
    images: [{ url: 'https://picsum.photos/seed/cedros-jacket/900/900', alt: 'Coach Jacket' }],
    price: 96,
    currency: 'USD',
    tags: ['limited'],
    categoryIds: ['cat_apparel'],
    inventoryStatus: 'backorder',
    shippingProfile: 'physical',
  },
  {
    id: 'p_mug',
    slug: 'cedros-mug',
    title: 'Cedros Mug',
    description: 'Stoneware mug with a satin glaze.',
    images: [{ url: 'https://picsum.photos/seed/cedros-mug/900/900', alt: 'Cedros Mug' }],
    price: 22,
    currency: 'USD',
    tags: ['gift'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'low',
    shippingProfile: 'physical',
  },
  {
    id: 'p_guide',
    slug: 'cedros-field-guide',
    title: 'Field Guide (Digital)',
    description: 'A short digital guide to shipping delightful checkout flows.',
    images: [{ url: 'https://picsum.photos/seed/cedros-guide/900/900', alt: 'Field Guide cover' }],
    price: 12,
    currency: 'USD',
    tags: ['digital'],
    categoryIds: ['cat_accessories'],
    inventoryStatus: 'in_stock',
    shippingProfile: 'digital',
  },
];

function filterProducts(products: Product[], params: ProductListParams) {
  let out = products;
  if (params.category && params.category !== 'all') {
    const cat = demoCategories.find((c) => c.slug === params.category || c.id === params.category);
    if (cat) out = out.filter((p) => p.categoryIds.includes(cat.id));
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    out = out.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }

  const filters = params.filters ?? {};
  const tags = filters.tags;
  if (Array.isArray(tags) && tags.length > 0) {
    const set = new Set(tags.map(String));
    out = out.filter((p) => p.tags?.some((t) => set.has(t)));
  }

  const priceMin = typeof filters.priceMin === 'number' ? filters.priceMin : undefined;
  const priceMax = typeof filters.priceMax === 'number' ? filters.priceMax : undefined;
  if (typeof priceMin === 'number') out = out.filter((p) => p.price >= priceMin);
  if (typeof priceMax === 'number') out = out.filter((p) => p.price <= priceMax);

  const inStock = typeof filters.inStock === 'boolean' ? filters.inStock : undefined;
  if (inStock === true) {
    out = out.filter((p) => p.inventoryStatus !== 'out_of_stock');
  }

  return out;
}

function sortProducts(products: Product[], sort?: string) {
  if (!sort || sort === 'featured') return products;
  const out = [...products];
  if (sort === 'price_asc') out.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') out.sort((a, b) => b.price - a.price);
  return out;
}

function paginate<T>(items: T[], page: number, pageSize: number): ListResult<T> {
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page,
    pageSize,
    total: items.length,
    hasNextPage: start + pageSize < items.length,
  };
}

function buildOrderFromCheckout(payload: CheckoutSessionPayload): Order {
  const now = new Date().toISOString();
  const items = payload.cart.map((li) => {
    const product = demoProducts.find((p) => p.id === li.resource || p.slug === li.resource) ?? demoProducts[0];
    return {
      title: product.title,
      qty: li.quantity,
      unitPrice: product.price,
      currency: payload.options.currency,
      imageUrl: product.images[0]?.url,
    };
  });
  const total = items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
  return {
    id: `ord_${Math.random().toString(16).slice(2)}`,
    createdAt: now,
    status: 'paid',
    total,
    currency: payload.options.currency,
    items,
    receiptUrl: payload.options.successUrl,
  };
}

export function createMockCommerceAdapter(): CommerceAdapter {
  let demoOrders: Order[] = [];
  const demoServerCarts: Record<string, CartSnapshot> = {};

  return {
    async listProducts(params) {
      await sleep(150);
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 24;
      const filtered = filterProducts(demoProducts, params);
      const sorted = sortProducts(filtered, params.sort);
      return paginate(sorted, page, pageSize);
    },
    async getProductBySlug(slug) {
      await sleep(100);
      return demoProducts.find((p) => p.slug === slug) ?? null;
    },
    async listCategories() {
      await sleep(80);
      return demoCategories;
    },
    async getOrderHistory() {
      await sleep(120);
      return demoOrders;
    },
    async getCart({ customerId }) {
      await sleep(80);
      return demoServerCarts[customerId] ?? { items: [] };
    },
    async mergeCart({ customerId, cart }) {
      await sleep(120);
      const existing = demoServerCarts[customerId] ?? { items: [] };

      const map = new Map<string, CartSnapshot['items'][number]>();
      const put = (it: CartSnapshot['items'][number]) => {
        const key = `${it.productId}::${it.variantId ?? ''}`;
        const prev = map.get(key);
        if (prev) map.set(key, { ...prev, qty: prev.qty + it.qty });
        else map.set(key, it);
      };
      for (const it of existing.items) put(it);
      for (const it of cart.items) put(it);

      const merged: CartSnapshot = {
        items: Array.from(map.values()),
        promoCode: cart.promoCode ?? existing.promoCode,
      };
      demoServerCarts[customerId] = merged;
      return merged;
    },
    async updateCart({ customerId, cart }) {
      await sleep(60);
      demoServerCarts[customerId] = cart;
    },
    async createCheckoutSession(payload: CheckoutSessionPayload): Promise<CheckoutSessionResult> {
      await sleep(250);

      // Demo behavior: create a local order and redirect to successUrl when present.
      const order = buildOrderFromCheckout(payload);
      demoOrders = [order, ...demoOrders].slice(0, 25);

      if (payload.options.successUrl) {
        const url = new URL(payload.options.successUrl, 'http://localhost');
        url.searchParams.set('demoOrderId', order.id);
        return { kind: 'redirect', url: url.toString().replace('http://localhost', '') };
      }

      return { kind: 'custom', data: { orderId: order.id } };
    },
    async listSubscriptionTiers(): Promise<SubscriptionTier[]> {
      await sleep(80);
      return [
        {
          id: 'tier_starter',
          title: 'Starter',
          description: 'For small shops getting started.',
          priceMonthly: 19,
          priceAnnual: 190,
          currency: 'USD',
          features: ['Basic analytics', 'Email support', '1 storefront'],
        },
        {
          id: 'tier_growth',
          title: 'Growth',
          description: 'For teams iterating fast.',
          priceMonthly: 49,
          priceAnnual: 490,
          currency: 'USD',
          features: ['Advanced analytics', 'Priority support', '3 storefronts'],
          isPopular: true,
        },
        {
          id: 'tier_enterprise',
          title: 'Enterprise',
          description: 'For high volume and custom needs.',
          priceMonthly: 199,
          priceAnnual: 1990,
          currency: 'USD',
          features: ['SLA', 'Dedicated success', 'Unlimited storefronts'],
        },
      ];
    },
    async getSubscriptionStatus(): Promise<SubscriptionStatus> {
      await sleep(80);
      return { isActive: false };
    },
    async createSubscriptionCheckoutSession(payload) {
      await sleep(200);
      if (payload.successUrl) return { kind: 'redirect', url: payload.successUrl };
      return { kind: 'custom', data: payload };
    },
  };
}
