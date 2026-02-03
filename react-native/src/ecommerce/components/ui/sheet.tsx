import * as React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';

type SheetSide = 'top' | 'bottom' | 'left' | 'right' | 'popup';

interface SheetContextType {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

const SheetContext = React.createContext<SheetContextType | undefined>(undefined);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error('Sheet components must be used within a Sheet');
  }
  return context;
}

interface SheetProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function Sheet({ children, open, onOpenChange, defaultOpen }: SheetProps) {
  const [internalVisible, setInternalVisible] = React.useState(defaultOpen || false);
  const visible = open !== undefined ? open : internalVisible;
  const setVisible = onOpenChange || setInternalVisible;

  return (
    <SheetContext.Provider value={{ visible, setVisible }}>
      {children}
    </SheetContext.Provider>
  );
}

interface SheetTriggerProps {
  children: React.ReactNode;
}

export function SheetTrigger({ children }: SheetTriggerProps) {
  const { setVisible } = useSheet();

  return (
    <TouchableOpacity onPress={() => setVisible(true)} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
}

interface SheetContentProps {
  children: React.ReactNode;
  side?: SheetSide;
  style?: ViewStyle;
}

export const SheetContent = React.forwardRef<View, SheetContentProps>(
  ({ children, side = 'right', style, ...props }, ref) => {
    const { visible, setVisible } = useSheet();
    const slideAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.timing(slideAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [visible, slideAnim]);

    const getTransformStyle = () => {
      const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
      switch (side) {
        case 'top':
          return {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-screenHeight, 0],
                }),
              },
            ],
          };
        case 'bottom':
          return {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [screenHeight, 0],
                }),
              },
            ],
          };
        case 'left':
          return {
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-screenWidth, 0],
                }),
              },
            ],
          };
        case 'right':
          return {
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [screenWidth, 0],
                }),
              },
            ],
          };
        case 'popup':
          return {
            transform: [
              {
                scale: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
            opacity: slideAnim,
          };
        default:
          return {};
      }
    };

    const getPositionStyle = (): ViewStyle => {
      switch (side) {
        case 'top':
          return { top: 0, left: 0, right: 0 };
        case 'bottom':
          return { bottom: 0, left: 0, right: 0 };
        case 'left':
          return { left: 0, top: 0, bottom: 0 };
        case 'right':
          return { right: 0, top: 0, bottom: 0 };
        case 'popup':
          return {
            bottom: 16,
            right: 16,
            maxWidth: 420,
            maxHeight: Dimensions.get('window').height - 32,
          };
        default:
          return {};
      }
    };

    const getSizeStyle = (): ViewStyle => {
      const { width: screenWidth } = Dimensions.get('window');
      switch (side) {
        case 'left':
        case 'right':
          return { width: screenWidth * 0.75, maxWidth: 384 };
        case 'popup':
          return { width: '100%' };
        default:
          return {};
      }
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        {...props}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Animated.View
            ref={ref}
            style={[
              styles.content,
              getPositionStyle(),
              getSizeStyle(),
              getTransformStyle(),
              style,
            ]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e: { stopPropagation: () => void }) => e.stopPropagation()}
          >
            {children}
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }
);

SheetContent.displayName = 'SheetContent';

interface SheetHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SheetHeader({ children, style, ...props }: SheetHeaderProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
}

interface SheetTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const SheetTitle = React.forwardRef<Text, SheetTitleProps>(
  ({ children, style, ...props }, ref) => (
    <Text ref={ref} style={[styles.title, style]} {...props}>
      {children}
    </Text>
  )
);

SheetTitle.displayName = 'SheetTitle';

interface SheetDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const SheetDescription = React.forwardRef<Text, SheetDescriptionProps>(
  ({ children, style, ...props }, ref) => (
    <Text ref={ref} style={[styles.description, style]} {...props}>
      {children}
    </Text>
  )
);

SheetDescription.displayName = 'SheetDescription';

interface SheetCloseProps {
  children: React.ReactNode;
}

export function SheetClose({ children }: SheetCloseProps) {
  const { setVisible } = useSheet();

  return (
    <TouchableOpacity onPress={() => setVisible(false)} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: '#737373',
  },
});
