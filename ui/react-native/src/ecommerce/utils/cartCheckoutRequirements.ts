import type { CartItem } from '../types';

export type RequirementLevel = 'none' | 'optional' | 'required';

export type CheckoutRequirements = {
  email: RequirementLevel;
  name: RequirementLevel;
  phone: RequirementLevel;
  shippingAddress: boolean;
  billingAddress: boolean;
  fulfillmentNotes?: string;
  isDigitalOnly: boolean;
  hasPhysical: boolean;
};

type ProductCheckoutRequirements = {
  email?: RequirementLevel;
  name?: RequirementLevel;
  phone?: RequirementLevel;
  shippingAddress?: boolean;
  billingAddress?: boolean;
};

const LEVEL_RANK: Record<RequirementLevel, number> = { none: 0, optional: 1, required: 2 };

function maxLevel(a: RequirementLevel, b: RequirementLevel): RequirementLevel {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}

function safeParseRequirements(raw?: string): ProductCheckoutRequirements | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return null;
    return v as ProductCheckoutRequirements;
  } catch {
    return null;
  }
}

export function getCartCheckoutRequirements(
  items: CartItem[],
  base: {
    requireEmail: boolean;
    defaultMode: 'none' | 'minimal' | 'shipping' | 'full';
    allowShipping: boolean;
  }
): CheckoutRequirements {
  let hasDigital = false;
  let hasPhysical = false;

  const notes = new Set<string>();

  // Start from current UI defaults.
  let email: RequirementLevel = base.requireEmail ? 'required' : 'none';
  let name: RequirementLevel = base.defaultMode === 'none' ? 'none' : 'optional';
  let phone: RequirementLevel = base.defaultMode === 'full' ? 'optional' : 'none';
  let shippingAddress = base.allowShipping && (base.defaultMode === 'shipping' || base.defaultMode === 'full');
  let billingAddress = base.defaultMode === 'full';

  for (const it of items) {
    const profile = it.metadata?.shippingProfile;
    if (profile === 'digital') {
      hasDigital = true;
    } else {
      // Default to physical when missing/unknown.
      hasPhysical = true;
    }

    const req = safeParseRequirements(it.metadata?.checkoutRequirements);
    if (req) {
      if (req.email) email = maxLevel(email, req.email);
      if (req.name) name = maxLevel(name, req.name);
      if (req.phone) phone = maxLevel(phone, req.phone);
      if (typeof req.shippingAddress === 'boolean') shippingAddress = shippingAddress || req.shippingAddress;
      if (typeof req.billingAddress === 'boolean') billingAddress = billingAddress || req.billingAddress;
    }

    const n = it.metadata?.fulfillmentNotes;
    if (n) notes.add(n);
  }

  const isDigitalOnly = hasDigital && !hasPhysical;

  // If cart is digital-only, we never collect shipping.
  if (isDigitalOnly) {
    shippingAddress = false;
  }

  return {
    email,
    name,
    phone,
    shippingAddress,
    billingAddress,
    fulfillmentNotes: Array.from(notes).join(' '),
    isDigitalOnly,
    hasPhysical,
  };
}
