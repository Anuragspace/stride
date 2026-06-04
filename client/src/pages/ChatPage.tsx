import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Send,
  Copy,
  Trash2,
  Loader2,
  Users,
  MessageSquare,
  Activity,
  User,
  Plus,
  Smile,
  CheckCheck,
  Bot,
  Hash,
  Shield,
  HelpCircle,
  Keyboard,
  Compass
} from 'lucide-react';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';

interface ChatRoom {
  id: string;
  type: 'group' | 'activity' | 'bot';
  name: string;
  avatarIcon: React.ReactNode;
  description: string;
  unreadCount?: number;
  lastMessageText?: string;
  lastMessageTime?: string;
}

export default function ChatPage() {
  const { workspace, user: currentUser } = useAuth();
  const workspaceId = workspace?.id || '';
  const workspaceName = workspace?.name || 'Workspace';

  const { success: showSuccess, error: showError } = useToast();
  
  // Real-time Chat Hook for Workspace Group Chat
  const {
    messages: liveMessages,
    isLoading: isLiveChatLoading,
    typingUsers,
    sendMessage: sendLiveMessage,
    deleteMessage: deleteLiveMessage,
    emitStartTyping,
    emitStopTyping,
  } = useChat(workspaceId);

  // Real-time Activity Hook
  const { events, isLoading: isEventsLoading } = useEvents();

  // Local State
  const [activeRoomId, setActiveRoomId] = useState<string>('workspace-group');
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favorites'>('all');
  const [botMessages, setBotMessages] = useState<ChatMessage[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isTypingState, setIsTypingState] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  // Set default bot welcome message
  useEffect(() => {
    if (botMessages.length === 0) {
      setBotMessages([
        {
          id: 'bot-welcome',
          workspaceId,
          senderId: 'stride-bot',
          content: `Hi ${currentUser?.name || 'there'}! 👋 I am your **Stride AI Assistant**. You can ask me questions about how to use Stride, canvases, cards, or keyboard shortcuts. Try typing "tell me about canvases" or "shortcuts"!`,
          createdAt: new Date().toISOString(),
          sender: {
            id: 'stride-bot',
            name: 'Stride Bot',
            email: 'bot@stride.com',
            avatarUrl: null,
          },
        },
      ]);
    }
  }, [botMessages, currentUser, workspaceId]);

  // Convert activities into message formats
  const activityMessages: ChatMessage[] = events.map((e) => {
    let textContent = '';
    if (e.entity_type === 'card') {
      textContent = `card "${e.card?.title || 'a card'}" was ${e.action || 'updated'}`;
    } else if (e.entity_type === 'canvas') {
      textContent = `canvas "${e.canvas?.name || 'a canvas'}" was ${e.action || 'updated'}`;
    } else {
      textContent = `performed operation: ${e.type || 'activity'}`;
    }

    return {
      id: e.id,
      workspaceId: e.workspaceId,
      senderId: e.user?.id || 'system-bot',
      content: textContent,
      createdAt: e.created_at || new Date().toISOString(),
      sender: {
        id: e.user?.id || 'system-bot',
        name: e.user?.name || 'System Actor',
        email: e.user?.email || '',
        avatarUrl: e.user?.avatar_url || null,
      },
    };
  });

  // Rooms Config
  const rooms: ChatRoom[] = [
    {
      id: 'workspace-group',
      type: 'group',
      name: `# workspace-chat`,
      avatarIcon: <Hash className="w-[18px] h-[18px] text-[#1c1c1c]" />,
      description: `Collaborative room for all ${workspaceName} members`,
      unreadCount: 0,
      lastMessageText: liveMessages.length > 0 ? liveMessages[liveMessages.length - 1].content : 'No messages yet',
      lastMessageTime: liveMessages.length > 0 ? formatTime(liveMessages[liveMessages.length - 1].createdAt) : '',
    },
    {
      id: 'activity-log',
      type: 'activity',
      name: `🔔 activity-log`,
      avatarIcon: <Activity className="w-[18px] h-[18px] text-[#1c1c1c]" />,
      description: 'Live broadcast of canvas and card updates',
      unreadCount: events.length > 0 ? 1 : 0,
      lastMessageText: activityMessages.length > 0 ? activityMessages[0].content : 'No activity logged yet',
      lastMessageTime: activityMessages.length > 0 ? formatTime(activityMessages[0].createdAt) : '',
    },
    {
      id: 'stride-bot',
      type: 'bot',
      name: `🤖 Stride Bot`,
      avatarIcon: <Bot className="w-[18px] h-[18px] text-[#1c1c1c]" />,
      description: 'Your helpful workspace bot assistant',
      unreadCount: 0,
      lastMessageText: botMessages.length > 0 ? botMessages[botMessages.length - 1].content : '',
      lastMessageTime: botMessages.length > 0 ? formatTime(botMessages[botMessages.length - 1].createdAt) : '',
    },
  ];

  // Active chat calculation
  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

  const getActiveMessages = (): ChatMessage[] => {
    switch (activeRoomId) {
      case 'workspace-group':
        return liveMessages;
      case 'activity-log':
        return [...activityMessages].reverse(); // chronological for bubble list
      case 'stride-bot':
        return botMessages;
      default:
        return [];
    }
  };

  const messages = getActiveMessages();

  // Scroll to bottom on load / message add
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeRoomId]);

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

  // Handle typing emissions for Workspace Chat
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    if (activeRoomId !== 'workspace-group') return;
    
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

    if (activeRoomId === 'workspace-group') {
      setIsTypingState(false);
      emitStopTyping();
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
      try {
        await sendLiveMessage(text);
      } catch (err: any) {
        showError(err.message || 'Failed to send message');
        setInput(text);
      }
    } else if (activeRoomId === 'stride-bot') {
      // User message
      const userMsgId = `bot-user-${Date.now()}`;
      const newMsg: ChatMessage = {
        id: userMsgId,
        workspaceId,
        senderId: currentUser?.id || 'user',
        content: text,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser?.id || 'user',
          name: currentUser?.name || 'User',
          email: currentUser?.email || '',
          avatarUrl: currentUser?.avatarUrl || null,
        },
      };

      setBotMessages((prev) => [...prev, newMsg]);
      setIsBotTyping(true);

      // Trigger bot response
      setTimeout(() => {
        let reply = '';
        const lowercaseText = text.toLowerCase();

        if (lowercaseText.includes('canvas') || lowercaseText.includes('board')) {
          reply = '🎨 **Canvases** are Stride\'s core workspace visual boards. They act as project Kanban pipelines. Within a canvas, you can create columns (e.g., "To Do", "In Progress", "Done") and drag cards between them to transition progress statuses in real-time.';
        } else if (lowercaseText.includes('shortcut') || lowercaseText.includes('key') || lowercaseText.includes('command')) {
          reply = '⌨️ **Keyboard Shortcuts:** \n\n• `⌘K` or `Ctrl+K`: Search through the workspace and activate the Command Palette.\n• `Esc`: Close open modal forms or overlays.\n• `Shift + Enter`: Start a new paragraph in a text area or rich text editor instead of submitting.';
        } else if (lowercaseText.includes('card') || lowercaseText.includes('task')) {
          reply = '📝 **Cards** are discrete units of task items. In Stride, cards contain description inputs, nested checkable items, priority selectors, and assignee details. Click on any card in a canvas to customize its settings!';
        } else if (lowercaseText.includes('hello') || lowercaseText.includes('hi') || lowercaseText.includes('hey')) {
          reply = `Hello! How can I help you today? You can query me about **canvases**, **cards**, or **keyboard shortcuts**.`;
        } else {
          reply = '🤖 I am your Stride helper bot. Currently I am built to answer queries about **canvases**, **cards**, or **keyboard shortcuts**. Try querying one of those keywords!';
        }

        const botMsg: ChatMessage = {
          id: `bot-reply-${Date.now()}`,
          workspaceId,
          senderId: 'stride-bot',
          content: reply,
          createdAt: new Date().toISOString(),
          sender: {
            id: 'stride-bot',
            name: 'Stride Bot',
            email: 'bot@stride.com',
            avatarUrl: null,
          },
        };

        setIsBotTyping(false);
        setBotMessages((prev) => [...prev, botMsg]);
      }, 900);
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
      await deleteLiveMessage(messageId);
      showSuccess('Message deleted');
    } catch (err: any) {
      showError(err.message || 'Failed to delete message');
    }
  };

  // Filters rooms list based on search and buttons
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          room.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (activeFilter === 'unread') {
      return (room.unreadCount || 0) > 0;
    }
    if (activeFilter === 'favorites') {
      return room.type === 'bot'; // Mock bot as favorite
    }
    return true;
  });

  return (
    <div className="h-full flex w-full bg-[#f7f4ed] text-[#1c1c1c] overflow-hidden select-none font-sans">
      {/* 1. Left Panel (Slack/WhatsApp Inbox Sidebar) */}
      <div className="w-[320px] md:w-[360px] border-r border-[#eceae4] flex flex-col bg-[#fcfbf8] h-full flex-shrink-0">
        
        {/* Inbox Header */}
        <div className="px-[20px] pt-[20px] pb-[12px] border-b border-[#eceae4] flex-shrink-0">
          <div className="flex items-center justify-between mb-[16px]">
            <h1 className="text-[20px] font-bold text-[#1c1c1c] tracking-tight">
              Chats
            </h1>
            <div className="flex items-center gap-[8px]">
              <button 
                title="Workspace Members"
                className="w-[32px] h-[32px] rounded-full bg-[#f7f4ed] border border-[#eceae4] flex items-center justify-center hover:bg-white/[0.04] active:opacity-85 shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px] cursor-pointer"
              >
                <Users className="w-[14px] h-[14px] text-[#1c1c1c]" />
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative mb-[12px]">
            <Search className="absolute left-[10px] top-[9px] w-[14px] h-[14px] text-[#5f5f5d]" />
            <input
              type="text"
              placeholder="Search or start a new chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f7f4ed] border border-[#eceae4] focus-within:border-black/25 rounded-md pl-[32px] pr-[12px] py-[6px] text-[13px] text-[#1c1c1c] placeholder-[#5f5f5d] transition-all"
            />
          </div>

          {/* WhatsApp-like Filters */}
          <div className="flex gap-[6px]">
            {(['all', 'unread', 'favorites'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-[12px] py-[4px] rounded-full text-[11px] font-medium border capitalize transition-all cursor-pointer",
                  activeFilter === filter
                    ? "bg-[#1c1c1c] text-[#fcfbf8] border-[#1c1c1c] shadow-[rgba(255,255,255,0.2)_0px_0.5px_0px_0px_inset,rgba(0,0,0,0.2)_0px_0px_0px_0.5px_inset]"
                    : "bg-transparent text-[#5f5f5d] border-[#eceae4] hover:text-[#1c1c1c] hover:bg-[#f7f4ed]"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Rooms List */}
        <div className="flex-1 overflow-y-auto py-[8px] space-y-[2px] custom-scrollbar bg-[#fcfbf8]">
          {filteredRooms.map((room) => {
            const isActive = activeRoomId === room.id;
            return (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={cn(
                  "w-full px-[16px] py-[10px] flex items-start gap-[12px] transition-all text-left relative hover:bg-[#f7f4ed]/50",
                  isActive ? "bg-[#f7f4ed] border-l-2 border-[#1c1c1c]" : ""
                )}
              >
                {/* Custom icon avatar container */}
                <div className="w-[36px] h-[36px] rounded-full bg-[#eceae4] border border-[#eceae4] flex items-center justify-center flex-shrink-0 relative">
                  {room.avatarIcon}
                  {room.type === 'bot' && (
                    <span className="absolute bottom-0 right-0 w-[8px] h-[8px] bg-green-500 rounded-full border border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-[2px]">
                    <span className="text-[13px] font-bold text-[#1c1c1c] truncate">
                      {room.name}
                    </span>
                    <span className="text-[10px] text-[#5f5f5d]">
                      {room.lastMessageTime}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5f5f5d] truncate leading-normal">
                    {room.lastMessageText || room.description}
                  </p>
                </div>

                {/* Unread dot indicator */}
                {room.unreadCount ? (
                  <div className="absolute right-[16px] bottom-[14px] bg-[#1c1c1c] text-[#fcfbf8] text-[9px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center">
                    {room.unreadCount}
                  </div>
                ) : null}
              </button>
            );
          })}

          {filteredRooms.length === 0 && (
            <div className="text-center py-[40px] px-[20px] text-[#5f5f5d] text-[12px]">
              No chats found.
            </div>
          )}
        </div>
      </div>

      {/* 2. Right Panel (Main Active Chat Area) */}
      <div className="flex-1 flex flex-col h-full bg-[#f7f4ed]">
        {/* Chat Feed Header */}
        <div className="h-[56px] px-[24px] border-b border-[#eceae4] bg-[#fcfbf8]/80 backdrop-blur-xs flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-[12px]">
            <div className="w-[32px] h-[32px] rounded-full bg-[#eceae4] flex items-center justify-center flex-shrink-0">
              {activeRoom.avatarIcon}
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[#1c1c1c]">
                {activeRoom.name}
              </h2>
              <p className="text-[10px] text-[#5f5f5d] truncate max-w-[250px] md:max-w-none">
                {activeRoom.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-[12px]">
            {activeRoom.type === 'group' && (
              <span className="text-[11px] text-[#5f5f5d] font-medium bg-[#eceae4] px-[8px] py-[2px] rounded-md">
                Group Chat
              </span>
            )}
            {activeRoom.type === 'activity' && (
              <span className="text-[11px] text-[#5f5f5d] font-medium bg-[#eceae4] px-[8px] py-[2px] rounded-md">
                System Broadcast
              </span>
            )}
            {activeRoom.type === 'bot' && (
              <span className="text-[11px] text-[#5f5f5d] font-medium bg-[#eceae4] px-[8px] py-[2px] rounded-md">
                Bot Helper
              </span>
            )}
          </div>
        </div>

        {/* Messages Feed View */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-[24px] py-[20px] flex flex-col gap-[12px] bg-[#f7f4ed] custom-scrollbar"
        >
          {/* Loaders */}
          {activeRoomId === 'workspace-group' && isLiveChatLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#5f5f5d] gap-[10px]">
              <Loader2 className="w-[18px] h-[18px] animate-spin text-[#1c1c1c]" />
              <span className="text-[11px]">Syncing messages...</span>
            </div>
          ) : activeRoomId === 'activity-log' && isEventsLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#5f5f5d] gap-[10px]">
              <Loader2 className="w-[18px] h-[18px] animate-spin text-[#1c1c1c]" />
              <span className="text-[11px]">Querying activity feeds...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-[40px] text-[#5f5f5d]">
              <div className="w-[44px] h-[44px] rounded-full bg-[#eceae4] flex items-center justify-center mb-[12px]">
                💬
              </div>
              <h3 className="text-[13px] font-bold text-[#1c1c1c] mb-[4px]">
                No messages in {activeRoom.name}
              </h3>
              <p className="text-[11px] max-w-[200px] leading-relaxed">
                Send a message to begin the collaboration!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderId === currentUser?.id;
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
              const isNewDay = !prevMsg || formatDate(prevMsg.createdAt) !== formatDate(msg.createdAt);

              // Message alignment logic
              const alignRight = isMe && activeRoomId !== 'activity-log';

              return (
                <React.Fragment key={msg.id}>
                  {/* Date Stamp Separator */}
                  {isNewDay && (
                    <div className="flex items-center gap-[10px] py-[10px] flex-shrink-0">
                      <div className="flex-1 h-[1px] bg-[#eceae4]" />
                      <span className="text-[9px] font-semibold text-[#5f5f5d] uppercase tracking-wider bg-[#fcfbf8] border border-[#eceae4] px-[8px] py-[2px] rounded-full">
                        {formatDate(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-[1px] bg-[#eceae4]" />
                    </div>
                  )}

                  {/* Speech Bubble Container */}
                  <div
                    className={cn(
                      "group flex gap-[8px] max-w-[85%] md:max-w-[70%] relative transition-all rounded-xl",
                      alignRight ? "self-end" : "self-start",
                      isSameSender && !isNewDay ? "-mt-[4px]" : "mt-[6px]"
                    )}
                  >
                    {/* Avatar on Left (for received messages, excluding consecutive identical senders) */}
                    {!alignRight && (!isSameSender || isNewDay) && (
                      <Avatar
                        src={msg.sender.avatarUrl || undefined}
                        name={msg.sender.name}
                        size="sm"
                        className="flex-shrink-0 mt-[2px] border border-[#eceae4]"
                      />
                    )}
                    
                    {/* Ghost block for avatar placeholder to align bubbles properly */}
                    {!alignRight && isSameSender && !isNewDay && (
                      <div className="w-[28px] flex-shrink-0" />
                    )}

                    {/* Speech Bubble Card */}
                    <div
                      className={cn(
                        "p-[10px] rounded-xl flex flex-col shadow-[rgba(0,0,0,0.03)_0px_1px_2px_0px] relative border",
                        alignRight
                          ? "bg-[#e2edd3] border-[#d2dfbf] rounded-tr-xs" // whatsapp green highlight
                          : "bg-[#fcfbf8] border-[#eceae4] rounded-tl-xs" // warm off-white
                      )}
                    >
                      {/* Sender Name label */}
                      {!alignRight && (!isSameSender || isNewDay) && (
                        <span className="text-[10px] font-bold text-[#1c1c1c] mb-[2px]">
                          {msg.sender.name}
                        </span>
                      )}

                      {/* Content text */}
                      <p className="text-[12.5px] text-[#1c1c1c] leading-relaxed break-words whitespace-pre-wrap">
                        {msg.content}
                      </p>

                      {/* Timestamp & tick status */}
                      <div className="flex items-center justify-end gap-[4px] mt-[4px] self-end">
                        <span className="text-[9px] text-[#5f5f5d]">
                          {formatTime(msg.createdAt)}
                        </span>
                        {alignRight && (
                          <CheckCheck className="w-[12px] h-[12px] text-green-600" />
                        )}
                      </div>

                      {/* Hover action menu overlay */}
                      {activeRoomId === 'workspace-group' && (
                        <div className="absolute right-[4px] top-[-10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-[#fcfbf8] border border-[#eceae4] rounded-md shadow-sm overflow-hidden z-20">
                          <button
                            onClick={() => handleCopy(msg.content)}
                            title="Copy text"
                            className="p-[4px] hover:bg-[#eceae4] text-[#1c1c1c] transition-all border-r border-[#eceae4]"
                          >
                            <Copy className="w-[10px] h-[10px]" />
                          </button>
                          {(isMe || currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              title="Delete message"
                              className="p-[4px] hover:bg-red-500/10 text-red-500 transition-all"
                            >
                              <Trash2 className="w-[10px] h-[10px]" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Typing bubbles */}
          {activeRoomId === 'workspace-group' && typingUsers.length > 0 && (
            <div className="self-start flex items-center gap-[8px] bg-[#fcfbf8] border border-[#eceae4] px-[12px] py-[6px] rounded-full text-[10px] text-blue-600 font-semibold animate-pulse shadow-sm">
              <span className="flex gap-[2px] items-center">
                <span className="w-[4px] h-[4px] bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-[4px] h-[4px] bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-[4px] h-[4px] bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span>{typingUsers.map((u) => u.name).join(', ')} typing...</span>
            </div>
          )}

          {isBotTyping && (
            <div className="self-start flex items-center gap-[8px] bg-[#fcfbf8] border border-[#eceae4] px-[12px] py-[6px] rounded-full text-[10px] text-[#5f5f5d] font-semibold animate-pulse shadow-sm">
              <Bot className="w-[12px] h-[12px] text-[#1c1c1c]" />
              <span>Stride Bot is writing...</span>
            </div>
          )}
        </div>

        {/* Footer Chat Input (WhatsApp/Lovable inspired card) */}
        {activeRoom.type !== 'activity' && (
          <div className="p-[20px] border-t border-[#eceae4] bg-[#fcfbf8]/85 backdrop-blur-xs flex-shrink-0 z-10">
            <form
              onSubmit={handleSend}
              className="bg-[#fcfbf8] border border-[#eceae4] focus-within:border-black/25 rounded-xl px-[12px] py-[8px] flex items-end gap-[8px] transition-all shadow-[rgba(0,0,0,0.01)_0px_2px_4px]"
            >
              <button
                type="button"
                className="p-[6px] rounded-lg text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-[#f7f4ed] transition-all flex-shrink-0 cursor-pointer"
                title="Emojis"
              >
                <Smile className="w-[16px] h-[16px]" />
              </button>

              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeRoomId === 'stride-bot'
                    ? "Ask Stride Bot a question..."
                    : "Type a message to #workspace-chat..."
                }
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-[13px] text-[#1c1c1c] placeholder-[#5f5f5d] py-[4px] leading-relaxed max-h-[120px] focus:ring-0 focus:outline-none"
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
                    ? "bg-[#1c1c1c] hover:bg-black/90 text-[#fcfbf8] shadow-[rgba(255,255,255,0.2)_0px_0.5px_0px_0px_inset,rgba(0,0,0,0.2)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.05)_0px_1px_2px_0px] cursor-pointer"
                    : "bg-[#eceae4] text-[#5f5f5d]/50 cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                <Send className="w-[14px] h-[14px]" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
