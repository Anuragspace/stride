import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Copy, Trash2, Loader2 } from 'lucide-react';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

export function ChatPanel({ isOpen, onClose, workspaceId, workspaceName }: ChatPanelProps) {
  const { user: currentUser } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
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
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom on new messages or open
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Handle typing emissions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      emitStartTyping();
    }

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      emitStopTyping();
    }, 2000);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const messageText = input.trim();
    setInput('');
    setIsTyping(false);
    emitStopTyping();

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    try {
      await sendMessage(messageText);
    } catch (err: any) {
      showError(err.message || 'Failed to send message');
      setInput(messageText); // Restore input on error
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
      showSuccess('Message copied to clipboard');
    } catch {
      showError('Failed to copy message');
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

  // Format message timestamp cleanly
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 380 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 380 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed top-[52px] right-0 bottom-0 w-[380px] bg-[#12141C] border-l border-white/[0.08] shadow-2xl flex flex-col z-[40] overflow-hidden"
        >
          {/* Header */}
          <div className="h-[56px] px-[20px] flex items-center justify-between border-b border-white/[0.06] flex-shrink-0">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-white truncate">
                # workspace-chat
              </h2>
              <p className="text-[11px] text-[#8E929E] truncate">
                Collaborative room for {workspaceName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-[6px] rounded-lg text-[#8E929E] hover:text-white hover:bg-white/[0.06] transition-all"
              aria-label="Close chat"
            >
              <X className="w-[16px] h-[16px]" />
            </button>
          </div>

          {/* Messages list */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-[20px] py-[16px] flex flex-col gap-[16px] custom-scrollbar"
          >
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#8E929E] gap-[10px]">
                <Loader2 className="w-[20px] h-[20px] animate-spin text-blue-500" />
                <span className="text-[12px]">Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-[20px] text-[#8E929E]">
                <div className="w-[48px] h-[48px] rounded-full bg-white/[0.04] flex items-center justify-center mb-[12px]">
                  💬
                </div>
                <h3 className="text-[14px] font-bold text-white mb-[4px]">
                  Welcome to #workspace-chat!
                </h3>
                <p className="text-[12px] leading-relaxed max-w-[240px]">
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
                    {isNewDay && (
                      <div className="flex items-center gap-[10px] py-[8px] flex-shrink-0">
                        <div className="flex-1 h-[1px] bg-white/[0.04]" />
                        <span className="text-[10px] font-semibold text-[#8E929E] uppercase tracking-wider">
                          {formatDate(msg.createdAt)}
                        </span>
                        <div className="flex-1 h-[1px] bg-white/[0.04]" />
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "group relative flex gap-[12px] hover:bg-white/[0.02] -mx-[20px] px-[20px] py-[4px] transition-all",
                        isSameSender && !isNewDay ? "-mt-[12px]" : ""
                      )}
                    >
                      {/* Avatar */}
                      {(!isSameSender || isNewDay) ? (
                        <Avatar
                          src={msg.sender.avatarUrl || undefined}
                          name={msg.sender.name}
                          size="md"
                          className="flex-shrink-0 mt-[2px]"
                        />
                      ) : (
                        <div className="w-[32px] flex-shrink-0 flex justify-end pr-[4px]">
                          <span className="text-[9px] text-[#5C606C] opacity-0 group-hover:opacity-100 transition-opacity mt-[2px]">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {(!isSameSender || isNewDay) && (
                          <div className="flex items-baseline gap-[8px] mb-[2px]">
                            <span className="text-[13px] font-bold text-white truncate">
                              {msg.sender.name}
                            </span>
                            <span className="text-[10px] text-[#5C606C]">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <p
                          className={cn(
                            "text-[13px] text-[#D1D4DB] leading-relaxed break-words whitespace-pre-wrap",
                            msg._isPending ? "opacity-60" : ""
                          )}
                        >
                          {msg.content}
                        </p>
                      </div>

                      {/* Hover action menu */}
                      {!msg._isPending && (
                        <div className="absolute right-[20px] top-[-8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-[#1B1D26] border border-white/[0.08] rounded-lg shadow-lg overflow-hidden">
                          <button
                            onClick={() => handleCopy(msg.content)}
                            title="Copy message"
                            className="p-[6px] hover:bg-white/[0.04] text-[#8E929E] hover:text-white transition-all border-r border-white/[0.08]"
                          >
                            <Copy className="w-[12px] h-[12px]" />
                          </button>
                          {(isMe || currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              title="Delete message"
                              className="p-[6px] hover:bg-red-500/10 text-[#8E929E] hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-[12px] h-[12px]" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Typing Indicators & Footer Input */}
          <div className="p-[20px] border-t border-white/[0.06] bg-[#12141C] flex-shrink-0">
            {/* Live Typing Indicator */}
            <div className="h-[18px] mb-[4px] px-[4px]">
              {typingUsers.length > 0 && (
                <span className="text-[10px] text-blue-400 font-medium flex items-center gap-[4px] animate-pulse">
                  💬 {typingUsers.map((u) => u.name).join(', ')}{' '}
                  {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              )}
            </div>

            {/* Input card */}
            <form
              onSubmit={handleSend}
              className="bg-[#1B1D26] border border-white/[0.08] focus-within:border-blue-500/50 rounded-xl px-[12px] py-[8px] flex items-end gap-[8px] transition-all"
            >
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Message #workspace-chat..."
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-[13px] text-white placeholder-[#5C606C] py-[4px] leading-relaxed max-h-[120px] focus:ring-0 focus:outline-none"
                style={{
                  height: 'auto',
                }}
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
                    ? "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                    : "bg-white/[0.04] text-[#5C606C] cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                <Send className="w-[14px] h-[14px]" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
