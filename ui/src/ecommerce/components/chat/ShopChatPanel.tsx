import * as React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
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

/**
 * @experimental This component is a stub and has no backend integration.
 * It is not ready for production use. API and behaviour will change without notice.
 */
export function ShopChatPanel({ className }: { className?: string }) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.warn(
      '[ShopChatPanel] This component is experimental and has no backend configured. ' +
      'Messages are handled locally and will not be sent to any server.'
    );
  }, []);
  const [draft, setDraft] = React.useState('');
  const [isWaitingForAgent, setIsWaitingForAgent] = React.useState(false);
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

  const send = React.useCallback(() => {
    const text = draft.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        role: 'user',
        text,
        createdAt: Date.now(),
      },
    ]);
    setDraft('');

    setIsWaitingForAgent(true);

    // Local demo response.
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'agent',
          text: 'Got it. Want recommendations, sizing help, or help with an order?',
          createdAt: Date.now(),
        },
      ]);
      setIsWaitingForAgent(false);
    }, 450);
  }, [draft]);

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
      >
        {messages.map((m) => (
          <AnimatedMessage
            key={m.id}
            className={cn(
              'flex',
              m.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5',
                m.role === 'user'
                  ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50'
              )}
            >
              <span className="whitespace-pre-wrap break-words">{m.text}</span>
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
        <Button type="button" onClick={send} disabled={!draft.trim()} className="h-10 shrink-0">
          Send
        </Button>
      </div>
    </div>
  );
}
