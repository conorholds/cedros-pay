import * as React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type { CartItem } from '../../types';
import type { CartItemInventory } from '../../hooks/useCartInventory';
import { formatMoney } from '../../utils/money';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

// Alert icon component for inventory warnings
function AlertIcon({ color = '#dc2626' }: { color?: string }) {
  return (
    <View style={[styles.alertIcon, { borderColor: color }]}>
      <Text style={[styles.alertIconText, { color }]}>!</Text>
    </View>
  );
}

// Trash icon component for remove action
function TrashIcon({ color = '#dc2626' }: { color?: string }) {
  return (
    <Text style={[styles.trashIcon, { color }]}>🗑</Text>
  );
}

interface CartLineItemProps {
  item: CartItem;
  onRemove: () => void;
  onSetQty: (qty: number) => void;
  variant?: 'table' | 'compact';
  style?: ViewStyle;
  /** Optional inventory info for real-time stock display */
  inventory?: CartItemInventory;
}

export function CartLineItem({
  item,
  onRemove,
  onSetQty,
  variant = 'table',
  style,
  inventory,
}: CartLineItemProps) {
  const lineTotal = item.unitPrice * item.qty;
  const [isConfirmingRemove, setIsConfirmingRemove] = React.useState(false);

  // Compute max quantity based on inventory
  const maxQty = React.useMemo(() => {
    if (!inventory?.availableQty) return undefined;
    return inventory.availableQty;
  }, [inventory?.availableQty]);

  // Disable increasing quantity if out of stock or at max
  const canIncreaseQty = !inventory?.isOutOfStock && (maxQty === undefined || item.qty < maxQty);

  // Determine if we should show an inventory warning
  const inventoryWarning = React.useMemo(() => {
    if (!inventory) return null;
    if (inventory.isOutOfStock) {
      return { type: 'error' as const, message: inventory.message || 'Out of stock', color: '#dc2626' };
    }
    if (inventory.exceedsAvailable) {
      return { type: 'warning' as const, message: inventory.message || 'Quantity exceeds available stock', color: '#d97706' };
    }
    if (inventory.isLowStock) {
      return { type: 'info' as const, message: inventory.message || 'Low stock', color: '#2563eb' };
    }
    return null;
  }, [inventory]);

  React.useEffect(() => {
    if (!isConfirmingRemove) return;
    if (item.qty === 1) return;
    setIsConfirmingRemove(false);
  }, [isConfirmingRemove, item.qty]);

  // Compact variant (used in cart drawer/panel)
  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, style]}>
        {/* Product Image */}
        <View style={styles.compactImageContainer}>
          {item.imageSnapshot ? (
            <Image
              source={{ uri: item.imageSnapshot }}
              style={styles.compactImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.compactImagePlaceholder} />
          )}
        </View>

        {/* Content */}
        <View style={styles.compactContent}>
          <View style={styles.compactRow}>
            {/* Title and Price */}
            <View style={styles.compactTextContainer}>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {item.titleSnapshot}
              </Text>
              <Text style={styles.compactPrice}>
                {formatMoney({ amount: lineTotal, currency: item.currency })}
              </Text>
              {inventoryWarning && (
                <View style={styles.inventoryWarningRow}>
                  <AlertIcon color={inventoryWarning.color} />
                  <Text style={[styles.inventoryWarningText, { color: inventoryWarning.color }]}>
                    {inventoryWarning.message}
                  </Text>
                </View>
              )}
            </View>

            {/* Quantity Controls or Remove Confirmation */}
            <View style={styles.compactControlsContainer}>
              {isConfirmingRemove ? (
                <View style={styles.removeConfirmContainer}>
                  <Text style={styles.removeConfirmText}>Remove item?</Text>
                  <View style={styles.removeConfirmButtons}>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => setIsConfirmingRemove(false)}
                      style={styles.cancelButton}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onPress={onRemove}
                      style={styles.confirmButton}
                    >
                      Confirm
                    </Button>
                  </View>
                </View>
              ) : (
                <View style={styles.quantityControls}>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      if (item.qty === 1) {
                        setIsConfirmingRemove(true);
                        return;
                      }
                      onSetQty(item.qty - 1);
                    }}
                    style={styles.qtyButton}
                  >
                    {item.qty === 1 ? <TrashIcon /> : '-'}
                  </Button>
                  <Input
                    keyboardType="numeric"
                    value={String(item.qty)}
                    onChangeText={(text: string) => {
                      const next = Math.floor(Number(text));
                      if (!Number.isFinite(next)) return;
                      const clamped = Math.max(1, maxQty ? Math.min(maxQty, next) : next);
                      onSetQty(clamped);
                    }}
                    style={styles.compactQtyInput}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => onSetQty(maxQty ? Math.min(maxQty, item.qty + 1) : item.qty + 1)}
                    disabled={!canIncreaseQty}
                    style={styles.qtyButton}
                  >
                    +
                  </Button>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Table variant (used on full cart page)
  return (
    <View style={[styles.tableContainer, style]}>
      {/* Image */}
      <View style={styles.tableImageContainer}>
        {item.imageSnapshot ? (
          <Image
            source={{ uri: item.imageSnapshot }}
            style={styles.tableImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.tableImagePlaceholder} />
        )}
      </View>

      {/* Item Info */}
      <View style={styles.tableInfoContainer}>
        <View style={styles.tableInfoHeader}>
          <Text style={styles.tableTitle} numberOfLines={1}>
            {item.titleSnapshot}
          </Text>
          <Text style={styles.tableMobileTotal}>
            {formatMoney({ amount: lineTotal, currency: item.currency })}
          </Text>
        </View>
        <Text style={styles.tableUnitPrice}>
          {formatMoney({ amount: item.unitPrice, currency: item.currency })} each
        </Text>
        {inventoryWarning && (
          <View style={styles.inventoryWarningRow}>
            <AlertIcon color={inventoryWarning.color} />
            <Text style={[styles.inventoryWarningText, { color: inventoryWarning.color }]}>
              {inventoryWarning.message}
            </Text>
          </View>
        )}
      </View>

      {/* Quantity Controls */}
      <View style={styles.tableQtyContainer}>
        <View style={styles.quantityControls}>
          <Button
            size="sm"
            variant="outline"
            onPress={() => onSetQty(Math.max(1, item.qty - 1))}
            style={styles.qtyButton}
          >
            -
          </Button>
          <Input
            keyboardType="numeric"
            value={String(item.qty)}
            onChangeText={(text: string) => {
              const next = Math.floor(Number(text));
              if (!Number.isFinite(next)) return;
              const clamped = Math.max(1, maxQty ? Math.min(maxQty, next) : next);
              onSetQty(clamped);
            }}
            style={styles.tableQtyInput}
          />
          <Button
            size="sm"
            variant="outline"
            onPress={() => onSetQty(maxQty ? Math.min(maxQty, item.qty + 1) : item.qty + 1)}
            disabled={!canIncreaseQty}
            style={styles.qtyButton}
          >
            +
          </Button>
        </View>

        {/* Mobile Remove Button */}
        <TouchableOpacity onPress={onRemove} style={styles.mobileRemoveButton}>
          <Text style={styles.mobileRemoveText}>Remove</Text>
        </TouchableOpacity>
      </View>

      {/* Desktop Total and Remove */}
      <View style={styles.tableTotalContainer}>
        <Text style={styles.tableTotal}>
          {formatMoney({ amount: lineTotal, currency: item.currency })}
        </Text>
        <TouchableOpacity onPress={onRemove} style={styles.desktopRemoveButton}>
          <Text style={styles.desktopRemoveText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Compact variant styles
  compactContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  compactImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#f5f5f5',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  compactContent: {
    flex: 1,
    minWidth: 0,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  compactTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  compactPrice: {
    fontSize: 12,
    color: '#525252',
    marginTop: 2,
  },
  compactControlsContainer: {
    width: 140,
    alignItems: 'flex-end',
  },
  removeConfirmContainer: {
    alignItems: 'center',
    gap: 8,
  },
  removeConfirmText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#525252',
    textAlign: 'center',
  },
  removeConfirmButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
  },
  confirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
  },

  // Common styles
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyButton: {
    width: 32,
    height: 32,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactQtyInput: {
    width: 44,
    height: 32,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  inventoryWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  alertIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertIconText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  inventoryWarningText: {
    fontSize: 11,
    flexShrink: 1,
  },
  trashIcon: {
    fontSize: 14,
  },

  // Table variant styles
  tableContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  tableImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#f5f5f5',
  },
  tableImage: {
    width: '100%',
    height: '100%',
  },
  tableImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  tableInfoContainer: {
    flex: 1,
    minWidth: 0,
  },
  tableInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    flex: 1,
  },
  tableMobileTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  tableUnitPrice: {
    fontSize: 12,
    color: '#525252',
    marginTop: 4,
  },
  tableQtyContainer: {
    width: 140,
    alignItems: 'center',
  },
  tableQtyInput: {
    width: 56,
    height: 36,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  mobileRemoveButton: {
    marginTop: 8,
  },
  mobileRemoveText: {
    fontSize: 12,
    color: '#dc2626',
  },
  tableTotalContainer: {
    width: 100,
    alignItems: 'center',
  },
  tableTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  desktopRemoveButton: {
    marginTop: 8,
  },
  desktopRemoveText: {
    fontSize: 12,
    color: '#dc2626',
  },
});
