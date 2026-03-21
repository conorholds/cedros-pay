"use strict";
/**
 * Dialog shown when inventory verification finds issues before checkout
 */
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
exports.InventoryVerificationDialog = InventoryVerificationDialog;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const button_1 = require("../ui/button");
const dialog_1 = require("../ui/dialog");
function InventoryVerificationDialog({ open, onOpenChange, issues, onRemoveItem, onUpdateQuantity, onGoToCart, style, }) {
    const hasUnavailableItems = issues.some((i) => i.type === 'out_of_stock' || i.type === 'product_unavailable');
    return (<dialog_1.Dialog open={open} onOpenChange={onOpenChange}>
      <dialog_1.DialogContent style={[styles.content, style]}>
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>
            <react_native_1.View style={styles.titleContainer}>
              <react_native_1.View style={styles.alertIcon}>
                <react_native_1.Text style={styles.alertIconText}>!</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.Text style={styles.titleText}>Inventory Update</react_native_1.Text>
            </react_native_1.View>
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            {hasUnavailableItems
            ? 'Some items in your cart are no longer available.'
            : 'Some items in your cart have limited availability.'}
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <react_native_1.View style={styles.issuesContainer}>
          {issues.map((issue) => (<IssueRow key={`${issue.productId}::${issue.variantId ?? ''}`} issue={issue} onRemove={() => onRemoveItem(issue.productId, issue.variantId)} onUpdateQty={(qty) => onUpdateQuantity(issue.productId, issue.variantId, qty)}/>))}
        </react_native_1.View>

        <dialog_1.DialogFooter style={styles.footer}>
          {onGoToCart ? (<button_1.Button variant="outline" onPress={() => {
                onOpenChange(false);
                onGoToCart();
            }}>
              Go to Cart
            </button_1.Button>) : null}
          <button_1.Button onPress={() => onOpenChange(false)}>
            Continue
          </button_1.Button>
        </dialog_1.DialogFooter>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
function IssueRow({ issue, onRemove, onUpdateQty, }) {
    const isUnavailable = issue.type === 'out_of_stock' || issue.type === 'product_unavailable';
    return (<react_native_1.View style={[styles.issueRow, isUnavailable && styles.issueRowUnavailable]}>
      <react_native_1.View style={styles.issueContent}>
        <react_native_1.Text style={styles.issueTitle}>{issue.title}</react_native_1.Text>
        <react_native_1.Text style={[
            styles.issueMessage,
            isUnavailable ? styles.issueMessageError : styles.issueMessageWarning,
        ]}>
          {issue.message}
        </react_native_1.Text>
        {issue.type === 'insufficient_stock' && issue.availableQty > 0 ? (<react_native_1.Text style={styles.issueDetail}>
            You requested {issue.requestedQty}, but only {issue.availableQty} available
          </react_native_1.Text>) : null}
      </react_native_1.View>

      <react_native_1.View style={styles.issueActions}>
        {issue.type === 'insufficient_stock' && issue.availableQty > 0 ? (<button_1.Button size="sm" variant="outline" onPress={() => onUpdateQty(issue.availableQty)} style={styles.updateButton}>
            Update to {issue.availableQty}
          </button_1.Button>) : null}
        <button_1.Button size="sm" variant="ghost" onPress={onRemove} textStyle={styles.removeButtonText}>
          Remove
        </button_1.Button>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    content: {
        maxWidth: 512,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    alertIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f59e0b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertIconText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
    titleText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#171717',
    },
    issuesContainer: {
        marginVertical: 16,
    },
    issueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    issueRowUnavailable: {
        borderLeftWidth: 3,
        borderLeftColor: '#dc2626',
        paddingLeft: 12,
        marginLeft: -12,
    },
    issueContent: {
        flex: 1,
        marginRight: 12,
    },
    issueTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
    issueMessage: {
        fontSize: 13,
        marginTop: 4,
    },
    issueMessageError: {
        color: '#dc2626',
    },
    issueMessageWarning: {
        color: '#d97706',
    },
    issueDetail: {
        fontSize: 12,
        color: '#737373',
        marginTop: 4,
    },
    issueActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    updateButton: {
        paddingHorizontal: 12,
    },
    removeButtonText: {
        color: '#dc2626',
    },
    footer: {
        flexDirection: 'column',
        gap: 8,
    },
});
//# sourceMappingURL=InventoryVerificationDialog.js.map