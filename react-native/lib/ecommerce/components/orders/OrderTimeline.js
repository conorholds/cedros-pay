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
exports.OrderTimeline = OrderTimeline;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
function getStatusLabel(status) {
    switch (status) {
        case 'created':
            return 'Order Created';
        case 'paid':
            return 'Payment Received';
        case 'processing':
            return 'Processing Order';
        case 'fulfilled':
            return 'Order Fulfilled';
        case 'shipped':
            return 'Order Shipped';
        case 'delivered':
            return 'Order Delivered';
        case 'cancelled':
            return 'Order Cancelled';
        case 'refunded':
            return 'Order Refunded';
        default:
            return status;
    }
}
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}
function OrderTimeline({ order, style }) {
    // Build timeline events from order status
    const events = [
        { date: order.createdAt, status: 'created' },
        ...(order.status !== 'created' ? [{ date: order.createdAt, status: order.status }] : []),
    ];
    return (<react_native_1.View style={[styles.container, style]}>
      {events.map((event, index) => {
            const isLast = index === events.length - 1;
            const isActive = isLast;
            return (<react_native_1.View key={`${event.status}-${index}`} style={styles.eventContainer}>
            <react_native_1.View style={styles.leftColumn}>
              <react_native_1.View style={[styles.dot, isActive && styles.activeDot]}/>
              {!isLast && <react_native_1.View style={styles.line}/>}
            </react_native_1.View>
            <react_native_1.View style={styles.content}>
              <react_native_1.Text style={[styles.statusLabel, isActive && styles.activeLabel]}>
                {getStatusLabel(event.status)}
              </react_native_1.Text>
              <react_native_1.Text style={styles.dateLabel}>{formatDate(event.date)}</react_native_1.Text>
              {event.description && (<react_native_1.Text style={styles.description}>{event.description}</react_native_1.Text>)}
            </react_native_1.View>
          </react_native_1.View>);
        })}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        paddingVertical: 8,
    },
    eventContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    leftColumn: {
        width: 24,
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#e5e5e5',
        borderWidth: 2,
        borderColor: '#d4d4d4',
    },
    activeDot: {
        backgroundColor: '#171717',
        borderColor: '#171717',
    },
    line: {
        width: 2,
        flex: 1,
        backgroundColor: '#e5e5e5',
        marginTop: 4,
    },
    content: {
        flex: 1,
        paddingLeft: 12,
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#737373',
    },
    activeLabel: {
        color: '#171717',
        fontWeight: '600',
    },
    dateLabel: {
        fontSize: 12,
        color: '#a3a3a3',
        marginTop: 2,
    },
    description: {
        fontSize: 12,
        color: '#737373',
        marginTop: 4,
    },
});
//# sourceMappingURL=OrderTimeline.js.map