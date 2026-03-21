"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartLineItem = CartLineItem;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const money_1 = require("../../utils/money");
const button_1 = require("../ui/button");
const input_1 = require("../ui/input");
// Alert icon component for inventory warnings
function AlertIcon({ color = '#dc2626' }) {
    return (<react_native_1.View style={[styles.alertIcon, { borderColor: color }]}>
      <react_native_1.Text style={[styles.alertIconText, { color }]}>!</react_native_1.Text>
    </react_native_1.View>);
}
// Trash icon component for remove action
function TrashIcon({ color = '#dc2626' }) {
    return (<react_native_1.Text style={[styles.trashIcon, { color }]}>🗑</react_native_1.Text>);
}
function CartLineItem({ item, onRemove, onSetQty, variant = 'table', style, inventory, }) {
    const lineTotal = item.unitPrice * item.qty;
    const [isConfirmingRemove, setIsConfirmingRemove] = React.useState(false);
    // Compute max quantity based on inventory
    const maxQty = React.useMemo(() => {
        if (!inventory?.availableQty)
            return undefined;
        return inventory.availableQty;
    }, [inventory?.availableQty]);
    // Disable increasing quantity if out of stock or at max
    const canIncreaseQty = !inventory?.isOutOfStock && (maxQty === undefined || item.qty < maxQty);
    // Determine if we should show an inventory warning
    const inventoryWarning = React.useMemo(() => {
        if (!inventory)
            return null;
        if (inventory.isOutOfStock) {
            return { type: 'error', message: inventory.message || 'Out of stock', color: '#dc2626' };
        }
        if (inventory.exceedsAvailable) {
            return { type: 'warning', message: inventory.message || 'Quantity exceeds available stock', color: '#d97706' };
        }
        if (inventory.isLowStock) {
            return { type: 'info', message: inventory.message || 'Low stock', color: '#2563eb' };
        }
        return null;
    }, [inventory]);
    React.useEffect(() => {
        if (!isConfirmingRemove)
            return;
        if (item.qty === 1)
            return;
        setIsConfirmingRemove(false);
    }, [isConfirmingRemove, item.qty]);
    // Compact variant (used in cart drawer/panel)
    if (variant === 'compact') {
        return (<react_native_1.View style={[styles.compactContainer, style]}>
        {/* Product Image */}
        <react_native_1.View style={styles.compactImageContainer}>
          {item.imageSnapshot ? (<react_native_1.Image source={{ uri: item.imageSnapshot }} style={styles.compactImage} resizeMode="cover"/>) : (<react_native_1.View style={styles.compactImagePlaceholder}/>)}
        </react_native_1.View>

        {/* Content */}
        <react_native_1.View style={styles.compactContent}>
          <react_native_1.View style={styles.compactRow}>
            {/* Title and Price */}
            <react_native_1.View style={styles.compactTextContainer}>
              <react_native_1.Text style={styles.compactTitle} numberOfLines={1}>
                {item.titleSnapshot}
              </react_native_1.Text>
              <react_native_1.Text style={styles.compactPrice}>
                {(0, money_1.formatMoney)({ amount: lineTotal, currency: item.currency })}
              </react_native_1.Text>
              {inventoryWarning && (<react_native_1.View style={styles.inventoryWarningRow}>
                  <AlertIcon color={inventoryWarning.color}/>
                  <react_native_1.Text style={[styles.inventoryWarningText, { color: inventoryWarning.color }]}>
                    {inventoryWarning.message}
                  </react_native_1.Text>
                </react_native_1.View>)}
            </react_native_1.View>

            {/* Quantity Controls or Remove Confirmation */}
            <react_native_1.View style={styles.compactControlsContainer}>
              {isConfirmingRemove ? (<react_native_1.View style={styles.removeConfirmContainer}>
                  <react_native_1.Text style={styles.removeConfirmText}>Remove item?</react_native_1.Text>
                  <react_native_1.View style={styles.removeConfirmButtons}>
                    <button_1.Button variant="outline" size="sm" onPress={() => setIsConfirmingRemove(false)} style={styles.cancelButton}>
                      Cancel
                    </button_1.Button>
                    <button_1.Button variant="destructive" size="sm" onPress={onRemove} style={styles.confirmButton}>
                      Confirm
                    </button_1.Button>
                  </react_native_1.View>
                </react_native_1.View>) : (<react_native_1.View style={styles.quantityControls}>
                  <button_1.Button size="sm" variant="outline" onPress={() => {
                    if (item.qty === 1) {
                        setIsConfirmingRemove(true);
                        return;
                    }
                    onSetQty(item.qty - 1);
                }} style={styles.qtyButton}>
                    {item.qty === 1 ? <TrashIcon /> : '-'}
                  </button_1.Button>
                  <input_1.Input keyboardType="numeric" value={String(item.qty)} onChangeText={(text) => {
                    const next = Math.floor(Number(text));
                    if (!Number.isFinite(next))
                        return;
                    const clamped = Math.max(1, maxQty ? Math.min(maxQty, next) : next);
                    onSetQty(clamped);
                }} style={styles.compactQtyInput}/>
                  <button_1.Button size="sm" variant="outline" onPress={() => onSetQty(maxQty ? Math.min(maxQty, item.qty + 1) : item.qty + 1)} disabled={!canIncreaseQty} style={styles.qtyButton}>
                    +
                  </button_1.Button>
                </react_native_1.View>)}
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>);
    }
    // Table variant (used on full cart page)
    return (<react_native_1.View style={[styles.tableContainer, style]}>
      {/* Image */}
      <react_native_1.View style={styles.tableImageContainer}>
        {item.imageSnapshot ? (<react_native_1.Image source={{ uri: item.imageSnapshot }} style={styles.tableImage} resizeMode="cover"/>) : (<react_native_1.View style={styles.tableImagePlaceholder}/>)}
      </react_native_1.View>

      {/* Item Info */}
      <react_native_1.View style={styles.tableInfoContainer}>
        <react_native_1.View style={styles.tableInfoHeader}>
          <react_native_1.Text style={styles.tableTitle} numberOfLines={1}>
            {item.titleSnapshot}
          </react_native_1.Text>
          <react_native_1.Text style={styles.tableMobileTotal}>
            {(0, money_1.formatMoney)({ amount: lineTotal, currency: item.currency })}
          </react_native_1.Text>
        </react_native_1.View>
        <react_native_1.Text style={styles.tableUnitPrice}>
          {(0, money_1.formatMoney)({ amount: item.unitPrice, currency: item.currency })} each
        </react_native_1.Text>
        {inventoryWarning && (<react_native_1.View style={styles.inventoryWarningRow}>
            <AlertIcon color={inventoryWarning.color}/>
            <react_native_1.Text style={[styles.inventoryWarningText, { color: inventoryWarning.color }]}>
              {inventoryWarning.message}
            </react_native_1.Text>
          </react_native_1.View>)}
      </react_native_1.View>

      {/* Quantity Controls */}
      <react_native_1.View style={styles.tableQtyContainer}>
        <react_native_1.View style={styles.quantityControls}>
          <button_1.Button size="sm" variant="outline" onPress={() => onSetQty(Math.max(1, item.qty - 1))} style={styles.qtyButton}>
            -
          </button_1.Button>
          <input_1.Input keyboardType="numeric" value={String(item.qty)} onChangeText={(text) => {
            const next = Math.floor(Number(text));
            if (!Number.isFinite(next))
                return;
            const clamped = Math.max(1, maxQty ? Math.min(maxQty, next) : next);
            onSetQty(clamped);
        }} style={styles.tableQtyInput}/>
          <button_1.Button size="sm" variant="outline" onPress={() => onSetQty(maxQty ? Math.min(maxQty, item.qty + 1) : item.qty + 1)} disabled={!canIncreaseQty} style={styles.qtyButton}>
            +
          </button_1.Button>
        </react_native_1.View>

        {/* Mobile Remove Button */}
        <react_native_1.TouchableOpacity onPress={onRemove} style={styles.mobileRemoveButton}>
          <react_native_1.Text style={styles.mobileRemoveText}>Remove</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {/* Desktop Total and Remove */}
      <react_native_1.View style={styles.tableTotalContainer}>
        <react_native_1.Text style={styles.tableTotal}>
          {(0, money_1.formatMoney)({ amount: lineTotal, currency: item.currency })}
        </react_native_1.Text>
        <react_native_1.TouchableOpacity onPress={onRemove} style={styles.desktopRemoveButton}>
          <react_native_1.Text style={styles.desktopRemoveText}>Remove</react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=CartLineItem.js.map