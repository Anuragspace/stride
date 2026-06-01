// ── Stride Type Definitions ──

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  settings?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: 'admin' | 'manager' | 'member';
  user: User;
  joinedAt: string;
}

export interface Canvas {
  id: string;
  workspaceId: string;
  name: string;
  emoji?: string | null;
  visibility: 'public' | 'private';
  createdBy: string;
  defaultView: ViewMode;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  isStarred?: boolean;
  _count?: { cards: number };
}

export type CardStatus = string;
export type CardPriority = 0 | 1 | 2 | 3;
export type CardType = 'task' | 'bug' | 'feature' | 'design' | 'research';
export type ViewMode = 'board' | 'table' | 'list' | 'calendar';

export interface Card {
  id: string;
  canvasId: string;
  columnId?: string;
  title: string;
  description?: string | null;
  status: string;
  priority: number;
  type: string;
  orderIndex: number;
  dueDate?: string | null;
  createdBy: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  assignees?: CardAssignee[];
  labels?: CardLabel[];
  subtasks?: SubTask[];
  creator?: User;
  completed?: boolean;
}

export interface CardAssignee {
  cardId: string;
  userId: string;
  user: User;
  assignedAt: string;
}

export interface CardLabel {
  cardId: string;
  label: string;
  color?: string | null;
  id?: string;
  name?: string;
}

export interface CanvasColumn {
  id: string;
  canvasId: string;
  name: string;
  color?: string | null;
  orderIndex: number;
  wipLimit?: number | null;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface SubTask {
  id: string;
  cardId: string;
  title: string;
  completed: boolean;
  orderIndex: number;
  createdAt: string;
}

export interface Column {
  id: string;
  name: string;
  color?: string | null;
  orderIndex: number;
  wipLimit?: number | null;
  cards: Card[];
}

export interface Event {
  id: string;
  workspaceId: string;
  canvasId?: string | null;
  cardId?: string | null;
  actorId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  actor?: User;
  card?: Card;
  canvas?: Canvas;

  // Frontend compatibility fields
  action: string;
  entityType?: string;
  entity_type: string;
  metadata?: any;
  user?: User;
  created_at?: string;
}

export interface Notification {
  id: string;
  userId: string;
  eventId: string;
  read: boolean;
  createdAt: string;
  event?: Event;
}

export interface Invite {
  id: string;
  workspaceId: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  token: string;
  expiresAt: string;
  accepted: boolean;
  createdAt: string;
}

// ── API Response Types ──

export interface ApiEnvelope<T> {
  data: T;
  error: { code: string; message: string } | null;
  meta: Record<string, unknown> | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  workspace?: Workspace;
}

export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Filter & Sort Types ──
export type SortField = 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  status?: CardStatus[];
  priority?: CardPriority[];
  type?: CardType[];
  assignee?: string[];
  label?: string[];
  dueDate?: 'overdue' | 'today' | 'this_week' | 'no_date';
}

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

// ── Toast Types ──
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// ── Socket Event Types ──
export interface SocketCardEvent {
  type: 'card:created' | 'card:updated' | 'card:deleted' | 'card:moved';
  card: Card;
  canvas_id: string;
}

export interface SocketCanvasEvent {
  type: 'canvas:created' | 'canvas:updated' | 'canvas:deleted';
  canvas: Canvas;
}
