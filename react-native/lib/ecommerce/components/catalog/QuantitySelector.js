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
exports.QuantitySelector = QuantitySelector;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const button_1 = require("../ui/button");
const input_1 = require("../ui/input");
function QuantitySelector({ qty, onChange, min = 1, max, style, }) {
    const safeQty = Number.isFinite(qty) ? Math.max(min, Math.floor(qty)) : min;
    const canDec = safeQty > min;
    const canInc = typeof max === 'number' ? safeQty < max : true;
    return (<react_native_1.View style={[styles.container, style]}>
      <button_1.Button size="sm" variant="outline" onPress={() => onChange(Math.max(min, safeQty - 1))} disabled={!canDec}>
        -
      </button_1.Button>
      <input_1.Input keyboardType="numeric" value={String(safeQty)} onChangeText={(text) => {
            const next = Math.floor(Number(text));
            if (!Number.isFinite(next))
                return;
            const clamped = Math.max(min, typeof max === 'number' ? Math.min(max, next) : next);
            onChange(clamped);
        }} style={styles.input}/>
      <button_1.Button size="sm" variant="outline" onPress={() => onChange(safeQty + 1)} disabled={!canInc}>
        +
      </button_1.Button>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        height: 40,
        width: 64,
        textAlign: 'center',
    },
});
//# sourceMappingURL=QuantitySelector.js.map