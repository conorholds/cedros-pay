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
exports.Pagination = Pagination;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
function Pagination({ page, pageSize, total, hasNextPage, onPageChange, style, }) {
    const canGoPrev = page > 1;
    const canGoNext = hasNextPage ?? (total ? page * pageSize < total : false);
    const startItem = total && total > 0 ? (page - 1) * pageSize + 1 : 0;
    const endItem = total ? Math.min(page * pageSize, total) : page * pageSize;
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.View style={styles.info}>
        {total !== undefined && total > 0 ? (<react_native_1.Text style={styles.infoText}>
            Showing {startItem}-{endItem} of {total}
          </react_native_1.Text>) : null}
      </react_native_1.View>

      <react_native_1.View style={styles.controls}>
        <react_native_1.TouchableOpacity style={[styles.button, !canGoPrev && styles.buttonDisabled]} onPress={() => onPageChange(page - 1)} disabled={!canGoPrev}>
          <react_native_1.Text style={[styles.buttonText, !canGoPrev && styles.buttonTextDisabled]}>
            Previous
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>

        <react_native_1.View style={styles.pageIndicator}>
          <react_native_1.Text style={styles.pageText}>Page {page}</react_native_1.Text>
        </react_native_1.View>

        <react_native_1.TouchableOpacity style={[styles.button, !canGoNext && styles.buttonDisabled]} onPress={() => onPageChange(page + 1)} disabled={!canGoNext}>
          <react_native_1.Text style={[styles.buttonText, !canGoNext && styles.buttonTextDisabled]}>
            Next
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    info: {
        alignItems: 'center',
    },
    infoText: {
        fontSize: 14,
        color: '#737373',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#171717',
    },
    buttonDisabled: {
        backgroundColor: '#e5e5e5',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ffffff',
    },
    buttonTextDisabled: {
        color: '#a3a3a3',
    },
    pageIndicator: {
        paddingHorizontal: 12,
    },
    pageText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
});
//# sourceMappingURL=Pagination.js.map