import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSocketContext } from '@/contexts/SocketContext';

export interface ChatMessage {
  id: string;
  workspaceId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  _isPending?: boolean; // For optimistic UI states
}

export function useChat(workspaceId: string) {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocketContext();
  const queryKey = ['chat-messages', workspaceId];
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string }>>([]);
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // 1. Fetch workspace messages
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get(`/messages?workspaceId=${workspaceId}`);
      return data.data.messages || [];
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch workspace members to resolve typing user names
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      return data.data.members || [];
    },
    enabled: !!workspaceId,
  });

  // Helper: Resolve User Name from cached members list
  const resolveMemberName = (userId: string): string => {
    const member = members.find((m) => m.userId === userId);
    return member?.user?.name || 'Someone';
  };

  // 2. Mutation to send message
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post('/messages', { workspaceId, content });
      return data.data.message as ChatMessage;
    },
    onMutate: async (newContent) => {
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(queryKey);

      // Get current authenticated user details from local state
      const currentUser = queryClient.getQueryData<any>(['auth-user']);

      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        workspaceId,
        senderId: currentUser?.id || 'me',
        content: newContent,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser?.id || 'me',
          name: currentUser?.name || 'Me',
          email: currentUser?.email || '',
          avatarUrl: currentUser?.avatarUrl || null,
        },
        _isPending: true,
      };

      queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
        return old ? [...old, tempMessage] : [tempMessage];
      });

      return { previousMessages };
    },
    onError: (err, newContent, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages);
      }
    },
    onSuccess: (savedMessage, variables, context) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
        if (!old) return [savedMessage];
        // Replace the temporary message with the official backend saved message
        return old.map((m) => (m._isPending && m.content === savedMessage.content ? savedMessage : m));
      });
    },
  });

  // 3. Mutation to delete message
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await api.delete(`/messages/${messageId}`);
      return messageId;
    },
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(queryKey);

      queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
        return old ? old.filter((m) => m.id !== messageId) : [];
      });

      return { previousMessages };
    },
    onError: (err, messageId, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages);
      }
    },
  });

  // 4. Real-time Socket Listener Synchronization
  useEffect(() => {
    if (!socket || !isConnected || !workspaceId) return;

    // Join workspace room for events
    socket.emit('join:workspace', workspaceId);

    // Listen for new messages
    const handleNewMessage = (newMessage: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
        if (!old) return [newMessage];
        // Prevent duplicate append if this is the user who created it and already has it
        if (old.some((m) => m.id === newMessage.id)) return old;
        // Clean up temp optimistic message if it exists
        const withoutTemp = old.filter((m) => !(m._isPending && m.content === newMessage.content));
        return [...withoutTemp, newMessage];
      });
    };

    // Listen for deleted messages
    const handleDeletedMessage = ({ id }: { id: string }) => {
      queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => {
        return old ? old.filter((m) => m.id !== id) : [];
      });
    };

    // Listen for typing indicators
    const handleUserStartedTyping = ({ userId }: { userId: string }) => {
      const name = resolveMemberName(userId);
      setTypingUsers((prev) => {
        if (prev.some((u) => u.id === userId)) return prev;
        return [...prev, { id: userId, name }];
      });

      // Automatically stop typing indicator after 5 seconds of inactivity
      if (typingTimeouts.current[userId]) {
        clearTimeout(typingTimeouts.current[userId]);
      }
      typingTimeouts.current[userId] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
      }, 5000);
    };

    const handleUserStoppedTyping = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
      if (typingTimeouts.current[userId]) {
        clearTimeout(typingTimeouts.current[userId]);
        delete typingTimeouts.current[userId];
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('chat:typing:user_started', handleUserStartedTyping);
    socket.on('chat:typing:user_stopped', handleUserStoppedTyping);

    return () => {
      // Leave room
      socket.emit('leave:workspace', workspaceId);
      socket.off('message:new', handleNewMessage);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('chat:typing:user_started', handleUserStartedTyping);
      socket.off('chat:typing:user_stopped', handleUserStoppedTyping);
      
      // Clean up typing timeouts
      Object.values(typingTimeouts.current).forEach(clearTimeout);
    };
  }, [socket, isConnected, workspaceId, queryClient, members]);

  // 5. Typing emission handlers
  const emitStartTyping = () => {
    if (socket?.connected && workspaceId) {
      socket.emit('chat:typing:start', { workspaceId });
    }
  };

  const emitStopTyping = () => {
    if (socket?.connected && workspaceId) {
      socket.emit('chat:typing:stop', { workspaceId });
    }
  };

  return {
    messages,
    isLoading,
    typingUsers,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    deleteMessage: deleteMutation.mutateAsync,
    emitStartTyping,
    emitStopTyping,
  };
}
