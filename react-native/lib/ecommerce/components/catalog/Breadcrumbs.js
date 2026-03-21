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
exports.Breadcrumbs = Breadcrumbs;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
function Breadcrumbs({ items, style }) {
    return (<react_native_1.View style={[styles.container, style]} accessibilityLabel="Breadcrumb">
      {items.map((it, idx) => (<react_native_1.View key={`${it.label}-${idx}`} style={styles.item}>
          {it.onPress ? (<react_native_1.TouchableOpacity onPress={it.onPress}>
              <react_native_1.Text style={styles.link}>{it.label}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : (<react_native_1.Text style={styles.current}>{it.label}</react_native_1.Text>)}
          {idx < items.length - 1 ? (<react_native_1.Text style={styles.separator} accessibilityElementsHidden>
              ·
            </react_native_1.Text>) : null}
        </react_native_1.View>))}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    link: {
        fontSize: 12,
        color: '#525252',
        textDecorationLine: 'underline',
    },
    current: {
        fontSize: 12,
        color: '#171717',
        fontWeight: '500',
    },
    separator: {
        fontSize: 12,
        color: '#737373',
    },
});
//# sourceMappingURL=Breadcrumbs.js.map