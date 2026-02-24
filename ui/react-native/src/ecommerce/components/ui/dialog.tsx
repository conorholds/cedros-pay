import * as React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TextStyle,
  Pressable,
  Dimensions,
} from 'react-native';

interface DialogContextType {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
}

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function Dialog({ children, open, onOpenChange, defaultOpen }: DialogProps) {
  const [internalVisible, setInternalVisible] = React.useState(defaultOpen || false);
  const visible = open !== undefined ? open : internalVisible;
  const setVisible = onOpenChange || setInternalVisible;

  return (
    <DialogContext.Provider value={{ visible, setVisible }}>
      {children}
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DialogTrigger({ children }: DialogTriggerProps) {
  const { setVisible } = useDialog();

  return (
    <TouchableOpacity onPress={() => setVisible(true)} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const DialogContent = React.forwardRef<View, DialogContentProps>(
  ({ children, style, ...props }, ref) => {
    const { visible, setVisible } = useDialog();

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        {...props}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View ref={ref} style={[styles.content, style]}>
            {children}
          </View>
        </Pressable>
      </Modal>
    );
  }
);

DialogContent.displayName = 'DialogContent';

interface DialogHeaderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function DialogHeader({ children, style, ...props }: DialogHeaderProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function DialogFooter({ children, style, ...props }: DialogFooterProps) {
  return (
    <View style={[styles.footer, style]} {...props}>
      {children}
    </View>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const DialogTitle = React.forwardRef<Text, DialogTitleProps>(
  ({ children, style, ...props }, ref) => (
    <Text ref={ref} style={[styles.title, style]} {...props}>
      {children}
    </Text>
  )
);

DialogTitle.displayName = 'DialogTitle';

interface DialogDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const DialogDescription = React.forwardRef<Text, DialogDescriptionProps>(
  ({ children, style, ...props }, ref) => (
    <Text ref={ref} style={[styles.description, style]} {...props}>
      {children}
    </Text>
  )
);

DialogDescription.displayName = 'DialogDescription';

interface DialogCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DialogClose({ children }: DialogCloseProps) {
  const { setVisible } = useDialog();

  return (
    <TouchableOpacity onPress={() => setVisible(false)} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: Math.min(width - 40, 512),
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
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
