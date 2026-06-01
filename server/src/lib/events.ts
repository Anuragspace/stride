import prisma from './prisma';
import { Server as SocketIOServer } from 'socket.io';

// All supported event types
export type EventType =
  | 'card.created'
  | 'card.completed'
  | 'card.reopened'
  | 'card.status_changed'
  | 'card.priority_changed'
  | 'card.assigned'
  | 'card.unassigned'
  | 'card.due_date_changed'
  | 'card.edited'
  | 'card.moved'
  | 'card.deleted'
  | 'card.archived'
  | 'card.restored'
  | 'comment.added'
  | 'comment.deleted'
  | 'attachment.added'
  | 'member.joined'
  | 'member.role_changed'
  | 'canvas.created'
  | 'canvas.archived';

export interface EventData {
  type: EventType;
  actorId: string;
  workspaceId?: string;
  canvasId?: string;
  cardId?: string;
  metadata?: Record<string, unknown>;
}

let io: SocketIOServer | null = null;

export function setSocketIO(socketIO: SocketIOServer): void {
  io = socketIO;
}

export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * Fire an event: persist to DB and broadcast via Socket.io
 */
export async function fireEvent(data: EventData): Promise<void> {
  // 1. Persist event to database
  const event = await prisma.event.create({
    data: {
      type: data.type,
      actorId: data.actorId,
      workspaceId: data.workspaceId || null,
      canvasId: data.canvasId || null,
      cardId: data.cardId || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
    include: {
      actor: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  // 2. Broadcast via Socket.io if available
  if (io) {
    const payload = {
      ...event,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
    };

    // Broadcast to canvas room
    if (data.canvasId) {
      io.to(`canvas:${data.canvasId}`).emit('event', payload);
    }

    // Broadcast to workspace room
    if (data.workspaceId) {
      io.to(`workspace:${data.workspaceId}`).emit('event', payload);
    }
  }
}

/**
 * Create a notification for a user and push it via Socket.io
 */
export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });

  if (io) {
    io.to(`user:${params.userId}`).emit('notification', {
      ...notification,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
    });
  }
}
