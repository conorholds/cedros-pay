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
exports.ProductGallery = ProductGallery;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const THUMB_SIZE = 64;
function ProductGallery({ images, style }) {
    const [active, setActive] = React.useState(0);
    const activeImage = images[active];
    if (images.length === 0) {
        return (<react_native_1.View style={[styles.placeholder, style]}>
        <react_native_1.View style={styles.placeholderInner}/>
      </react_native_1.View>);
    }
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.View style={styles.mainImageContainer}>
        <react_native_1.Image source={{ uri: activeImage?.url }} style={styles.mainImage} resizeMode="cover" accessibilityLabel={activeImage?.alt ?? ''}/>
      </react_native_1.View>
      {images.length > 1 ? (<react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbList}>
          {images.map((img, idx) => {
                const isActive = idx === active;
                return (<react_native_1.TouchableOpacity key={img.url} onPress={() => setActive(idx)} style={[
                        styles.thumbButton,
                        isActive ? styles.thumbButtonActive : styles.thumbButtonInactive,
                    ]} accessibilityLabel={`View image ${idx + 1}`}>
                <react_native_1.Image source={{ uri: img.url }} style={styles.thumbImage} resizeMode="cover" accessibilityLabel={img.alt ?? ''}/>
              </react_native_1.TouchableOpacity>);
            })}
        </react_native_1.ScrollView>) : null}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        gap: 12,
    },
    placeholder: {
        aspectRatio: 1,
        width: '100%',
    },
    placeholderInner: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        backgroundColor: '#f5f5f5',
    },
    mainImageContainer: {
        aspectRatio: 1,
        overflow: 'hidden',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        backgroundColor: '#f5f5f5',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    thumbList: {
        gap: 8,
        paddingBottom: 4,
    },
    thumbButton: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 2,
    },
    thumbButtonActive: {
        borderColor: '#171717',
    },
    thumbButtonInactive: {
        borderColor: '#e5e5e5',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
});
//# sourceMappingURL=ProductGallery.js.map