import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Copy,
  Trash2,
  Loader2,
  Smile,
  CheckCheck,
  Hash
} from 'lucide-react';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const { workspace, user: currentUser } = useAuth();
  const workspaceId = workspace?.id || '';
  const workspaceName = workspace?.name || 'Workspace';

  const { success: showSuccess, error: showError } = useToast();
  
  // Real-time Chat Hook for Workspace Group Chat
  const {
    messages,
    isLoading,
    typingUsers,
    sendMessage,
    deleteMessage,
    emitStartTyping,
    emitStopTyping,
  } = useChat(workspaceId);

  const [input, setInput] = useState('');
  const [isTypingState, setIsTypingState] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom on load / message add
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Formatting helpers
  function formatTime(isoString: string) {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function formatDate(isoString: string) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  // Handle typing emissions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    if (!isTypingState) {
      setIsTypingState(true);
      emitStartTyping();
    }

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      setIsTypingState(false);
      emitStopTyping();
    }, 2000);
  };

  // Handle Message Posting
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const text = input.trim();
    setInput('');
    setIsTypingState(false);
    emitStopTyping();

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    try {
      await sendMessage(text);
    } catch (err: any) {
      showError(err.message || 'Failed to send message');
      setInput(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Copied to clipboard');
    } catch {
      showError('Failed to copy');
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      showSuccess('Message deleted');
    } catch (err: any) {
      showError(err.message || 'Failed to delete message');
    }
  };

  return (
    <div className="h-full flex flex-col bg-canvas text-ink overflow-hidden select-none font-sans">
      
      {/* Chat Feed Header */}
      <div className="h-[56px] px-[24px] border-b border-hairline bg-surface-1/80 backdrop-blur-xs flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-[12px]">
          <div className="w-[32px] h-[32px] rounded-full bg-surface-3 flex items-center justify-center flex-shrink-0">
            <Hash className="w-[18px] h-[18px] text-ink" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-ink">
              # workspace-chat
            </h2>
            <p className="text-[10px] text-ink-muted">
              Collaborative room for all {workspaceName} members
            </p>
          </div>
        </div>

        <div className="flex items-center gap-[12px]">
          <span className="text-[11px] text-ink-muted font-medium bg-surface-2 px-[8px] py-[2px] rounded-md border border-hairline">
            Group Chat
          </span>
        </div>
      </div>

      {/* Messages Feed View */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-[24px] py-[20px] flex flex-col gap-[12px] bg-canvas custom-scrollbar"
      >
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-[10px]">
            <Loader2 className="w-[18px] h-[18px] animate-spin text-accent" />
            <span className="text-[11px]">Syncing messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-[40px] text-ink-muted">
            <div className="w-[44px] h-[44px] rounded-full bg-surface-2 flex items-center justify-center mb-[12px] border border-hairline">
              💬
            </div>
            <h3 className="text-[13px] font-bold text-ink mb-[4px]">
              Welcome to #workspace-chat!
            </h3>
            <p className="text-[11px] max-w-[220px] leading-relaxed">
              This is the beginning of communication for {workspaceName}. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser?.id;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
            const isNewDay = !prevMsg || formatDate(prevMsg.createdAt) !== formatDate(msg.createdAt);

            return (
              <React.Fragment key={msg.id}>
                {/* Date Stamp Separator */}
                {isNewDay && (
                  <div className="flex items-center gap-[10px] py-[10px] flex-shrink-0">
                    <div className="flex-1 h-[1px] bg-hairline" />
                    <span className="text-[9px] font-semibold text-ink-muted uppercase tracking-wider bg-surface-2 border border-hairline px-[8px] py-[2px] rounded-full">
                      {formatDate(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-[1px] bg-hairline" />
                  </div>
                )}

                {/* Speech Bubble Container */}
                <div
                  className={cn(
                    "group flex gap-[8px] max-w-[85%] md:max-w-[70%] relative transition-all rounded-xl",
                    isMe ? "self-end" : "self-start",
                    isSameSender && !isNewDay ? "-mt-[4px]" : "mt-[6px]"
                  )}
                >
                  {/* Avatar on Left (for received messages, excluding consecutive identical senders) */}
                  {!isMe && (!isSameSender || isNewDay) && (
                    <Avatar
                      src={msg.sender.avatarUrl || undefined}
                      name={msg.sender.name}
                      size="sm"
                      className="flex-shrink-0 mt-[2px] border border-hairline"
                    />
                  )}
                  
                  {/* Ghost block for avatar placeholder to align bubbles properly */}
                  {!isMe && isSameSender && !isNewDay && (
                    <div className="w-[28px] flex-shrink-0" />
                  )}

                  {/* Speech Bubble Card */}
                  <div
                    className={cn(
                      "p-[10px] rounded-xl flex flex-col relative border",
                      isMe
                        ? "bg-accent/10 border-accent/20 rounded-tr-xs" // Stride Dark Blue Highlight
                        : "bg-surface-2 border-hairline rounded-tl-xs" // Stride Standard Dark Gray
                    )}
                  >
                    {/* Sender Name label */}
                    {!isMe && (!isSameSender || isNewDay) && (
                      <span className="text-[10px] font-bold text-accent mb-[2px]">
                        {msg.sender.name}
                      </span>
                    )}

                    {/* Content text */}
                    <p className="text-[12.5px] text-ink leading-relaxed break-words whitespace-pre-wrap">
                      {msg.content}
                    </p>

                    {/* Timestamp & tick status */}
                    <div className="flex items-center justify-end gap-[4px] mt-[4px] self-end">
                      <span className="text-[9px] text-ink-muted">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isMe && (
                        <CheckCheck className="w-[12px] h-[12px] text-accent" />
                      )}
                    </div>

                    {/* Hover action menu overlay */}
                    <div className="absolute right-[4px] top-[-10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-surface-3 border border-hairline rounded-md shadow-sm overflow-hidden z-20">
                      <button
                        onClick={() => handleCopy(msg.content)}
                        title="Copy text"
                        className="p-[4px] hover:bg-surface-2 text-ink transition-all border-r border-hairline cursor-pointer"
                      >
                        <Copy className="w-[10px] h-[10px]" />
                      </button>
                      {(isMe || currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          title="Delete message"
                          className="p-[4px] hover:bg-red-500/10 text-red-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-[10px] h-[10px]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* Typing bubbles */}
        {typingUsers.length > 0 && (
          <div className="self-start flex items-center gap-[8px] bg-surface-2 border border-hairline px-[12px] py-[6px] rounded-full text-[10px] text-accent font-semibold animate-pulse shadow-sm">
            <span className="flex gap-[2px] items-center">
              <span className="w-[4px] h-[4px] bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-[4px] h-[4px] bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-[4px] h-[4px] bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span>{typingUsers.map((u) => u.name).join(', ')} typing...</span>
          </div>
        )}
      </div>

      {/* Footer Chat Input (WhatsApp/Lovable inspired card) */}
      <div className="p-[20px] border-t border-hairline bg-surface-1/80 backdrop-blur-xs flex-shrink-0 z-10">
        <form
          onSubmit={handleSend}
          className="bg-surface-2 border border-hairline focus-within:border-accent/40 rounded-xl px-[12px] py-[8px] flex items-end gap-[8px] transition-all"
        >
          <button
            type="button"
            className="p-[6px] rounded-lg text-ink-muted hover:text-ink hover:bg-surface-3 transition-all flex-shrink-0 cursor-pointer"
            title="Emojis"
          >
            <Smile className="w-[16px] h-[16px]" />
          </button>

          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message to #workspace-chat..."
            rows={1}
            className="flex-1 bg-transparent border-0 outline-none resize-none text-[13px] text-ink placeholder-ink-subtle py-[4px] leading-relaxed max-h-[120px] focus:ring-0 focus:outline-none"
            style={{ height: 'auto' }}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "p-[8px] rounded-lg transition-all flex items-center justify-center flex-shrink-0",
              input.trim()
                ? "bg-accent hover:bg-accent/90 text-white cursor-pointer"
                : "bg-surface-3 text-ink-subtle cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <Send className="w-[14px] h-[14px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
