const LEVEL_RANK = { none: 0, optional: 1, required: 2 };
function maxLevel(a, b) {
    return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
}
function safeParseRequirements(raw) {
    if (!raw)
        return null;
    try {
        const v = JSON.parse(raw);
        if (!v || typeof v !== 'object')
            return null;
        return v;
    }
    catch {
        return null;
    }
}
export function getCartCheckoutRequirements(items, base) {
    let hasDigital = false;
    let hasPhysical = false;
    const notes = new Set();
    // Start from current UI defaults.
    let email = base.requireEmail ? 'required' : 'none';
    let name = base.defaultMode === 'none' ? 'none' : 'optional';
    let phone = base.defaultMode === 'full' ? 'optional' : 'none';
    let shippingAddress = base.allowShipping && (base.defaultMode === 'shipping' || base.defaultMode === 'full');
    let billingAddress = base.defaultMode === 'full';
    for (const it of items) {
        const profile = it.metadata?.shippingProfile;
        if (profile === 'digital') {
            hasDigital = true;
        }
        else {
            // Default to physical when missing/unknown.
            hasPhysical = true;
        }
        const req = safeParseRequirements(it.metadata?.checkoutRequirements);
        if (req) {
            if (req.email)
                email = maxLevel(email, req.email);
            if (req.name)
                name = maxLevel(name, req.name);
            if (req.phone)
                phone = maxLevel(phone, req.phone);
            if (typeof req.shippingAddress === 'boolean')
                shippingAddress = shippingAddress || req.shippingAddress;
            if (typeof req.billingAddress === 'boolean')
                billingAddress = billingAddress || req.billingAddress;
        }
        const n = it.metadata?.fulfillmentNotes;
        if (n)
            notes.add(n);
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
//# sourceMappingURL=cartCheckoutRequirements.js.map