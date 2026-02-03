import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useCedrosShop } from '../../config/context';
import { useCart } from '../../state/cart/CartProvider';
import { CartPanel } from './CartPanel';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetClose, SheetTrigger } from '../ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

type SheetSide = 'top' | 'bottom' | 'left' | 'right' | 'popup';

interface CartDrawerProps {
  trigger?: React.ReactNode;
  side?: SheetSide;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCheckout: () => void;
  preferredTab?: 'cart' | 'chat';
  style?: ViewStyle;
  /** Optional chat component to render in chat tab */
  chatComponent?: React.ReactNode;
}

export function CartDrawer({
  trigger,
  side = 'right',
  open,
  onOpenChange,
  onCheckout,
  preferredTab,
  style,
  chatComponent,
}: CartDrawerProps) {
  // Hooks are required by React Native rules of hooks, even if not directly used
  useCedrosShop();
  useCart();
  const [activeTab, setActiveTab] = React.useState<'cart' | 'chat'>(preferredTab ?? 'cart');

  React.useEffect(() => {
    if (!open) return;
    setActiveTab(preferredTab ?? 'cart');
  }, [open, preferredTab]);

  const handleCheckout = () => {
    onCheckout();
    onOpenChange?.(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <SheetTrigger>
          {trigger}
        </SheetTrigger>
      )}
      <SheetContent side={side} style={[styles.sheetContent, style]}>
        <SheetHeader style={styles.sheetHeader}>
          <View style={styles.headerRow}>
            <View style={styles.tabsContainer}>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as 'cart' | 'chat')}
              >
                <TabsList style={styles.tabsList}>
                  <TabsTrigger value="cart" style={styles.tabTrigger}>
                    Cart
                  </TabsTrigger>
                  <TabsTrigger value="chat" style={styles.tabTrigger}>
                    Chat
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </View>
            <SheetClose>
              <Button variant="ghost" size="sm" style={styles.closeButton}>
                ✕
              </Button>
            </SheetClose>
          </View>
        </SheetHeader>

        <View style={styles.content}>
          {activeTab === 'chat' && chatComponent ? (
            <View style={styles.chatContainer}>
              {chatComponent}
            </View>
          ) : (
            <CartPanel onCheckout={handleCheckout} style={styles.cartPanel} />
          )}
        </View>
      </SheetContent>
    </Sheet>
  );
}

// Simple mini cart component that shows item count and subtotal
interface MiniCartProps {
  onPress?: () => void;
  style?: ViewStyle;
}

export function MiniCart({ onPress, style }: MiniCartProps) {
  const { config } = useCedrosShop();
  const cart = useCart();

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.miniCartContainer, style]}
    >
      <View style={styles.miniCartRow}>
        <Text style={styles.miniCartIcon}>🛒</Text>
        <Text style={styles.miniCartCount}>{cart.count}</Text>
      </View>
      <Text style={styles.miniCartTotal}>
        {new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: config.currency,
        }).format(cart.subtotal)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    padding: 0,
  },
  sheetHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabsContainer: {
    flex: 1,
  },
  tabsList: {
    alignSelf: 'flex-start',
  },
  tabTrigger: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  closeButton: {
    width: 36,
    height: 36,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  cartPanel: {
    borderWidth: 0,
    borderRadius: 0,
  },

  // MiniCart styles
  miniCartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171717',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  miniCartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniCartIcon: {
    fontSize: 18,
  },
  miniCartCount: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  miniCartTotal: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
