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
exports.OrderDetails = OrderDetails;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const money_1 = require("../../utils/money");
const button_1 = require("../ui/button");
const badge_1 = require("../ui/badge");
const card_1 = require("../ui/card");
const separator_1 = require("../ui/separator");
function statusColor(status) {
    switch (status) {
        case 'paid':
            return 'default';
        case 'processing':
            return 'secondary';
        case 'fulfilled':
            return 'outline';
        case 'cancelled':
            return 'outline';
        case 'refunded':
            return 'outline';
        default:
            return 'secondary';
    }
}
function OrderDetails({ order, onBack, style }) {
    const createdLabel = new Date(order.createdAt).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
    const statusLabel = order.status.charAt(0).toUpperCase() + order.status.slice(1);
    const handleOpenLink = (url) => {
        react_native_1.Linking.openURL(url).catch(() => {
            // Silently fail if URL can't be opened
        });
    };
    return (<card_1.Card style={[styles.card, style]}>
      <card_1.CardContent style={styles.content}>
        <react_native_1.View style={styles.header}>
          <react_native_1.View style={styles.orderInfo}>
            <react_native_1.View style={styles.orderTitle}>
              <react_native_1.Text style={styles.label}>Order</react_native_1.Text>
              <react_native_1.Text style={styles.orderId} numberOfLines={1}>
                {order.id}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={styles.metaRow}>
              <react_native_1.Text style={styles.date}>{createdLabel}</react_native_1.Text>
              <react_native_1.Text style={styles.bullet}>•</react_native_1.Text>
              <react_native_1.Text style={styles.status}>{statusLabel}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.View style={styles.actions}>
            <badge_1.Badge variant={statusColor(order.status)}>
              {statusLabel}
            </badge_1.Badge>
            {onBack ? (<button_1.Button variant="outline" size="sm" onPress={onBack}>
                Back
              </button_1.Button>) : null}
          </react_native_1.View>
        </react_native_1.View>

        <separator_1.Separator style={styles.separator}/>

        <react_native_1.View style={styles.itemsList}>
          {order.items.map((it, idx) => (<react_native_1.View key={`${it.title}-${idx}`} style={styles.itemRow}>
              <react_native_1.View style={styles.itemInfo}>
                <react_native_1.Text style={styles.itemTitle} numberOfLines={1}>
                  {it.title}
                </react_native_1.Text>
                <react_native_1.Text style={styles.itemQty}>Qty {it.qty}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={styles.itemPrice}>
                {(0, money_1.formatMoney)({ amount: it.unitPrice * it.qty, currency: it.currency })}
              </react_native_1.Text>
            </react_native_1.View>))}
        </react_native_1.View>

        <separator_1.Separator style={styles.separator}/>

        <react_native_1.View style={styles.totalRow}>
          <react_native_1.Text style={styles.totalLabel}>Total</react_native_1.Text>
          <react_native_1.Text style={styles.totalAmount}>
            {(0, money_1.formatMoney)({ amount: order.total, currency: order.currency })}
          </react_native_1.Text>
        </react_native_1.View>

        {(order.receiptUrl || order.invoiceUrl) ? (<react_native_1.View style={styles.linksRow}>
            {order.receiptUrl ? (<button_1.Button variant="ghost" size="sm" onPress={() => handleOpenLink(order.receiptUrl)}>
                Receipt
              </button_1.Button>) : null}
            {order.invoiceUrl ? (<button_1.Button variant="ghost" size="sm" onPress={() => handleOpenLink(order.invoiceUrl)}>
                Invoice
              </button_1.Button>) : null}
          </react_native_1.View>) : null}
      </card_1.CardContent>
    </card_1.Card>);
}
const styles = react_native_1.StyleSheet.create({
    card: {
        width: '100%',
    },
    content: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    orderInfo: {
        flex: 1,
        marginRight: 12,
    },
    orderTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
    },
    orderId: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'monospace',
        color: '#525252',
        flexShrink: 1,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    date: {
        fontSize: 12,
        color: '#737373',
    },
    bullet: {
        fontSize: 12,
        color: '#d4d4d4',
    },
    status: {
        fontSize: 12,
        color: '#737373',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    separator: {
        marginVertical: 16,
    },
    itemsList: {
        gap: 12,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 14,
        color: '#171717',
    },
    itemQty: {
        fontSize: 12,
        color: '#737373',
        marginTop: 2,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
        textAlign: 'right',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        color: '#737373',
    },
    totalAmount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
    },
    linksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
    },
});
//# sourceMappingURL=OrderDetails.js.map