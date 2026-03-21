/**
 * Hook to monitor cart item hold expiry and trigger notifications
 */
import * as React from 'react';
/**
 * Monitors cart item holds and reports expiry events
 */
export function useHoldExpiry({ items, onExpiry, enabled = true, }) {
    const [expiredItems, setExpiredItems] = React.useState([]);
    const [expiringItems, setExpiringItems] = React.useState([]);
    const notifiedRef = React.useRef(new Set());
    // Get items with holds
    const itemsWithHolds = React.useMemo(() => {
        if (!enabled)
            return [];
        return items.filter((item) => item.holdId && item.holdExpiresAt);
    }, [items, enabled]);
    // Check for expired and expiring holds
    React.useEffect(() => {
        if (!enabled || itemsWithHolds.length === 0) {
            setExpiredItems([]);
            setExpiringItems([]);
            return;
        }
        const checkExpiry = () => {
            const now = Date.now();
            const twoMinutesMs = 2 * 60 * 1000;
            const newExpired = [];
            const newExpiring = [];
            for (const item of itemsWithHolds) {
                if (!item.holdExpiresAt)
                    continue;
                const expiresAt = new Date(item.holdExpiresAt);
                const remainingMs = expiresAt.getTime() - now;
                const key = `${item.productId}::${item.variantId ?? ''}`;
                if (remainingMs <= 0) {
                    // Hold has expired
                    newExpired.push({ productId: item.productId, variantId: item.variantId });
                    // Notify once
                    if (!notifiedRef.current.has(key)) {
                        notifiedRef.current.add(key);
                        onExpiry?.({
                            productId: item.productId,
                            variantId: item.variantId,
                            title: item.titleSnapshot,
                            expiredAt: expiresAt,
                        });
                    }
                }
                else if (remainingMs <= twoMinutesMs) {
                    // Hold is about to expire
                    newExpiring.push({
                        productId: item.productId,
                        variantId: item.variantId,
                        expiresAt,
                        remainingMs,
                    });
                }
            }
            setExpiredItems(newExpired);
            setExpiringItems(newExpiring);
        };
        // Initial check
        checkExpiry();
        // Check every 10 seconds
        const interval = setInterval(checkExpiry, 10000);
        return () => clearInterval(interval);
    }, [enabled, itemsWithHolds, onExpiry]);
    // Clean up notified set when items change
    React.useEffect(() => {
        const currentKeys = new Set(itemsWithHolds.map((i) => `${i.productId}::${i.variantId ?? ''}`));
        for (const key of notifiedRef.current) {
            if (!currentKeys.has(key)) {
                notifiedRef.current.delete(key);
            }
        }
    }, [itemsWithHolds]);
    return { expiringItems, expiredItems };
}
//# sourceMappingURL=useHoldExpiry.js.map