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
exports.ReceiptView = ReceiptView;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const money_1 = require("../../utils/money");
const card_1 = require("../ui/card");
const button_1 = require("../ui/button");
const separator_1 = require("../ui/separator");
function ReceiptView({ order, storeName = 'Store', onDownload, style }) {
    const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = new Date(order.createdAt).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    });
    const handleOpenUrl = (url) => {
        react_native_1.Linking.openURL(url).catch(() => {
            // Silently fail
        });
    };
    return (<card_1.Card style={[styles.card, style]}>
      <card_1.CardContent style={styles.content}>
        <react_native_1.ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <react_native_1.View style={styles.header}>
            <react_native_1.Text style={styles.storeName}>{storeName}</react_native_1.Text>
            <react_native_1.Text style={styles.receiptTitle}>Receipt</react_native_1.Text>
          </react_native_1.View>

          <react_native_1.Text style={styles.orderId}>Order #{order.id}</react_native_1.Text>

          <separator_1.Separator style={styles.separator}/>

          {/* Date & Status */}
          <react_native_1.View style={styles.metaRow}>
            <react_native_1.View style={styles.metaItem}>
              <react_native_1.Text style={styles.metaLabel}>Date</react_native_1.Text>
              <react_native_1.Text style={styles.metaValue}>{formattedDate}</react_native_1.Text>
              <react_native_1.Text style={styles.metaSubtext}>{formattedTime}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={styles.metaItem}>
              <react_native_1.Text style={styles.metaLabel}>Status</react_native_1.Text>
              <react_native_1.Text style={styles.metaValue}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          <separator_1.Separator style={styles.separator}/>

          {/* Items */}
          <react_native_1.View style={styles.itemsSection}>
            <react_native_1.Text style={styles.sectionTitle}>Items</react_native_1.Text>
            {order.items.map((item, idx) => (<react_native_1.View key={`${item.title}-${idx}`} style={styles.itemRow}>
                <react_native_1.View style={styles.itemInfo}>
                  <react_native_1.Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </react_native_1.Text>
                  <react_native_1.Text style={styles.itemQty}>Qty: {item.qty}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text style={styles.itemPrice}>
                  {(0, money_1.formatMoney)({ amount: item.unitPrice * item.qty, currency: item.currency })}
                </react_native_1.Text>
              </react_native_1.View>))}
          </react_native_1.View>

          <separator_1.Separator style={styles.separator}/>

          {/* Total */}
          <react_native_1.View style={styles.totalRow}>
            <react_native_1.Text style={styles.totalLabel}>Total</react_native_1.Text>
            <react_native_1.Text style={styles.totalAmount}>
              {(0, money_1.formatMoney)({ amount: order.total, currency: order.currency })}
            </react_native_1.Text>
          </react_native_1.View>

          {/* Payment Info */}
          {order.source && (<react_native_1.View style={styles.paymentInfo}>
              <react_native_1.Text style={styles.paymentLabel}>
                Paid via {order.source === 'stripe' ? 'Card' : order.source === 'x402' ? 'Crypto' : 'Credits'}
              </react_native_1.Text>
              {order.purchaseId && (<react_native_1.Text style={styles.purchaseId} numberOfLines={1}>
                  Transaction ID: {order.purchaseId}
                </react_native_1.Text>)}
            </react_native_1.View>)}

          {/* Footer */}
          <react_native_1.View style={styles.footer}>
            <react_native_1.Text style={styles.thankYou}>Thank you for your purchase!</react_native_1.Text>
            <react_native_1.Text style={styles.supportText}>If you have any questions, please contact support.</react_native_1.Text>
          </react_native_1.View>

          {/* Actions */}
          <react_native_1.View style={styles.actions}>
            {order.receiptUrl && (<button_1.Button variant="outline" onPress={() => handleOpenUrl(order.receiptUrl)}>
                View Online
              </button_1.Button>)}
            {onDownload && (<button_1.Button onPress={onDownload}>
                Download PDF
              </button_1.Button>)}
          </react_native_1.View>
        </react_native_1.ScrollView>
      </card_1.CardContent>
    </card_1.Card>);
}
const styles = react_native_1.StyleSheet.create({
    card: {
        width: '100%',
    },
    content: {
        padding: 0,
    },
    scrollView: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    storeName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#171717',
    },
    receiptTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#737373',
    },
    orderId: {
        fontSize: 14,
        fontFamily: 'monospace',
        color: '#525252',
        marginBottom: 16,
    },
    separator: {
        marginVertical: 12,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 24,
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 12,
        color: '#737373',
        marginBottom: 4,
    },
    metaValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
    metaSubtext: {
        fontSize: 12,
        color: '#a3a3a3',
        marginTop: 2,
    },
    itemsSection: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
        marginBottom: 12,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 14,
        color: '#171717',
        lineHeight: 20,
    },
    itemQty: {
        fontSize: 12,
        color: '#737373',
        marginTop: 2,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#171717',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#171717',
    },
    paymentInfo: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    paymentLabel: {
        fontSize: 12,
        color: '#737373',
    },
    purchaseId: {
        fontSize: 11,
        color: '#a3a3a3',
        marginTop: 4,
        fontFamily: 'monospace',
    },
    footer: {
        marginTop: 24,
        alignItems: 'center',
    },
    thankYou: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
    supportText: {
        fontSize: 12,
        color: '#737373',
        marginTop: 4,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 24,
        marginBottom: 8,
    },
});
//# sourceMappingURL=ReceiptView.js.map