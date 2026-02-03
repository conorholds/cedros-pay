import * as React from 'react';
import {
  View,
  Text,
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

interface CartSidebarProps {
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

export function CartSidebar({
  trigger,
  side = 'right',
  open,
  onOpenChange,
  onCheckout,
  preferredTab,
  style,
  chatComponent,
}: CartSidebarProps) {
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
              <Text style={styles.chatDescription}>
                Get help finding a product or ask us any questions. We're both your shopping assistant and support chat.
              </Text>
              <View style={styles.chatContent}>
                {chatComponent}
              </View>
            </View>
          ) : (
            <CartPanel onCheckout={handleCheckout} style={styles.cartPanel} />
          )}
        </View>
      </SheetContent>
    </Sheet>
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
    marginTop: 12,
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  chatDescription: {
    fontSize: 14,
    color: '#525252',
  },
  chatContent: {
    flex: 1,
    marginTop: 12,
  },
  cartPanel: {
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
  },
});
