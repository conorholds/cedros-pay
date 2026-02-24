/**
 * FAQ Item Component Tests
 * 
 * Tests for the FAQItem component including XSS protection.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FAQItem, FAQItemData } from './FAQItem';

describe('FAQItem', () => {
  const mockFAQ: FAQItemData = {
    id: '1',
    question: 'Test Question',
    answer: 'Test Answer',
  };

  it('renders question and answer', () => {
    render(<FAQItem faq={mockFAQ} defaultExpanded />);
    expect(screen.getByText('Test Question')).toBeInTheDocument();
    expect(screen.getByText('Test Answer')).toBeInTheDocument();
  });

  it('toggles expansion on click', () => {
    render(<FAQItem faq={mockFAQ} />);
    const button = screen.getByRole('button');
    
    // Initially collapsed
    expect(screen.queryByText('Test Answer')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(button);
    expect(screen.getByText('Test Answer')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(button);
    expect(screen.queryByText('Test Answer')).not.toBeInTheDocument();
  });

  it('sanitizes HTML to prevent XSS attacks (SEC-001)', () => {
    const xssFAQ: FAQItemData = {
      id: '2',
      question: 'XSS Test',
      answer: '<script>alert("xss")</script><p>Safe content</p>',
    };
    
    const { container } = render(
      <FAQItem faq={xssFAQ} defaultExpanded dangerouslySetAnswerHTML />
    );
    
    const answerDiv = container.querySelector('.prose');
    expect(answerDiv).toBeInTheDocument();
    
    // Script tags should be removed
    expect(answerDiv?.innerHTML).not.toContain('<script>');
    expect(answerDiv?.innerHTML).not.toContain('alert');
    
    // Safe content should be preserved
    expect(answerDiv?.innerHTML).toContain('<p>Safe content</p>');
  });

  it('allows safe HTML tags when dangerouslySetAnswerHTML is true', () => {
    const htmlFAQ: FAQItemData = {
      id: '3',
      question: 'HTML Test',
      answer: '<p>Paragraph with <strong>bold</strong> and <em>italic</em></p><ul><li>Item 1</li><li>Item 2</li></ul>',
    };
    
    const { container } = render(
      <FAQItem faq={htmlFAQ} defaultExpanded dangerouslySetAnswerHTML />
    );
    
    const answerDiv = container.querySelector('.prose');
    expect(answerDiv?.innerHTML).toContain('<strong>bold</strong>');
    expect(answerDiv?.innerHTML).toContain('<em>italic</em>');
    expect(answerDiv?.innerHTML).toContain('<ul>');
    expect(answerDiv?.innerHTML).toContain('<li>Item 1</li>');
  });

  it('renders plain text when dangerouslySetAnswerHTML is false', () => {
    const htmlFAQ: FAQItemData = {
      id: '4',
      question: 'Plain Text Test',
      answer: '<p>This should be plain text</p>',
    };
    
    render(<FAQItem faq={htmlFAQ} defaultExpanded />);
    
    // Should render the HTML as text, not as markup
    expect(screen.getByText('<p>This should be plain text</p>')).toBeInTheDocument();
  });

  it('renders keywords when showKeywords is true', () => {
    const keywordFAQ: FAQItemData = {
      id: '5',
      question: 'Keywords Test',
      answer: 'Answer',
      keywords: ['tag1', 'tag2', 'tag3'],
    };
    
    render(<FAQItem faq={keywordFAQ} defaultExpanded showKeywords />);
    
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
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
    
    expect(screen.queryByText('Test Answer')).not.toBeInTheDocument();
    
    rerender(<FAQItem faq={mockFAQ} expanded={true} />);
    
    expect(screen.getByText('Test Answer')).toBeInTheDocument();
  });
});
