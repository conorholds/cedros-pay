/**
 * FAQ Item Component Tests
 * 
 * Tests for the FAQItem component for React Native.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FAQItem, FAQItemData } from './FAQItem';

// Mock React Native components for web test environment
vi.mock('react-native', () => ({
  View: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
  Text: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <span {...props}>{children}</span>
  ),
  TouchableOpacity: ({ children, onPress, ...props }: React.PropsWithChildren<Record<string, unknown> & { onPress?: () => void }>) => (
    <button onClick={onPress} {...props}>{children}</button>
  ),
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
  Animated: {
    Value: class {
      constructor(value: number) {
        this._value = value;
      }
      _value: number;
      interpolate() { return this._value; }
    },
    timing: () => ({ start: () => {} }),
  },
  LayoutAnimation: {
    configureNext: () => {},
    Presets: { easeInEaseOut: {} },
  },
  Platform: { OS: 'ios' },
  UIManager: {},
}));

describe('FAQItem', () => {
  const mockFAQ: FAQItemData = {
    id: '1',
    question: 'Test Question',
    answer: 'Test Answer',
  };

  it('renders question', () => {
    render(<FAQItem faq={mockFAQ} />);
    expect(screen.getByText('Test Question')).toBeTruthy();
  });

  it('toggles expansion on click', () => {
    render(<FAQItem faq={mockFAQ} />);
    const button = screen.getByRole('button');
    
    // Initially collapsed - answer not visible
    expect(screen.queryByText('Test Answer')).toBeNull();
    
    // Click to expand
    fireEvent.click(button);
    expect(screen.getByText('Test Answer')).toBeTruthy();
    
    // Click to collapse
    fireEvent.click(button);
    expect(screen.queryByText('Test Answer')).toBeNull();
  });

  it('respects defaultExpanded prop', () => {
    render(<FAQItem faq={mockFAQ} defaultExpanded />);
    expect(screen.getByText('Test Answer')).toBeTruthy();
  });

  it('renders keywords when showKeywords is true', () => {
    const keywordFAQ: FAQItemData = {
      id: '5',
      question: 'Keywords Test',
      answer: 'Answer',
      keywords: ['tag1', 'tag2', 'tag3'],
    };
    
    render(<FAQItem faq={keywordFAQ} defaultExpanded showKeywords />);
    
    expect(screen.getByText('tag1')).toBeTruthy();
    expect(screen.getByText('tag2')).toBeTruthy();
    expect(screen.getByText('tag3')).toBeTruthy();
  });

  it('calls onExpandedChange callback', () => {
    const onExpandedChange = vi.fn();
    render(<FAQItem faq={mockFAQ} onExpandedChange={onExpandedChange} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    
    fireEvent.click(button);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it('respects controlled expanded prop', () => {
    const { rerender } = render(<FAQItem faq={mockFAQ} expanded={false} />);
    
    expect(screen.queryByText('Test Answer')).toBeNull();
    
    rerender(<FAQItem faq={mockFAQ} expanded={true} />);
    
    expect(screen.getByText('Test Answer')).toBeTruthy();
  });
});
