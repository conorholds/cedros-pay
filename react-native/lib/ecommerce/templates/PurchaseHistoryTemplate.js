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
exports.PurchaseHistoryTemplate = PurchaseHistoryTemplate;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const useOrders_1 = require("../hooks/useOrders");
const EmptyState_1 = require("../components/general/EmptyState");
const ErrorState_1 = require("../components/general/ErrorState");
const skeleton_1 = require("../components/ui/skeleton");
const OrderDetails_1 = require("../components/orders/OrderDetails");
const OrderList_1 = require("../components/orders/OrderList");
function PurchaseHistoryTemplate({ style, isSignedIn = true, onLogin, }) {
    const { orders, isLoading, error } = (0, useOrders_1.useOrders)();
    const [selected, setSelected] = React.useState(null);
    if (!isSignedIn) {
        return (<react_native_1.View style={[styles.container, styles.centered, style]}>
        <react_native_1.View style={styles.maxWidth}>
          <EmptyState_1.EmptyState title="Sign in to view your orders" description="Your purchase history will appear here once you're logged in." actionLabel={onLogin ? 'Sign in' : undefined} onAction={onLogin}/>
        </react_native_1.View>
      </react_native_1.View>);
    }
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <react_native_1.View style={styles.header}>
          <react_native_1.View>
            <react_native_1.Text style={styles.title}>Orders</react_native_1.Text>
            <react_native_1.Text style={styles.subtitle}>
              View past purchases and receipts.
            </react_native_1.Text>
          </react_native_1.View>

          {!isLoading && !error && !selected && orders.length > 0 ? (<react_native_1.Text style={styles.orderCount}>
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </react_native_1.Text>) : null}
        </react_native_1.View>

        {error ? (<react_native_1.View style={styles.stateContainer}>
            <ErrorState_1.ErrorState description={error}/>
          </react_native_1.View>) : null}
        
        {isLoading ? (<react_native_1.View style={styles.skeletonContainer}>
            <skeleton_1.Skeleton style={styles.skeleton}/>
            <skeleton_1.Skeleton style={styles.skeleton}/>
            <skeleton_1.Skeleton style={styles.skeleton}/>
          </react_native_1.View>) : orders.length === 0 ? (<react_native_1.View style={styles.stateContainer}>
            <EmptyState_1.EmptyState title="No orders yet" description="When you purchase something, it will show up here."/>
          </react_native_1.View>) : selected ? (<react_native_1.View style={styles.stateContainer}>
            <OrderDetails_1.OrderDetails order={selected} onBack={() => setSelected(null)}/>
          </react_native_1.View>) : (<react_native_1.View style={styles.stateContainer}>
            <OrderList_1.OrderList orders={orders} onView={setSelected}/>
          </react_native_1.View>)}
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    maxWidth: {
        width: '100%',
        maxWidth: 448,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 32,
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: '#171717',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#737373',
        marginTop: 8,
    },
    orderCount: {
        fontSize: 14,
        color: '#737373',
    },
    stateContainer: {
        marginTop: 8,
    },
    skeletonContainer: {
        gap: 12,
        marginTop: 8,
    },
    skeleton: {
        height: 128,
        borderRadius: 12,
    },
});
//# sourceMappingURL=PurchaseHistoryTemplate.js.map