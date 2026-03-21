"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressForm = AddressForm;
const react_native_1 = require("react-native");
const input_1 = require("../ui/input");
const label_1 = require("../ui/label");
function AddressForm({ title, value, onChange, errors, style, }) {
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.Text style={styles.title}>{title}</react_native_1.Text>
      <react_native_1.View style={styles.fieldsContainer}>
        <react_native_1.View style={styles.field}>
          <label_1.Label>Address line 1</label_1.Label>
          <input_1.Input value={value.line1} onChangeText={(text) => onChange({ ...value, line1: text })} placeholder="Street address"/>
          {errors?.line1 ? (<react_native_1.Text style={styles.errorText}>{errors.line1}</react_native_1.Text>) : null}
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <label_1.Label>Address line 2</label_1.Label>
          <input_1.Input value={value.line2 ?? ''} onChangeText={(text) => onChange({ ...value, line2: text })} placeholder="Apartment, suite, unit (optional)"/>
        </react_native_1.View>

        <react_native_1.View style={styles.row}>
          <react_native_1.View style={[styles.field, styles.halfField]}>
            <label_1.Label>City</label_1.Label>
            <input_1.Input value={value.city} onChangeText={(text) => onChange({ ...value, city: text })} placeholder="City"/>
            {errors?.city ? (<react_native_1.Text style={styles.errorText}>{errors.city}</react_native_1.Text>) : null}
          </react_native_1.View>

          <react_native_1.View style={[styles.field, styles.halfField]}>
            <label_1.Label>State</label_1.Label>
            <input_1.Input value={value.state ?? ''} onChangeText={(text) => onChange({ ...value, state: text })} placeholder="State / Province"/>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={styles.row}>
          <react_native_1.View style={[styles.field, styles.halfField]}>
            <label_1.Label>Postal code</label_1.Label>
            <input_1.Input value={value.postalCode} onChangeText={(text) => onChange({ ...value, postalCode: text })} placeholder="ZIP / Postal" keyboardType="default" autoCapitalize="characters"/>
            {errors?.postalCode ? (<react_native_1.Text style={styles.errorText}>{errors.postalCode}</react_native_1.Text>) : null}
          </react_native_1.View>

          <react_native_1.View style={[styles.field, styles.halfField]}>
            <label_1.Label>Country</label_1.Label>
            <input_1.Input value={value.country} onChangeText={(text) => onChange({ ...value, country: text })} placeholder="Country code" autoCapitalize="characters" maxLength={2}/>
            {errors?.country ? (<react_native_1.Text style={styles.errorText}>{errors.country}</react_native_1.Text>) : null}
          </react_native_1.View>
        </react_native_1.View>
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
    fieldsContainer: {
        gap: 12,
    },
    field: {
        gap: 4,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
    errorText: {
        fontSize: 12,
        color: '#dc2626',
        marginTop: 4,
    },
});
//# sourceMappingURL=AddressForm.js.map