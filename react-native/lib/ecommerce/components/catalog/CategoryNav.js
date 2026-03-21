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
exports.CategoryNav = CategoryNav;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
function CategoryNav({ categories, activeSlug, onSelect, style, }) {
    return (<react_native_1.ScrollView style={style} accessibilityLabel="Categories" showsVerticalScrollIndicator={false}>
      <react_native_1.View style={styles.container}>
        {categories.map((c) => {
            const isActive = activeSlug === c.slug;
            return (<react_native_1.TouchableOpacity key={c.id} style={[
                    styles.categoryButton,
                    isActive ? styles.activeButton : styles.inactiveButton,
                ]} onPress={() => onSelect?.(c)} accessibilityState={{ selected: isActive }}>
              <react_native_1.Text style={[
                    styles.categoryText,
                    isActive ? styles.activeText : styles.inactiveText,
                ]} numberOfLines={1}>
                {c.name}
              </react_native_1.Text>
              <react_native_1.Text style={[styles.chevron, isActive && styles.activeChevron]}>›</react_native_1.Text>
            </react_native_1.TouchableOpacity>);
        })}
      </react_native_1.View>
    </react_native_1.ScrollView>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        gap: 4,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    activeButton: {
        backgroundColor: '#171717',
    },
    inactiveButton: {
        backgroundColor: 'transparent',
    },
    categoryText: {
        fontSize: 14,
        flex: 1,
    },
    activeText: {
        color: '#ffffff',
        fontWeight: '500',
    },
    inactiveText: {
        color: '#404040',
    },
    chevron: {
        fontSize: 12,
        opacity: 0.7,
        color: '#737373',
    },
    activeChevron: {
        color: '#ffffff',
    },
});
//# sourceMappingURL=CategoryNav.js.map