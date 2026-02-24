import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { Card, CardContent } from '../ui/card';

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
  rating?: number;
}

export interface TestimonialsProps {
  testimonials: Testimonial[];
  title?: string;
  style?: ViewStyle;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} style={styles.star}>
          {star <= rating ? '★' : '☆'}
        </Text>
      ))}
    </View>
  );
}

export function Testimonials({
  testimonials,
  title = 'What our customers say',
  style,
}: TestimonialsProps) {
  if (!testimonials.length) return null;

  return (
    <View style={[styles.container, style]}>
      {title && <Text style={styles.title}>{title}</Text>}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id} style={styles.card}>
            <CardContent style={styles.cardContent}>
              {testimonial.rating && (
                <StarRating rating={testimonial.rating} />
              )}
              <Text style={styles.quote}>"{testimonial.quote}"</Text>
              <View style={styles.authorContainer}>
                <Text style={styles.author}>{testimonial.author}</Text>
                {testimonial.role && (
                  <Text style={styles.role}>{testimonial.role}</Text>
                )}
              </View>
            </CardContent>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollContent: {
    gap: 12,
    paddingHorizontal: 16,
  },
  card: {
    width: 280,
    flexShrink: 0,
  },
  cardContent: {
    padding: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    fontSize: 16,
    color: '#fbbf24',
    marginRight: 2,
  },
  quote: {
    fontSize: 14,
    color: '#525252',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  authorContainer: {
    marginTop: 'auto',
  },
  author: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  role: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
});
