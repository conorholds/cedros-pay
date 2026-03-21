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
exports.Badge = Badge;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const getVariantStyles = (variant) => {
    switch (variant) {
        case 'default':
            return {
                backgroundColor: '#171717',
                borderColor: 'transparent',
            };
        case 'secondary':
            return {
                backgroundColor: '#f5f5f5',
                borderColor: 'transparent',
            };
        case 'outline':
            return {
                backgroundColor: 'transparent',
                borderColor: '#e5e5e5',
            };
        default:
            return {};
    }
};
const getTextColor = (variant) => {
    switch (variant) {
        case 'default':
            return '#ffffff';
        case 'secondary':
        case 'outline':
        default:
            return '#171717';
    }
};
function Badge({ children, variant = 'secondary', style, textStyle, ...props }) {
    const variantStyles = getVariantStyles(variant);
    const textColor = getTextColor(variant);
    return (<react_native_1.View style={[styles.badge, variantStyles, style]} {...props}>
      <react_native_1.Text style={[styles.text, { color: textColor }, textStyle]}>{children}</react_native_1.Text>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 9999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 2,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 12,
        fontWeight: '500',
    },
});
//# sourceMappingURL=badge.js.map