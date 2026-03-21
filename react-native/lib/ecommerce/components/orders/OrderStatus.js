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
exports.OrderStatus = OrderStatus;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const badge_1 = require("../ui/badge");
function getStatusConfig(status) {
    switch (status) {
        case 'created':
            return { variant: 'secondary', label: 'Created', color: '#737373' };
        case 'paid':
            return { variant: 'default', label: 'Paid', color: '#171717' };
        case 'processing':
            return { variant: 'secondary', label: 'Processing', color: '#737373' };
        case 'fulfilled':
            return { variant: 'outline', label: 'Fulfilled', color: '#525252' };
        case 'shipped':
            return { variant: 'default', label: 'Shipped', color: '#171717' };
        case 'delivered':
            return { variant: 'outline', label: 'Delivered', color: '#525252' };
        case 'cancelled':
            return { variant: 'outline', label: 'Cancelled', color: '#dc2626' };
        case 'refunded':
            return { variant: 'outline', label: 'Refunded', color: '#525252' };
        default:
            return { variant: 'secondary', label: status, color: '#737373' };
    }
}
function OrderStatus({ status, showBadge = true, showLabel = false, style }) {
    const config = getStatusConfig(status);
    const capitalizedLabel = status.charAt(0).toUpperCase() + status.slice(1);
    return (<react_native_1.View style={[styles.container, style]}>
      {showBadge && (<badge_1.Badge variant={config.variant}>
          {capitalizedLabel}
        </badge_1.Badge>)}
      {showLabel && !showBadge && (<react_native_1.Text style={[styles.label, { color: config.color }]}>
          {capitalizedLabel}
        </react_native_1.Text>)}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
});
//# sourceMappingURL=OrderStatus.js.map