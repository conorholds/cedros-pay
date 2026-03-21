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
exports.ReceiptTemplate = ReceiptTemplate;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const money_1 = require("../utils/money");
const context_1 = require("../config/context");
const button_1 = require("../components/ui/button");
const badge_1 = require("../components/ui/badge");
const card_1 = require("../components/ui/card");
function sourceLabel(source) {
    switch (source) {
        case 'x402':
            return 'Crypto (x402)';
        case 'credits':
            return 'Credits';
        case 'stripe':
            return 'Card';
        default:
            return 'Payment';
    }
}
function ReceiptTemplate({ order, source, purchaseId, customerEmail, customerName, style, onBack, onPrint, }) {
    const { config } = (0, context_1.useCedrosShop)();
    // Use props or fall back to order fields
    const resolvedSource = source ?? order.source;
    const resolvedPurchaseId = purchaseId ?? order.purchaseId;
    const resolvedEmail = customerEmail ?? order.customerEmail;
    const resolvedName = customerName ?? order.customerName;
    const brandName = config.brand?.name ?? 'Store';
    const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = new Date(order.createdAt).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    });
    return (<react_native_1.View style={[styles.container, style]}>
      {/* Header */}
      <react_native_1.View style={styles.header}>
        <react_native_1.View style={styles.headerContent}>
          {onBack ? (<button_1.Button variant="ghost" size="sm" onPress={onBack}>
              ← Back
            </button_1.Button>) : (<react_native_1.View />)}
          {onPrint && (<button_1.Button variant="outline" size="sm" onPress={onPrint}>
              🖨️ Print Receipt
            </button_1.Button>)}
        </react_native_1.View>
      </react_native_1.View>

      {/* Receipt Content */}
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <card_1.Card style={styles.receiptCard}>
          <card_1.CardContent style={styles.receiptContent}>
            {/* Brand Header */}
            <react_native_1.View style={styles.brandHeader}>
              <react_native_1.View style={styles.brandInfo}>
                <react_native_1.Text style={styles.brandName}>{brandName}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={styles.receiptInfo}>
                <react_native_1.Text style={styles.receiptLabel}>Receipt</react_native_1.Text>
                <react_native_1.Text style={styles.receiptId}>{order.id}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>

            <react_native_1.View style={styles.divider}/>

            {/* Order Meta */}
            <react_native_1.View style={styles.metaRow}>
              <react_native_1.View style={styles.metaItem}>
                <react_native_1.Text style={styles.metaLabel}>Date</react_native_1.Text>
                <react_native_1.Text style={styles.metaValue}>{formattedDate}</react_native_1.Text>
                <react_native_1.Text style={styles.metaSubtext}>{formattedTime}</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={styles.metaItem}>
                <react_native_1.Text style={styles.metaLabel}>Payment Method</react_native_1.Text>
                <react_native_1.Text style={styles.metaValue}>
                  {sourceLabel(resolvedSource)}
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={styles.metaItem}>
                <react_native_1.Text style={styles.metaLabel}>Status</react_native_1.Text>
                <react_native_1.View style={styles.badgeContainer}>
                  <badge_1.Badge variant="outline">
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </badge_1.Badge>
                </react_native_1.View>
              </react_native_1.View>
            </react_native_1.View>

            {/* Customer Info */}
            {(resolvedName || resolvedEmail) && (<>
                <react_native_1.View style={styles.divider}/>
                <react_native_1.View style={styles.customerSection}>
                  <react_native_1.Text style={styles.metaLabel}>Customer</react_native_1.Text>
                  {resolvedName && (<react_native_1.Text style={styles.customerName}>{resolvedName}</react_native_1.Text>)}
                  {resolvedEmail && (<react_native_1.Text style={styles.customerEmail}>{resolvedEmail}</react_native_1.Text>)}
                </react_native_1.View>
              </>)}

            {/* Line Items */}
            <react_native_1.View style={styles.divider}/>
            <react_native_1.View style={styles.itemsSection}>
              <react_native_1.View style={styles.tableHeader}>
                <react_native_1.Text style={[styles.tableHeaderText, { flex: 1 }]}>Item</react_native_1.Text>
                <react_native_1.Text style={[styles.tableHeaderText, { width: 50, textAlign: 'center' }]}>Qty</react_native_1.Text>
                <react_native_1.Text style={[styles.tableHeaderText, { width: 80, textAlign: 'right' }]}>Price</react_native_1.Text>
              </react_native_1.View>
              {order.items.map((item, idx) => (<react_native_1.View key={`${item.title}-${idx}`} style={styles.tableRow}>
                  <react_native_1.Text style={[styles.itemTitle, { flex: 1 }]} numberOfLines={2}>
                    {item.title}
                  </react_native_1.Text>
                  <react_native_1.Text style={[styles.itemQty, { width: 50, textAlign: 'center' }]}>
                    {item.qty}
                  </react_native_1.Text>
                  <react_native_1.Text style={[styles.itemPrice, { width: 80, textAlign: 'right' }]}>
                    {(0, money_1.formatMoney)({ amount: item.unitPrice * item.qty, currency: item.currency })}
                  </react_native_1.Text>
                </react_native_1.View>))}
            </react_native_1.View>

            {/* Totals */}
            <react_native_1.View style={styles.divider}/>
            <react_native_1.View style={styles.totalsSection}>
              <react_native_1.View style={styles.totalRow}>
                <react_native_1.Text style={styles.totalLabel}>Subtotal</react_native_1.Text>
                <react_native_1.Text style={styles.totalValue}>
                  {(0, money_1.formatMoney)({ amount: order.total, currency: order.currency })}
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={[styles.totalRow, styles.grandTotal]}>
                <react_native_1.Text style={styles.grandTotalLabel}>Total</react_native_1.Text>
                <react_native_1.Text style={styles.grandTotalValue}>
                  {(0, money_1.formatMoney)({ amount: order.total, currency: order.currency })}
                </react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>

            {/* Transaction ID */}
            {resolvedPurchaseId && (<>
                <react_native_1.View style={styles.divider}/>
                <react_native_1.View style={styles.transactionSection}>
                  <react_native_1.Text style={styles.metaLabel}>Transaction ID</react_native_1.Text>
                  <react_native_1.Text style={styles.transactionId} numberOfLines={2}>
                    {resolvedPurchaseId}
                  </react_native_1.Text>
                </react_native_1.View>
              </>)}

            {/* Footer */}
            <react_native_1.View style={styles.divider}/>
            <react_native_1.View style={styles.footer}>
              <react_native_1.Text style={styles.thankYou}>Thank you for your purchase!</react_native_1.Text>
              <react_native_1.Text style={styles.supportText}>
                If you have any questions, please contact support.
              </react_native_1.Text>
            </react_native_1.View>
          </card_1.CardContent>
        </card_1.Card>
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
        backgroundColor: '#ffffff',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxWidth: 672,
        alignSelf: 'center',
        width: '100%',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 24,
    },
    receiptCard: {
        borderRadius: 12,
        maxWidth: 672,
        alignSelf: 'center',
        width: '100%',
    },
    receiptContent: {
        padding: 20,
    },
    brandHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 16,
    },
    brandInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    brandName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#171717',
    },
    receiptInfo: {
        alignItems: 'flex-end',
    },
    receiptLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#737373',
    },
    receiptId: {
        fontSize: 14,
        fontFamily: 'monospace',
        color: '#525252',
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e5e5',
        marginVertical: 16,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    metaItem: {
        flex: 1,
        minWidth: 100,
    },
    metaLabel: {
        fontSize: 14,
        color: '#737373',
    },
    metaValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#171717',
        marginTop: 4,
    },
    metaSubtext: {
        fontSize: 13,
        color: '#a3a3a3',
        marginTop: 2,
    },
    badgeContainer: {
        marginTop: 4,
    },
    customerSection: {
        marginTop: 4,
    },
    customerName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#171717',
        marginTop: 4,
    },
    customerEmail: {
        fontSize: 14,
        color: '#737373',
        marginTop: 2,
    },
    itemsSection: {
        marginTop: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    tableHeaderText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#737373',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
    itemQty: {
        fontSize: 14,
        color: '#737373',
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
    totalsSection: {
        marginTop: 4,
        alignItems: 'flex-end',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 160,
        marginBottom: 6,
    },
    totalLabel: {
        fontSize: 14,
        color: '#737373',
    },
    totalValue: {
        fontSize: 14,
        color: '#171717',
    },
    grandTotal: {
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
        paddingTop: 8,
        marginTop: 6,
    },
    grandTotalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#171717',
    },
    grandTotalValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#171717',
    },
    transactionSection: {
        marginTop: 4,
    },
    transactionId: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#737373',
        marginTop: 4,
    },
    footer: {
        marginTop: 8,
        alignItems: 'center',
    },
    thankYou: {
        fontSize: 14,
        color: '#171717',
    },
    supportText: {
        fontSize: 12,
        color: '#a3a3a3',
        marginTop: 4,
    },
});
//# sourceMappingURL=ReceiptTemplate.js.map