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
exports.PromoBanner = PromoBanner;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
function PromoBanner({ text, actionLabel, onAction, variant = 'promo', style, }) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'info':
                return {
                    backgroundColor: '#eff6ff',
                    borderColor: '#bfdbfe',
                    textColor: '#1d4ed8',
                };
            case 'warning':
                return {
                    backgroundColor: '#fef3c7',
                    borderColor: '#fde68a',
                    textColor: '#b45309',
                };
            case 'success':
                return {
                    backgroundColor: '#dcfce7',
                    borderColor: '#bbf7d0',
                    textColor: '#15803d',
                };
            case 'promo':
            default:
                return {
                    backgroundColor: '#171717',
                    borderColor: '#171717',
                    textColor: '#ffffff',
                };
        }
    };
    const variantStyles = getVariantStyles();
    return (<react_native_1.View style={[
            styles.container,
            {
                backgroundColor: variantStyles.backgroundColor,
                borderColor: variantStyles.borderColor,
            },
            style,
        ]}>
      <react_native_1.Text style={[styles.text, { color: variantStyles.textColor }]}>
        {text}
      </react_native_1.Text>
      {actionLabel && onAction && (<react_native_1.TouchableOpacity onPress={onAction}>
          <react_native_1.Text style={[styles.action, { color: variantStyles.textColor }]}>
            {actionLabel} →
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>)}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        gap: 8,
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
    },
    action: {
        fontSize: 13,
        fontWeight: '600',
    },
});
//# sourceMappingURL=PromoBanner.js.map