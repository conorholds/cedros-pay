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
exports.CartError = CartError;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const button_1 = require("../ui/button");
function CartError({ title, description, onRetry, style, }) {
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.Text style={styles.title}>{title ?? 'Something went wrong'}</react_native_1.Text>
      <react_native_1.Text style={styles.description}>{description}</react_native_1.Text>
      {onRetry ? (<react_native_1.View style={styles.actionContainer}>
          <button_1.Button variant="outline" onPress={onRetry}>
            Try again
          </button_1.Button>
        </react_native_1.View>) : null}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        padding: 24,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
    },
    description: {
        fontSize: 14,
        color: '#737373',
        marginTop: 8,
    },
    actionContainer: {
        marginTop: 16,
    },
});
//# sourceMappingURL=CartError.js.map