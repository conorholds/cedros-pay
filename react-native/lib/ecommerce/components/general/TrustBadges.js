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
exports.TrustBadges = TrustBadges;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
// Default icons using simple text representations
function ShieldIcon() {
    return (<react_native_1.View style={styles.iconContainer}>
      <react_native_1.Text style={styles.iconText}>🛡️</react_native_1.Text>
    </react_native_1.View>);
}
function LockIcon() {
    return (<react_native_1.View style={styles.iconContainer}>
      <react_native_1.Text style={styles.iconText}>🔒</react_native_1.Text>
    </react_native_1.View>);
}
function TruckIcon() {
    return (<react_native_1.View style={styles.iconContainer}>
      <react_native_1.Text style={styles.iconText}>🚚</react_native_1.Text>
    </react_native_1.View>);
}
function ReturnIcon() {
    return (<react_native_1.View style={styles.iconContainer}>
      <react_native_1.Text style={styles.iconText}>↩️</react_native_1.Text>
    </react_native_1.View>);
}
const defaultBadges = [
    { label: 'Secure Checkout', icon: <ShieldIcon /> },
    { label: 'SSL Encrypted', icon: <LockIcon /> },
    { label: 'Fast Shipping', icon: <TruckIcon /> },
    { label: '30-Day Returns', icon: <ReturnIcon /> },
];
function TrustBadges({ badges = defaultBadges, style }) {
    return (<react_native_1.View style={[styles.container, style]}>
      {badges.map((badge, index) => (<react_native_1.View key={index} style={styles.badge}>
          {badge.icon || <ShieldIcon />}
          <react_native_1.Text style={styles.label}>{badge.label}</react_native_1.Text>
        </react_native_1.View>))}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    iconContainer: {
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 16,
    },
    label: {
        fontSize: 12,
        color: '#737373',
    },
});
//# sourceMappingURL=TrustBadges.js.map