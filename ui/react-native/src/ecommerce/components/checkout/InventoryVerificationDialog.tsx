/**
 * Dialog shown when inventory verification finds issues before checkout
 */

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type { InventoryIssue } from '../../hooks/useInventoryVerification';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface InventoryVerificationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** List of inventory issues to display */
  issues: InventoryIssue[];
  /** Callback to remove an item from cart */
  onRemoveItem: (productId: string, variantId?: string) => void;
  /** Callback to update item quantity */
  onUpdateQuantity: (productId: string, variantId: string | undefined, qty: number) => void;
  /** Callback to go back to cart page */
  onGoToCart?: () => void;
  /** Custom style */
  style?: ViewStyle;
}

export function InventoryVerificationDialog({
  open,
  onOpenChange,
  issues,
  onRemoveItem,
  onUpdateQuantity,
  onGoToCart,
  style,
}: InventoryVerificationDialogProps) {
  const hasUnavailableItems = issues.some(
    (i) => i.type === 'out_of_stock' || i.type === 'product_unavailable'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={[styles.content, style]}>
        <DialogHeader>
          <DialogTitle>
            <View style={styles.titleContainer}>
              <View style={styles.alertIcon}>
                <Text style={styles.alertIconText}>!</Text>
              </View>
              <Text style={styles.titleText}>Inventory Update</Text>
            </View>
          </DialogTitle>
          <DialogDescription>
            {hasUnavailableItems
              ? 'Some items in your cart are no longer available.'
              : 'Some items in your cart have limited availability.'}
          </DialogDescription>
        </DialogHeader>

        <View style={styles.issuesContainer}>
          {issues.map((issue) => (
            <IssueRow
              key={`${issue.productId}::${issue.variantId ?? ''}`}
              issue={issue}
              onRemove={() => onRemoveItem(issue.productId, issue.variantId)}
              onUpdateQty={(qty) => onUpdateQuantity(issue.productId, issue.variantId, qty)}
            />
          ))}
        </View>

        <DialogFooter style={styles.footer}>
          {onGoToCart ? (
            <Button
              variant="outline"
              onPress={() => {
                onOpenChange(false);
                onGoToCart();
              }}
            >
              Go to Cart
            </Button>
          ) : null}
          <Button
            onPress={() => onOpenChange(false)}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface IssueRowProps {
  issue: InventoryIssue;
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
}

function IssueRow({
  issue,
  onRemove,
  onUpdateQty,
}: IssueRowProps) {
  const isUnavailable = issue.type === 'out_of_stock' || issue.type === 'product_unavailable';

  return (
    <View style={[styles.issueRow, isUnavailable && styles.issueRowUnavailable]}>
      <View style={styles.issueContent}>
        <Text style={styles.issueTitle}>{issue.title}</Text>
        <Text
          style={[
            styles.issueMessage,
            isUnavailable ? styles.issueMessageError : styles.issueMessageWarning,
          ]}
        >
          {issue.message}
        </Text>
        {issue.type === 'insufficient_stock' && issue.availableQty > 0 ? (
          <Text style={styles.issueDetail}>
            You requested {issue.requestedQty}, but only {issue.availableQty} available
          </Text>
        ) : null}
      </View>

      <View style={styles.issueActions}>
        {issue.type === 'insufficient_stock' && issue.availableQty > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onPress={() => onUpdateQty(issue.availableQty)}
            style={styles.updateButton}
          >
            Update to {issue.availableQty}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onPress={onRemove}
          textStyle={styles.removeButtonText}
        >
          Remove
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
