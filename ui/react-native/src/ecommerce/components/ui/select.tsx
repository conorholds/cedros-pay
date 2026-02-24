import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

function useSelect() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select');
  }
  return context;
}

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Select({ children, value: controlledValue, defaultValue, onValueChange }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const [open, setOpen] = React.useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const SelectTrigger = React.forwardRef<TouchableOpacity, SelectTriggerProps>(
  ({ children, style, ...props }, ref) => {
    const { open, setOpen, value } = useSelect();

    return (
      <TouchableOpacity
        ref={ref}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
        style={[styles.trigger, style]}
        {...props}
      >
        <View style={styles.triggerContent}>
          {children || <Text style={styles.valueText}>{value || 'Select...'}</Text>}
          <Text style={styles.icon}>▾</Text>
        </View>
      </TouchableOpacity>
    );
  }
);

SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelect();
  return <Text style={styles.valueText}>{value || placeholder || 'Select...'}</Text>;
}

interface SelectContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const SelectContent = React.forwardRef<View, SelectContentProps>(
  ({ children, style, ...props }, ref) => {
    const { open, setOpen } = useSelect();

    return (
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        {...props}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View ref={ref} style={[styles.content, style]} onStartShouldSetResponder={() => true}>
            <ScrollView>{children}</ScrollView>
          </View>
        </Pressable>
      </Modal>
    );
  }
);

SelectContent.displayName = 'SelectContent';

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SelectItem = React.forwardRef<TouchableOpacity, SelectItemProps>(
  ({ children, value: itemValue, style, textStyle, ...props }, ref) => {
    const { value, onValueChange } = useSelect();
    const isSelected = value === itemValue;

    return (
      <TouchableOpacity
        ref={ref}
        onPress={() => onValueChange(itemValue)}
        activeOpacity={0.7}
        style={[styles.item, isSelected && styles.selectedItem, style]}
        {...props}
      >
        <Text style={[styles.itemText, isSelected && styles.selectedItemText, textStyle]}>
          {children}
        </Text>
      </TouchableOpacity>
    );
  }
);

SelectItem.displayName = 'SelectItem';

interface SelectGroupProps {
  children: React.ReactNode;
}

export function SelectGroup({ children }: SelectGroupProps) {
  return <View>{children}</View>;
}

const styles = StyleSheet.create({
  trigger: {
    height: 40,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueText: {
    fontSize: 14,
    color: '#171717',
  },
  icon: {
    fontSize: 12,
    color: '#737373',
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectedItem: {
    backgroundColor: '#f5f5f5',
  },
  itemText: {
    fontSize: 14,
    color: '#171717',
  },
  selectedItemText: {
    fontWeight: '500',
  },
});
