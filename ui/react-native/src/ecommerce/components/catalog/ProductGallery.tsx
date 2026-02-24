import * as React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type { ProductImage } from '../../types';

export interface ProductGalleryProps {
  images: ProductImage[];
  style?: ViewStyle;
}

const THUMB_SIZE = 64;

export function ProductGallery({ images, style }: ProductGalleryProps) {
  const [active, setActive] = React.useState(0);
  const activeImage = images[active];

  if (images.length === 0) {
    return (
      <View style={[styles.placeholder, style]}>
        <View style={styles.placeholderInner} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.mainImageContainer}>
        <Image
          source={{ uri: activeImage?.url }}
          style={styles.mainImage}
          resizeMode="cover"
          accessibilityLabel={activeImage?.alt ?? ''}
        />
      </View>
      {images.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbList}
        >
          {images.map((img, idx) => {
            const isActive = idx === active;
            return (
              <TouchableOpacity
                key={img.url}
                onPress={() => setActive(idx)}
                style={[
                  styles.thumbButton,
                  isActive ? styles.thumbButtonActive : styles.thumbButtonInactive,
                ]}
                accessibilityLabel={`View image ${idx + 1}`}
              >
                <Image
                  source={{ uri: img.url }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                  accessibilityLabel={img.alt ?? ''}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
