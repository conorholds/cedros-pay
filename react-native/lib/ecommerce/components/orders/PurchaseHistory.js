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
exports.PurchaseHistory = PurchaseHistory;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const money_1 = require("../../utils/money");
const card_1 = require("../ui/card");
const OrderStatus_1 = require("./OrderStatus");
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
function PurchaseHistory({ orders, onSelectOrder, style }) {
    // Group orders by month/year
    const groupedOrders = React.useMemo(() => {
        const groups = {};
        orders.forEach((order) => {
            const date = new Date(order.createdAt);
            const key = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(order);
        });
        return groups;
    }, [orders]);
    const sortedGroups = React.useMemo(() => {
        return Object.entries(groupedOrders).sort((a, b) => {
            // Sort by date descending
            const dateA = new Date(a[1][0].createdAt);
            const dateB = new Date(b[1][0].createdAt);
            return dateB.getTime() - dateA.getTime();
        });
    }, [groupedOrders]);
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.ScrollView showsVerticalScrollIndicator={false}>
        {sortedGroups.map(([monthKey, monthOrders]) => (<react_native_1.View key={monthKey} style={styles.monthGroup}>
            <react_native_1.Text style={styles.monthHeader}>{monthKey}</react_native_1.Text>
            <react_native_1.View style={styles.ordersList}>
              {monthOrders.map((order) => (<card_1.Card key={order.id} style={styles.orderCard}>
                  <card_1.CardContent style={styles.orderContent}>
                    <react_native_1.View style={styles.orderHeader}>
                      <react_native_1.View style={styles.orderInfo}>
                        <react_native_1.Text style={styles.orderId}>#{order.id.slice(-8)}</react_native_1.Text>
                        <react_native_1.Text style={styles.orderDate}>{formatDate(order.createdAt)}</react_native_1.Text>
                      </react_native_1.View>
                      <OrderStatus_1.OrderStatus status={order.status}/>
                    </react_native_1.View>

                    <react_native_1.View style={styles.itemsPreview}>
                      <react_native_1.Text style={styles.itemsText} numberOfLines={1}>
                        {order.items.map((item) => item.title).join(', ')}
                      </react_native_1.Text>
                    </react_native_1.View>

                    <react_native_1.View style={styles.orderFooter}>
                      <react_native_1.Text style={styles.itemsCount}>
                        {order.items.length} item{order.items.length === 1 ? '' : 's'}
                      </react_native_1.Text>
                      <react_native_1.Text style={styles.orderTotal}>
                        {(0, money_1.formatMoney)({ amount: order.total, currency: order.currency })}
                      </react_native_1.Text>
                    </react_native_1.View>

                    {onSelectOrder && (<react_native_1.View style={styles.actionRow}>
                        <react_native_1.Text style={styles.viewDetails} onPress={() => onSelectOrder(order)}>
                          View Details →
                        </react_native_1.Text>
                      </react_native_1.View>)}
                  </card_1.CardContent>
                </card_1.Card>))}
            </react_native_1.View>
          </react_native_1.View>))}
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    monthGroup: {
        marginBottom: 24,
    },
    monthHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: '#171717',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    ordersList: {
        gap: 10,
    },
    orderCard: {
        width: '100%',
    },
    orderContent: {
        padding: 16,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    orderInfo: {
        flex: 1,
        marginRight: 8,
    },
    orderId: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'monospace',
        color: '#171717',
    },
    orderDate: {
        fontSize: 12,
        color: '#737373',
        marginTop: 2,
    },
    itemsPreview: {
        marginBottom: 8,
    },
    itemsText: {
        fontSize: 13,
        color: '#525252',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemsCount: {
        fontSize: 12,
        color: '#737373',
    },
    orderTotal: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
    },
    actionRow: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
    },
    viewDetails: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
});
//# sourceMappingURL=PurchaseHistory.js.map