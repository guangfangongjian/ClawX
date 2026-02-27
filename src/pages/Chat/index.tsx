/**
 * Chat Page
 * Native React implementation communicating with OpenClaw Gateway
 * via gateway:rpc IPC. Session selector, thinking toggle, and refresh
 * are in the toolbar; messages render with markdown + streaming.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useChatStore, type RawMessage } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatToolbar } from './ChatToolbar';
import { extractImages, extractText, extractThinking, extractToolUse } from './message-utils';
import { useTranslation } from 'react-i18next';

export function Chat() {
  const { t } = useTranslation('chat');
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';

  const messages = useChatStore((s) => s.messages);
  const loading = useChatStore((s) => s.loading);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const showThinking = useChatStore((s) => s.showThinking);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const pendingFinal = useChatStore((s) => s.pendingFinal);
  const loadHistory = useChatStore((s) => s.loadHistory);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const abortRun = useChatStore((s) => s.abortRun);
  const clearError = useChatStore((s) => s.clearError);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingTimestamp, setStreamingTimestamp] = useState<number>(0);

  // Handle external agent events (Feishu, Telegram, etc.) for real-time updates.
  //
  // Key insight: The Gateway does NOT stream progressively. All delta events
  // arrive in a ~200ms burst alongside the final event. However, the
  // lifecycle.start event arrives ~25s BEFORE any deltas — this is our
  // early signal to switch sessions and show the user's incoming message.
  //
  // Flow:
  //   1. lifecycle.start → switch session, load history (shows user msg), set sending=true
  //   2. (25s of Gateway processing — user sees "Thinking..." indicator)
  //   3. delta burst + final → load history again (shows assistant response), set sending=false
  useEffect(() => {
    // Track active run to avoid processing stale events
    let activeExtRunId = '';

    const unsubNotif = window.electron.ipcRenderer.on('gateway:notification', (notification) => {
      const payload = notification as { method?: string; params?: Record<string, unknown> } | undefined;
      if (!payload || payload.method !== 'agent' || !payload.params) return;

      const p = payload.params;
      const streamType = p.stream ? String(p.stream) : '';
      const data = (p.data && typeof p.data === 'object') ? p.data as Record<string, unknown> : {};
      const runId = p.runId ? String(p.runId) : '';
      const sessionKey = p.sessionKey ? String(p.sessionKey) : '';

      // lifecycle.start: new run starting — switch session and show user message
      if (streamType === 'lifecycle' && (data.phase === 'started' || data.startedAt)) {
        activeExtRunId = runId;
        const store = useChatStore.getState();
        // Only auto-switch if we're not already sending (avoid interrupting user's own chat)
        if (sessionKey && !store.sending) {
          // Switch to the external session and load its history
          useChatStore.setState({
            currentSessionKey: sessionKey,
            messages: [],
            sending: true,
            activeRunId: runId || null,
            streamingMessage: null,
            streamingText: '',
            streamingTools: [],
            error: null,
          });
          void useChatStore.getState().loadSessions();
          void useChatStore.getState().loadHistory(true);
        }
        return;
      }

      // lifecycle.end: run finished — handled by the chat final event below
      if (streamType === 'lifecycle') return;

      // Delta events (thinking/assistant) — update streamingMessage for the active run
      if (runId && runId === activeExtRunId) {
        let message: Record<string, unknown> | undefined;
        if (data.text !== undefined) {
          if (streamType === 'thinking') {
            message = { role: 'assistant', content: [{ type: 'thinking', thinking: String(data.text) }] };
          } else {
            message = { role: 'assistant', content: String(data.text) };
          }
        }
        if (message) {
          useChatStore.setState({ streamingMessage: message });
        }
      }
    });

    // Listen for chat final events (response complete)
    const unsubChat = window.electron.ipcRenderer.on('gateway:chat-message', (data) => {
      const chatData = data as Record<string, unknown>;
      if (chatData._test) return; // skip timer test events
      const payload = ('message' in chatData && typeof chatData.message === 'object')
        ? chatData.message as Record<string, unknown>
        : chatData;

      if (payload.state === 'final' || payload.state === 'complete' || payload.state === 'done') {
        activeExtRunId = '';
        // Delay slightly so any last delta can be seen, then reload final messages
        setTimeout(() => {
          const s = useChatStore.getState();
          if (s.sending) {
            void s.loadHistory(true).then(() => {
              useChatStore.setState({
                sending: false,
                streamingMessage: null,
                activeRunId: null,
                streamingTools: [],
              });
            });
          }
        }, 200);
      }
    });

    return () => {
      unsubNotif?.();
      unsubChat?.();
    };
  }, []);

  // Load data when gateway is running
  useEffect(() => {
    if (!isGatewayRunning) return;
    let cancelled = false;
    (async () => {
      await loadSessions();
      if (cancelled) return;
      await loadHistory();
    })();
    return () => {
      cancelled = true;
    };
  }, [isGatewayRunning, loadHistory, loadSessions]);

  // Auto-scroll on new messages, streaming, or activity changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, sending, pendingFinal]);

  // Update timestamp when sending starts
  useEffect(() => {
    if (sending && streamingTimestamp === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStreamingTimestamp(Date.now() / 1000);
    } else if (!sending && streamingTimestamp !== 0) {
      setStreamingTimestamp(0);
    }
  }, [sending, streamingTimestamp]);

  // Gateway not running
  if (!isGatewayRunning) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center text-center p-8">
        <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('gatewayNotRunning')}</h2>
        <p className="text-muted-foreground max-w-md">
          {t('gatewayRequired')}
        </p>
      </div>
    );
  }

  const streamMsg = streamingMessage && typeof streamingMessage === 'object'
    ? streamingMessage as unknown as { role?: string; content?: unknown; timestamp?: number }
    : null;
  const streamText = streamMsg ? extractText(streamMsg) : (typeof streamingMessage === 'string' ? streamingMessage : '');
  const hasStreamText = streamText.trim().length > 0;
  const streamThinking = streamMsg ? extractThinking(streamMsg) : null;
  const hasStreamThinking = showThinking && !!streamThinking && streamThinking.trim().length > 0;
  const streamTools = streamMsg ? extractToolUse(streamMsg) : [];
  const hasStreamTools = streamTools.length > 0;
  const streamImages = streamMsg ? extractImages(streamMsg) : [];
  const hasStreamImages = streamImages.length > 0;
  const hasStreamToolStatus = streamingTools.length > 0;
  const shouldRenderStreaming = sending && (hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus);
  const hasAnyStreamContent = hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus;

  return (
    <div className="flex flex-col -m-6" style={{ height: 'calc(100vh - 2.5rem)' }}>
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-end px-4 py-2">
        <ChatToolbar />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading ? (
            <div className="flex h-full items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : messages.length === 0 && !sending ? (
            <WelcomeScreen />
          ) : (
            <>
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id || `msg-${idx}`}
                  message={msg}
                  showThinking={showThinking}
                />
              ))}

              {/* Streaming message */}
              {shouldRenderStreaming && (
                <ChatMessage
                  message={(streamMsg
                    ? {
                        ...(streamMsg as Record<string, unknown>),
                        role: (typeof streamMsg.role === 'string' ? streamMsg.role : 'assistant') as RawMessage['role'],
                        content: streamMsg.content ?? streamText,
                        timestamp: streamMsg.timestamp ?? streamingTimestamp,
                      }
                    : {
                        role: 'assistant',
                        content: streamText,
                        timestamp: streamingTimestamp,
                      }) as RawMessage}
                  showThinking={showThinking}
                  isStreaming
                  streamingTools={streamingTools}
                />
              )}

              {/* Activity indicator: waiting for next AI turn after tool execution */}
              {sending && pendingFinal && !shouldRenderStreaming && (
                <ActivityIndicator phase="tool_processing" />
              )}

              {/* Typing indicator when sending but no stream content yet */}
              {sending && !pendingFinal && !hasAnyStreamContent && (
                <TypingIndicator />
              )}
            </>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
            <button
              onClick={clearError}
              className="text-xs text-destructive/60 hover:text-destructive underline"
            >
              {t('common:actions.dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        onSend={sendMessage}
        onStop={abortRun}
        disabled={!isGatewayRunning}
        sending={sending}
      />
    </div>
  );
}

// ── Welcome Screen ──────────────────────────────────────────────

function WelcomeScreen() {
  const { t } = useTranslation('chat');
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
        <Bot className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{t('welcome.title')}</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        {t('welcome.subtitle')}
      </p>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full">
        {[
          { icon: MessageSquare, title: t('welcome.askQuestions'), desc: t('welcome.askQuestionsDesc') },
          { icon: Sparkles, title: t('welcome.creativeTasks'), desc: t('welcome.creativeTasksDesc') },
        ].map((item, i) => (
          <Card key={i} className="text-left">
            <CardContent className="p-4">
              <item.icon className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Typing Indicator ────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="bg-muted rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ── Activity Indicator (shown between tool cycles) ─────────────

function ActivityIndicator({ phase }: { phase: 'tool_processing' }) {
  void phase;
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="bg-muted rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>Processing tool results…</span>
        </div>
      </div>
    </div>
  );
}

export default Chat;
