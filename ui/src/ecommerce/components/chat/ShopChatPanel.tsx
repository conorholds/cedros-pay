import * as React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useOptionalCedrosShop } from '../../config/context';
import type { ChatProductMatch, ChatFaqMatch } from '../../adapters/CommerceAdapter';

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  products?: ChatProductMatch[];
  faqs?: ChatFaqMatch[];
  createdAt: number;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

function AnimatedMessage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) return;

    el.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0px)' },
      ],
      { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' }
    );
  }, [prefersReducedMotion]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Product card rendered inline within a chat message. */
function ChatProductCard({ product, onSelect }: { product: ChatProductMatch; onSelect?: (slug: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(product.slug ?? product.id)}
      className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
    >
      {product.imageUrl && (
        <img src={product.imageUrl} alt={product.name} className="h-10 w-10 shrink-0 rounded object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{product.name}</div>
        {product.priceCents != null && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{formatPrice(product.priceCents)}</div>
        )}
      </div>
    </button>
  );
}

/** FAQ answer rendered inline within a chat message. */
function ChatFaqCard({ faq }: { faq: ChatFaqMatch }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="w-full rounded-lg border border-neutral-200 bg-white p-2 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
    >
      <div className="text-xs font-medium">{faq.question}</div>
      {expanded && <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{faq.answer}</div>}
    </button>
  );
}

export type ShopChatPanelProps = {
  className?: string;
  /** Called when user taps a product card in chat results. */
  onProductSelect?: (slugOrId: string) => void;
};

/**
 * AI-powered shop chat panel. Connects to `POST /paywall/v1/chat` via the
 * CommerceAdapter. Falls back to a local demo when no adapter is available.
 */
export function ShopChatPanel({ className, onProductSelect }: ShopChatPanelProps) {
  const shop = useOptionalCedrosShop();
  const adapter = shop?.config.adapter;
  const hasBackend = Boolean(adapter?.sendChatMessage);

  const [draft, setDraft] = React.useState('');
  const [isWaitingForAgent, setIsWaitingForAgent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sessionIdRef = React.useRef<string | undefined>(undefined);
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [
    {
      id: createId(),
      role: 'agent',
      text: 'Hi! How can we help today? We can recommend products or answer support questions.',
      createdAt: Date.now(),
    },
  ]);

  const [typingDots, setTypingDots] = React.useState('…');

  React.useEffect(() => {
    if (!isWaitingForAgent) return;
    const dots = ['.', '..', '...'];
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % dots.length;
      setTypingDots(dots[i]!);
    }, 450);
    return () => window.clearInterval(id);
  }, [isWaitingForAgent]);

  const listRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const syncInputHeight = React.useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const maxHeight = 120;
    el.style.height = '0px';
    const next = Math.min(maxHeight, Math.max(40, el.scrollHeight));
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  React.useEffect(() => {
    syncInputHeight();
  }, [draft, syncInputHeight]);

  const send = React.useCallback(async () => {
    const text = draft.trim();
    if (!text || isWaitingForAgent) return;

    setMessages((prev) => [...prev, { id: createId(), role: 'user', text, createdAt: Date.now() }]);
    setDraft('');
    setError(null);
    setIsWaitingForAgent(true);

    if (!hasBackend || !adapter?.sendChatMessage) {
      // Local fallback when no adapter is available.
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: createId(), role: 'agent', text: 'Chat is not configured. Please contact support.', createdAt: Date.now() },
        ]);
        setIsWaitingForAgent(false);
      }, 300);
      return;
    }

    try {
      const result = await adapter.sendChatMessage({ sessionId: sessionIdRef.current, message: text });
      sessionIdRef.current = result.sessionId;

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'agent',
          text: result.message,
          products: result.products,
          faqs: result.faqs,
          createdAt: Date.now(),
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: createId(), role: 'agent', text: 'Sorry, I had trouble processing that. Please try again.', createdAt: Date.now() },
      ]);
    } finally {
      setIsWaitingForAgent(false);
    }
  }, [draft, isWaitingForAgent, hasBackend, adapter]);

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
      >
        {messages.map((m) => (
          <AnimatedMessage
            key={m.id}
            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div className={cn('max-w-[85%]', m.role === 'user' ? '' : 'space-y-2')}>
              <div
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm leading-5',
                  m.role === 'user'
                    ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50'
                )}
              >
                <span className="whitespace-pre-wrap break-words">{m.text}</span>
              </div>

              {/* Product matches */}
              {m.products && m.products.length > 0 && (
                <div className="space-y-1">
                  {m.products.map((p) => (
                    <ChatProductCard key={p.id} product={p} onSelect={onProductSelect} />
                  ))}
                </div>
              )}

              {/* FAQ matches */}
              {m.faqs && m.faqs.length > 0 && (
                <div className="space-y-1">
                  {m.faqs.map((f) => (
                    <ChatFaqCard key={f.id} faq={f} />
                  ))}
                </div>
              )}
            </div>
          </AnimatedMessage>
        ))}

        {isWaitingForAgent ? (
          <AnimatedMessage className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-neutral-100 px-3 py-2 text-sm leading-5 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50">
              {typingDots}
            </div>
          </AnimatedMessage>
        ) : null}
      </div>

      {error && (
        <div className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</div>
      )}

      <div className="mt-3 flex shrink-0 items-end gap-2">
        <Textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="max-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (e.shiftKey) return;
            e.preventDefault();
            send();
          }}
        />
        <Button type="button" onClick={send} disabled={!draft.trim() || isWaitingForAgent} className="h-10 shrink-0">
          Send
        </Button>
      </div>
    </div>
  );
}
