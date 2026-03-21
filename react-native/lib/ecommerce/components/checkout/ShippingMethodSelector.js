"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingMethodSelector = ShippingMethodSelector;
const react_native_1 = require("react-native");
const money_1 = require("../../utils/money");
const button_1 = require("../ui/button");
function ShippingMethodSelector({ methods, value, onChange, currency, style, }) {
    if (methods.length === 0)
        return null;
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.Text style={styles.title}>Shipping method</react_native_1.Text>
      <react_native_1.View style={styles.methodsContainer}>
        {methods.map((m) => {
            const active = m.id === value;
            return (<button_1.Button key={m.id} variant={active ? 'default' : 'outline'} style={[styles.methodButton, active && styles.methodButtonActive]} onPress={() => onChange(m.id)}>
              <react_native_1.View style={styles.methodContent}>
                <react_native_1.View style={styles.methodLeft}>
                  <react_native_1.Text style={[styles.methodLabel, active && styles.methodLabelActive]}>
                    {m.label}
                  </react_native_1.Text>
                  {m.detail ? (<react_native_1.Text style={[styles.methodDetail, active && styles.methodDetailActive]}>
                      {m.detail}
                    </react_native_1.Text>) : null}
                </react_native_1.View>
                <react_native_1.Text style={[styles.methodPrice, active && styles.methodPriceActive]}>
                  {(0, money_1.formatMoney)({ amount: m.price, currency: m.currency || currency })}
                </react_native_1.Text>
              </react_native_1.View>
            </button_1.Button>);
        })}
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        padding: 16,
        marginBottom: 16,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
        marginBottom: 12,
    },
    methodsContainer: {
        gap: 8,
    },
    methodButton: {
        height: 'auto',
        paddingVertical: 12,
        paddingHorizontal: 16,
        justifyContent: 'flex-start',
    },
    methodButtonActive: {
        borderColor: '#171717',
    },
    methodContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    methodLeft: {
        flex: 1,
    },
    methodLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
    methodLabelActive: {
        color: '#ffffff',
    },
    methodDetail: {
        fontSize: 12,
        color: '#737373',
        marginTop: 2,
    },
    methodDetailActive: {
        color: '#e5e5e5',
    },
    methodPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
        marginLeft: 8,
    },
    methodPriceActive: {
        color: '#ffffff',
    },
});
//# sourceMappingURL=ShippingMethodSelector.js.map