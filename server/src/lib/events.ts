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
 * Fire-and-forget: persist the event to DB and broadcast via Socket.io.
 * NON-BLOCKING — API handlers return immediately after the primary DB write.
 * Removed the `include: { actor }` fetch — saves one DB join per event.
 */
export function fireEvent(data: EventData): void {
  prisma.event
    .create({
      data: {
        type: data.type,
        actorId: data.actorId,
        workspaceId: data.workspaceId || null,
        canvasId: data.canvasId || null,
        cardId: data.cardId || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
      // No include — we only need the IDs to broadcast, not the full actor object
      select: {
        id: true,
        type: true,
        actorId: true,
        workspaceId: true,
        canvasId: true,
        cardId: true,
        metadata: true,
        createdAt: true,
      },
    })
    .then((event) => {
      if (!io) return;

      const payload = {
        ...event,
        metadata: event.metadata ? JSON.parse(event.metadata as string) : null,
      };

      // Broadcast to canvas room
      if (data.canvasId) {
        io.to(`canvas:${data.canvasId}`).emit('event', payload);
      }

      // Broadcast to workspace room
      if (data.workspaceId) {
        io.to(`workspace:${data.workspaceId}`).emit('event', payload);
      }
    })
    .catch((err) => {
      // Never crash the server over an audit-log failure
      console.error('[fireEvent] Failed:', err?.message ?? err);
    });
}

/**
 * Create a notification for a user and push it via Socket.io.
 * Fire-and-forget so the caller API route returns immediately.
 */
export function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): void {
  prisma.notification
    .create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
    .then((notification) => {
      if (!io) return;
      io.to(`user:${params.userId}`).emit('notification', {
        ...notification,
        metadata: notification.metadata
          ? JSON.parse(notification.metadata as string)
          : null,
      });
    })
    .catch((err) => {
      console.error('[createNotification] Failed:', err?.message ?? err);
    });
}
