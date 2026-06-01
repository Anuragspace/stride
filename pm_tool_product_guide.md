# Project Management Tool — Full Product Guide
> Built for coding agents. Follow the attached design system MD for all UI decisions.
> Reference products for interaction quality: Slack, Linear, Notion.

---

## Table of Contents
1. Product Vision
2. Auth & Onboarding
3. Roles & Permissions
4. Canvas
5. Cards — Data Fields
6. Card Lifecycle
7. Board Interactions
8. Views & Filters
9. Events & Activity
10. Notifications
11. Navigation (Sidebar)
12. Database Schema
13. API Design
14. Real-time (WebSocket)
15. Design & UX Standards
16. Tech Stack

---

## 1. Product Vision

A team project management tool where an admin creates a workspace, invites teammates, and organises work into canvases (boards). Each canvas holds cards. Cards are draggable, fully editable, and every action fires a typed event logged in a real-time activity feed. Views include Board, Table, List, and Calendar. Filters, grouping, and sort are first-class. The interaction quality target is Slack/Linear — every hover, empty state, and loading skeleton is intentionally designed.

---

## 2. Auth & Onboarding

### Sign-up flow

1. User lands on marketing page → clicks "Start for free"
2. Enter: name, email, password — OR — OAuth via Google / GitHub
3. Email verification link sent → click to confirm account
4. Workspace name prompt: "What's your team called?" → creates a URL slug (e.g. `acme.yourapp.io`)
5. Admin role auto-assigned to workspace creator
6. Redirect to empty dashboard with onboarding checklist widget (progress bar showing setup steps)

### Invite teammates (admin flow)

1. Settings → Members → "Invite people"
2. Enter emails comma-separated OR share a magic invite link
3. Invitees receive email with time-limited token (72-hour expiry)
4. Clicking link → signup page with workspace pre-filled → user sets password
5. Role defaults to Member; admin can promote to Manager or Admin before or after acceptance
6. Invitees appear in Members list as "Pending" until they accept

### Login flow

- Standard email + password OR SSO (Google OAuth 2.0, GitHub OAuth)
- On success: issue JWT access token (15-min expiry, stored in memory) + refresh token (httpOnly cookie, 30-day expiry)
- Silent token refresh: when access token expires, client auto-requests new one using refresh token cookie
- Optional TOTP-based 2FA (authenticator app) — admin can enforce workspace-wide
- "Remember this device" checkbox bypasses 2FA for 30 days on trusted devices
- Logout: clears httpOnly cookie, invalidates refresh token server-side

---

## 3. Roles & Permissions

| Permission                  | Admin | Manager      | Member       |
|-----------------------------|-------|--------------|--------------|
| Create / delete canvas      | ✓     | ✓            | –            |
| Invite / remove members     | ✓     | –            | –            |
| Create, edit, delete cards  | ✓     | ✓            | ✓            |
| Assign cards to others      | ✓     | ✓            | Own cards only |
| Manage workspace settings   | ✓     | –            | –            |
| View all canvases           | ✓     | ✓            | If added     |
| Change member roles         | ✓     | –            | –            |
| Archive / restore cards     | ✓     | ✓            | Own cards only |

---

## 4. Canvas

A canvas is a board that contains cards. Each canvas has its own URL, member list, and view settings.

### Creating a canvas (admin/manager)

1. Sidebar → "+" icon next to "Canvases" → modal opens
2. Enter: canvas name, optional emoji icon, visibility (public within workspace OR invite-only)
3. Add members from workspace roster (typeahead search by name/email)
4. Choose default view: Board, Table, or List
5. Submit → canvas created, user lands inside it with an empty state prompt
6. Backend: creates canvas record with `owner_id`, `members[]`, `settings`, timestamps

### Canvas settings

- Rename, change emoji, change visibility
- Manage members: add/remove, no role granularity (canvas-level access is binary)
- Custom status columns: add, rename, reorder, delete status values
- Default view preference per canvas
- Archive canvas (hides from sidebar, preserves all data)
- Delete canvas (admin only, requires confirmation, hard delete after 30-day grace)

---

## 5. Cards — Data Fields

Every card can hold the following fields:

| Field         | Type              | Details                                                                 |
|---------------|-------------------|-------------------------------------------------------------------------|
| Title         | Short text        | Required. Inline-editable on the board tile.                            |
| Status        | Enum (custom)     | Maps to a canvas column. Default: Not Started, In Progress, On Hold, Done. Customisable per canvas. |
| Priority      | 1–3 rating        | Displayed as star icons (1 = low, 2 = medium, 3 = high). Quick-click on tile. |
| Assignee      | Member(s)         | Single or multiple. Shows avatar + name. Used for grouping in Board view. |
| Due date      | Date              | Date picker. Turns red if overdue. Shows overdue badge on tile.         |
| Description   | Rich text         | Markdown-supported. Supports checklists, code blocks, links, inline images. |
| Attachments   | Files             | Upload images, PDFs, docs. Stored in S3. Preview in-app.               |
| Labels / tags | Coloured chips    | Free-form, user-created. Used for filtering.                            |
| Sub-tasks     | Checklist         | Nested checklist items inside a card. Progress bar derived from % complete. |
| Type          | Enum              | Task, Bug, Feature, Design, Research — customisable per workspace.      |
| Comments      | Threaded text     | Supports @mentions. Each comment shown in activity log.                 |
| Created at    | Auto timestamp    | Set on creation. Shown in card detail view.                             |
| Updated at    | Auto timestamp    | Updated on every field change.                                          |

---

## 6. Card Lifecycle

### Create
- Click "+ Add card" at the bottom of any column → quick-add modal opens
- Title is the only required field; all other fields optional at creation
- Press Enter or click "Create" to save → card appears at the bottom of the column
- Fires event: `card.created`

### Open / view
- Click anywhere on the card tile → slide-in detail panel opens from the right
- URL updates with card ID (e.g. `/canvas/abc123/card/xyz456`) — panel is deep-linkable
- Panel shows all fields, activity log at the bottom, comment box

### Edit fields
- Every field is inline-editable inside the detail panel
- Changes auto-save on blur (no explicit save button)
- Title editable directly on the board tile by double-clicking
- Status, priority, assignee have quick-click dropdowns directly on the card tile
- Fires event: `card.edited` (with diff: which fields changed, old value → new value)

### Move / change status
- Drag card between columns on the board → status updates on drop
- OR use status dropdown inside the detail panel
- Fires event: `card.moved` or `card.status_changed`

### Complete
- Click the circle checkbox on the card tile OR set status to Done
- Card shows strikethrough title and grayed-out appearance
- Fires event: `card.completed`
- Reopen: click the checkmark again → reverts to previous status, fires `card.status_changed`

### Delete
- Kebab (⋯) menu on card tile OR inside detail panel → "Delete"
- Confirmation dialog: "Delete this card? This can be undone within 30 days."
- Soft delete: `deleted_at` timestamp set, card hidden from all views
- 30-day recovery window via Settings → Trash
- Fires event: `card.deleted`

### Archive
- Kebab menu → "Archive"
- Removed from active board view
- Visible via "Show archived items" filter toggle
- Fires event: `card.archived`

### Close panel
- Press ESC
- Click outside the panel
- Click the X button in the panel header
- Panel closes, URL reverts to canvas URL (no page navigation)

---

## 7. Board Interactions

### Drag and drop
- Cards are draggable across status columns using dnd-kit
- Drag handle (⠿) appears on hover, left side of card tile
- While dragging: card shows ghost/shadow, drop zone highlights in target column
- On drop: optimistic update fires immediately, API call confirms
- Spring animation on card settling into new position
- Fires event: `card.moved`

### Slide-in detail panel
- Triggered by clicking a card tile
- Slides in from the right (250ms ease-out)
- Does not push the board layout — overlays it
- Panel width: 480px default, resizable by dragging the left edge
- URL updates with card ID (shareable link to specific card)
- Closing: ESC, click outside, or X button → slides out (150ms ease-in)

### Inline editing on board
- Double-click card title → title becomes editable input inline
- Status badge: single click → dropdown appears
- Priority stars: single click → toggles star rating
- Assignee avatar: click → member picker dropdown

### Canvas pan & zoom
- Hold Space + drag to pan the canvas
- Scroll wheel to zoom in/out (min 50%, max 150%)
- Pinch-to-zoom on trackpad
- Zoom level indicator + reset button in bottom-right corner
- Minimap in bottom-right for orientation on dense boards

### Multi-select
- Hold Shift + click to select multiple cards
- Selection shown with blue border + count badge ("3 selected")
- Bulk action bar appears at the bottom: Move to status, Reassign, Change priority, Archive, Delete
- Click anywhere outside selection to deselect

### Keyboard shortcuts
| Key         | Action                        |
|-------------|-------------------------------|
| N           | New card (in focused column)  |
| E           | Edit focused card             |
| D           | Mark card done                |
| Del / Backspace | Delete focused card       |
| /           | Focus search                  |
| ⌘K          | Open command palette          |
| ESC         | Close open panel / modal      |
| ←→          | Navigate between columns      |
| ↑↓          | Navigate between cards        |
| ?           | Open keyboard shortcut cheatsheet |

### Column management
- Default columns: Not Started, In Progress, On Hold, Done
- Admin/manager can: add column, rename column, reorder columns (drag), delete column (cards reassigned to a chosen column)
- Each column header shows card count
- Optional WIP limit per column: when card count exceeds limit, column header turns amber
- Collapse column: click column header arrow → collapses to icon-only vertical strip

---

## 8. Views & Filters

### Layout views

**Board view (default)**
- Cards arranged in status columns (Kanban)
- Groupable by: Assignee, Due Date, Priority, Type via "Group by" dropdown
- Within each group, cards sortable manually or by field

**Table view**
- Spreadsheet layout — each card is a row, each field is a column
- Click column header to sort ascending/descending
- Inline cell editing (click any cell)
- Show/hide columns toggle panel ("Hidden: 3" chip in toolbar)
- Row hover reveals quick actions (open, delete)

**List view**
- Linear list of all cards
- Grouped by status with collapsible group headers
- Each row: title, assignee avatar, due date, priority badge, status chip
- Compact density — good for long task lists

**Calendar view**
- Cards plotted on a monthly or weekly calendar by due date
- Click a card to open detail panel
- Drag a card to a different date to reschedule (fires `card.due_date_changed`)
- Color-coded by status
- Cards without due dates shown in a sidebar list

### Filter panel

Access via "Filter" button in toolbar → opens filter dropdown.

**Filterable fields:**
- Assignee (multi-select: "is" / "is not")
- Status (multi-select)
- Priority (multi-select: low, medium, high)
- Type (multi-select)
- Labels (multi-select)
- Due date (is / is before / is after / is in the next N days / is overdue)
- Created by (multi-select)

**Behaviour:**
- Multiple conditions combined with AND logic by default
- Active filters shown as dismissable chips in the toolbar
- Filter state persisted in URL query params (shareable filtered views)
- "Show completed items" toggle — off by default
- "Show archived items" toggle — off by default
- Save a filter preset as a named view: "My tasks due this week"

### Sort options
- Sort by: Due date, Priority, Created at, Updated at, Title A–Z, Assignee
- Ascending / descending toggle per sort field
- Multi-sort: add secondary sort criterion
- Manual sort: drag-to-reorder within a column; order persisted per user per canvas

### Hidden fields
- Toggle which fields appear on the card tile (e.g. hide Priority for minimal view)
- Hidden fields still searchable and filterable
- Per-view config: board view and table view maintain separate hidden field settings

---

## 9. Events & Activity

### Event system

Every mutation to a card, canvas, or membership fires a typed event. Events are recorded in the `events` table with:
- `actor_id` — who did it
- `workspace_id`, `canvas_id`, `card_id` — what entity
- `event_type` — string enum (see below)
- `payload` — JSONB diff (old values → new values)
- `created_at` — timestamp

### Event types

| Event type              | Trigger                                      | Activity log entry example                                           |
|-------------------------|----------------------------------------------|----------------------------------------------------------------------|
| `card.created`          | New card added                               | Anurag created "Profile page final UI"                               |
| `card.completed`        | Status → Done / circle clicked               | Narayan marked "Pricing model page" as complete                      |
| `card.reopened`         | Done status reversed                         | Kamal reopened "Error solving and website testing"                   |
| `card.status_changed`   | Status changed (non-completion)              | Kamal moved "Notification Stage 1" → In Progress                     |
| `card.priority_changed` | Priority rating updated                      | Anurag changed priority of "Homepage design" from Low to High        |
| `card.assigned`         | Assignee added or changed                    | Sarthak assigned "Category pages" to Narayan                         |
| `card.unassigned`       | Assignee removed                             | Anurag unassigned themselves from "Homepage design"                  |
| `card.due_date_changed` | Due date set, moved, or removed              | Anurag moved due date of "Homepage design" to Jun 15                 |
| `card.edited`           | Title or description changed                 | Kamal updated description of "Error solving…"                        |
| `card.moved`            | Card dragged between columns/groups          | Narayan moved "UnIdeals Testing" → Done                              |
| `card.deleted`          | Card soft-deleted                            | Anurag deleted "Old onboarding card"                                 |
| `card.archived`         | Card archived                                | Anurag archived "Deprecated feature card"                            |
| `card.restored`         | Card unarchived or recovered from trash      | Anurag restored "Old onboarding card"                                |
| `comment.added`         | Comment posted                               | Kamal commented: "Phone profile icon still broken"                   |
| `comment.deleted`       | Comment deleted                              | Kamal deleted a comment on "Error solving…"                          |
| `attachment.added`      | File uploaded to card                        | Anurag attached "wireframe_v2.pdf" to "Profile page final UI"        |
| `member.joined`         | Invite accepted                              | Sarthak joined the workspace                                         |
| `member.role_changed`   | Role updated                                 | Anurag promoted Kamal to Manager                                     |
| `canvas.created`        | New canvas created                           | Anurag created canvas "CampusMart v1.0"                              |
| `canvas.archived`       | Canvas archived                              | Anurag archived canvas "Old Sprint Board"                            |

### Activity feed

**Global activity tab (sidebar)**
- Shows all events across all canvases the user has access to
- Real-time via WebSocket — new events appear without refresh
- Grouped by day: "Today", "Yesterday", "Jun 28"
- Each entry: avatar + name + action description + relative timestamp ("2 hours ago")
- Clicking an entry navigates to the relevant card (opens detail panel)

**Per-canvas activity tab**
- Scoped to that canvas only
- Same layout as global feed

**Per-card activity log**
- Shown at the bottom of the card detail panel
- Shows all events on that specific card: edits, comments, status changes, assignments

**Filtering the activity feed**
- Filter by: member, event type (e.g. only show completions), date range
- Search within activity log

---

## 10. Notifications

### In-app notifications
- Bell icon in sidebar with unread count badge
- Dropdown list of recent notifications (max 50, paginated)
- Each item: avatar + action text + relative time + canvas name
- Click notification → navigates to the card, marks as read
- "Mark all as read" bulk action

### Triggers (when a notification is created for a user)
- Assigned to a card
- @mentioned in a comment
- A card they're assigned to has its due date changed
- A card they're assigned to becomes overdue (daily cron job at 9am)
- A card due tomorrow (daily cron at 9am)
- A canvas is shared with them
- Someone replies to a comment thread they're part of

### Email notifications
- Daily digest email: summary of activity across their canvases (optional, default on)
- Immediate email on @mention (optional, default on)
- Controlled in Settings → Notifications → per-event toggles

---

## 11. Navigation (Sidebar)

The sidebar is a persistent left-side panel.
- Collapsed state: 52px wide, icon-only
- Expanded state: 240px wide, icon + label
- Toggle: click the workspace logo or a collapse/expand arrow
- State persisted in localStorage per user

### Sidebar sections (top to bottom)

**Workspace switcher** (very top)
- Shows current workspace logo + name
- Click → dropdown to switch workspace or create a new one

**Home**
- Personal dashboard
- Sections: My tasks (cards assigned to me), Upcoming (due in 7 days), Recently viewed cards, Pinned canvases

**Canvases**
- List of all canvases the user has access to
- Starred/pinned canvases at top with ★ indicator
- Unstarred canvases below, alphabetical
- Hover a canvas → show ⋯ menu (settings, archive, star, copy link)
- "+ New canvas" button at bottom of list (admin/manager only)
- Drag to reorder canvases in the list

**Activity**
- Global activity feed for the workspace (see Section 9)
- Unread indicator dot on sidebar icon when new activity

**DMs / Mentions**
- Direct messages between members
- @mention notifications collected here
- Unread count badge on sidebar icon

**Files**
- All attachments uploaded across the workspace
- Sortable by: canvas, date, file type, uploader
- In-app preview for images and PDFs
- Download button on each file

**Later / Bookmarks**
- Cards saved for later reference by the current user (personal)
- Add bookmark: hover a card → click the bookmark icon
- Shown as a simple list, click to open card

**⌘K — Command palette / Search**
- Triggered by ⌘K (Mac) / Ctrl+K (Windows)
- Global search across: card titles, descriptions, comments, member names, canvas names
- Results grouped by type (Canvases, Cards, Members)
- Keyboard navigable (↑↓ to move, Enter to open)
- Recent searches saved

**Settings** (bottom of sidebar)
- Workspace settings: members, billing, integrations, API tokens
- Profile settings: name, avatar, email, password change
- Notification preferences
- Appearance: light / dark / system

---

## 12. Database Schema

### users
```
id              UUID PRIMARY KEY
name            TEXT NOT NULL
email           TEXT UNIQUE NOT NULL
password_hash   TEXT
avatar_url      TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ
```

### workspaces
```
id              UUID PRIMARY KEY
name            TEXT NOT NULL
slug            TEXT UNIQUE NOT NULL
owner_id        UUID REFERENCES users(id)
settings        JSONB DEFAULT '{}'
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### workspace_members
```
workspace_id    UUID REFERENCES workspaces(id)
user_id         UUID REFERENCES users(id)
role            ENUM('admin', 'manager', 'member') DEFAULT 'member'
joined_at       TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY (workspace_id, user_id)
```

### canvases
```
id              UUID PRIMARY KEY
workspace_id    UUID REFERENCES workspaces(id)
name            TEXT NOT NULL
emoji           TEXT
visibility      ENUM('public', 'private') DEFAULT 'private'
created_by      UUID REFERENCES users(id)
default_view    ENUM('board', 'table', 'list', 'calendar') DEFAULT 'board'
archived_at     TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ
```

### canvas_members
```
canvas_id       UUID REFERENCES canvases(id)
user_id         UUID REFERENCES users(id)
added_at        TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY (canvas_id, user_id)
```

### canvas_columns (status columns)
```
id              UUID PRIMARY KEY
canvas_id       UUID REFERENCES canvases(id)
name            TEXT NOT NULL
color           TEXT
order_index     INTEGER NOT NULL
wip_limit       INTEGER
```

### cards
```
id              UUID PRIMARY KEY
canvas_id       UUID REFERENCES canvases(id)
title           TEXT NOT NULL
description     TEXT
status          TEXT NOT NULL DEFAULT 'not_started'
priority        INTEGER DEFAULT 0    -- 0=none, 1=low, 2=medium, 3=high
due_date        DATE
type            TEXT DEFAULT 'task'
order_index     INTEGER
created_by      UUID REFERENCES users(id)
archived_at     TIMESTAMPTZ
deleted_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ
```

### card_assignees
```
card_id         UUID REFERENCES cards(id)
user_id         UUID REFERENCES users(id)
assigned_at     TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY (card_id, user_id)
```

### card_labels
```
card_id         UUID REFERENCES cards(id)
label           TEXT NOT NULL
color           TEXT
PRIMARY KEY (card_id, label)
```

### sub_tasks
```
id              UUID PRIMARY KEY
card_id         UUID REFERENCES cards(id)
title           TEXT NOT NULL
completed       BOOLEAN DEFAULT FALSE
order_index     INTEGER
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### comments
```
id              UUID PRIMARY KEY
card_id         UUID REFERENCES cards(id)
author_id       UUID REFERENCES users(id)
body            TEXT NOT NULL
parent_id       UUID REFERENCES comments(id)   -- for threading
deleted_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ
```

### attachments
```
id              UUID PRIMARY KEY
card_id         UUID REFERENCES cards(id)
uploader_id     UUID REFERENCES users(id)
file_url        TEXT NOT NULL
filename        TEXT NOT NULL
size_bytes      BIGINT
mime_type       TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### events
```
id              UUID PRIMARY KEY
workspace_id    UUID REFERENCES workspaces(id)
canvas_id       UUID REFERENCES canvases(id)
card_id         UUID REFERENCES cards(id)
actor_id        UUID REFERENCES users(id)
event_type      TEXT NOT NULL
payload         JSONB DEFAULT '{}'   -- diff: { field, old_value, new_value }
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### invites
```
id              UUID PRIMARY KEY
workspace_id    UUID REFERENCES workspaces(id)
email           TEXT NOT NULL
token           TEXT UNIQUE NOT NULL
role            ENUM('admin', 'manager', 'member') DEFAULT 'member'
expires_at      TIMESTAMPTZ NOT NULL
accepted_at     TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### notifications
```
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
event_id        UUID REFERENCES events(id)
read            BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### bookmarks
```
user_id         UUID REFERENCES users(id)
card_id         UUID REFERENCES cards(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY (user_id, card_id)
```

---

## 13. API Design

Base URL: `/api/v1/`
Auth: Bearer token in Authorization header (access token)
All responses: `{ data, error, meta }` envelope

### Auth endpoints
```
POST   /auth/signup             Create account
POST   /auth/login              Login, returns access token + sets refresh cookie
POST   /auth/logout             Clears refresh token
POST   /auth/refresh            Returns new access token using refresh cookie
POST   /auth/verify-email       Verify email from token in link
POST   /auth/invite-accept      Accept workspace invite
POST   /auth/forgot-password    Send reset email
POST   /auth/reset-password     Reset with token
```

### Workspace endpoints
```
GET    /workspaces              List workspaces for current user
POST   /workspaces              Create workspace
GET    /workspaces/:id          Get workspace detail
PATCH  /workspaces/:id          Update workspace settings
GET    /workspaces/:id/members  List members
POST   /workspaces/:id/invites  Send invites
DELETE /workspaces/:id/members/:userId  Remove member
PATCH  /workspaces/:id/members/:userId  Update member role
```

### Canvas endpoints
```
GET    /workspaces/:wid/canvases          List canvases
POST   /workspaces/:wid/canvases          Create canvas
GET    /canvases/:id                      Get canvas detail + columns
PATCH  /canvases/:id                      Update canvas settings
DELETE /canvases/:id                      Delete canvas
POST   /canvases/:id/members             Add member to canvas
DELETE /canvases/:id/members/:userId     Remove member from canvas
GET    /canvases/:id/columns             Get status columns
POST   /canvases/:id/columns             Add column
PATCH  /canvases/:id/columns/:colId      Rename / reorder column
DELETE /canvases/:id/columns/:colId      Delete column
```

### Card endpoints
```
GET    /canvases/:id/cards        List cards (with filter/sort/group query params)
POST   /canvases/:id/cards        Create card
GET    /cards/:id                 Get card detail
PATCH  /cards/:id                 Update any card field(s)
DELETE /cards/:id                 Soft-delete card
POST   /cards/:id/archive         Archive card
POST   /cards/:id/restore         Restore from archive or trash
POST   /cards/:id/complete        Mark complete
POST   /cards/:id/reopen          Reopen completed card
POST   /cards/:id/move            Move to different status / position
```

### Comment endpoints
```
GET    /cards/:id/comments        Get comments (threaded)
POST   /cards/:id/comments        Add comment
PATCH  /comments/:id              Edit comment
DELETE /comments/:id              Delete comment
```

### Attachment endpoints
```
POST   /cards/:id/attachments     Upload file (multipart/form-data → S3)
DELETE /attachments/:id           Delete attachment
```

### Event / activity endpoints
```
GET    /workspaces/:id/events     Global activity feed (paginated, filterable)
GET    /canvases/:id/events       Canvas activity feed
GET    /cards/:id/events          Card activity log
```

### Notification endpoints
```
GET    /notifications             List notifications for current user
POST   /notifications/read-all   Mark all as read
PATCH  /notifications/:id        Mark single as read
```

### Search
```
GET    /search?q=&workspace_id=  Full-text search across cards, comments, members
```

---

## 14. Real-time (WebSocket)

Library: Socket.io (server + client)

### Room structure
- Each canvas has a WebSocket room: `canvas:{canvas_id}`
- Each workspace has a room: `workspace:{workspace_id}`
- Users join canvas room when they open that canvas; leave when they close it

### Events emitted by server to room members

| Socket event        | When fired                          | Payload                                   |
|---------------------|-------------------------------------|-------------------------------------------|
| `card:created`      | Card created                        | Full card object                          |
| `card:updated`      | Any field on card changed           | `{ card_id, changes: { field, new_val } }` |
| `card:deleted`      | Card deleted                        | `{ card_id }`                             |
| `card:moved`        | Card dragged to new column/position | `{ card_id, status, order_index }`        |
| `comment:added`     | Comment posted                      | Full comment object                       |
| `comment:deleted`   | Comment deleted                     | `{ comment_id, card_id }`                 |
| `activity:new`      | Any event logged                    | Full event object (for live activity feed)|
| `notification:new`  | Notification created for user       | Full notification object                  |
| `member:online`     | Member connects to workspace room   | `{ user_id }`                             |
| `member:offline`    | Member disconnects                  | `{ user_id }`                             |

### Optimistic updates pattern (frontend)
1. User performs action (e.g. drag card)
2. UI updates immediately (optimistic)
3. API call fires in background
4. If API succeeds: server emits socket event to all other clients in room
5. If API fails: client rolls back the optimistic update and shows error toast

---

## 15. Design & UX Standards

### Core principles
- Every interactive element must have a visible hover state
- Every empty state must have an illustration + helpful prompt (not a blank div)
- Every async operation must show a loading skeleton (not a spinner blocking the whole view)
- Every destructive action (delete, archive) requires a confirmation dialog
- All errors must be human-readable ("Something went wrong, please try again" — not "Error 500")
- Toast notifications for all success/error feedback (top-right, auto-dismiss 4s)

### Motion
- Micro-interactions: 150ms ease-out (hover state changes, badge updates)
- Panel transitions: 250ms ease-out (slide-in, slide-out)
- Card drag: spring physics (dnd-kit defaults)
- Page-level transitions: 200ms fade
- Avoid motion on elements the user is actively interacting with (no animation while dragging)

### Accessibility
- All interactive elements keyboard reachable (Tab order logical)
- ARIA labels on all icon-only buttons (`aria-label="Delete card"`)
- Focus rings visible on all focusable elements (2px offset ring)
- Color is never the only way to convey information (always pair with icon or label)
- Minimum touch target: 44×44px on interactive elements
- All images and icons have alt text or `aria-hidden="true"` if decorative

### Typography (follow design system MD)
- Use tokens from design system for font sizes, weights, line heights
- No custom font-size values outside the scale
- Body text: regular weight, comfortable line-height (1.6–1.7)
- Labels and metadata: secondary color, slightly smaller size
- Card titles: medium weight, primary color

### Spacing (follow design system MD)
- Use spacing tokens consistently (do not hardcode px values)
- Card tile padding: consistent on all sides
- Column gaps: consistent across all views
- Panel internal padding: generous (not cramped)

### Color (follow design system MD)
- Status colors: use the defined semantic colors (not ad-hoc hex)
- Priority: use amber/warning for medium, red/danger for high, gray for low
- Overdue: always red, never just a text label
- Completed: gray out the card tile, strikethrough title

### Empty states (design every one of these)
- Empty canvas (no cards yet): illustration + "Create your first card" button
- Empty column: subtle dashed border + "+ Add card" prompt
- No search results: illustration + "No results for '{query}'" + suggest clearing filters
- No notifications: "You're all caught up" message
- No activity: "No activity yet on this canvas"
- No files: "No files attached to cards yet"

### Loading states
- Card list: skeleton tiles (matching card tile dimensions)
- Detail panel: skeleton for each field section
- Activity feed: skeleton list items
- Table view: skeleton rows
- Never block the entire viewport with a loader

### Reference products for interaction quality
- Slack: sidebar, DMs, activity feed, notification patterns
- Linear: card detail panel, drag and drop, keyboard shortcuts, filter UX
- Notion: rich text editing, inline editing patterns
- Figma: canvas pan/zoom, multi-select, minimap

---

## 16. Tech Stack

### Frontend
| Layer             | Choice                     | Notes                                      |
|-------------------|----------------------------|--------------------------------------------|
| Framework         | React + TypeScript         | Functional components, hooks throughout    |
| Styling           | Tailwind CSS               | Follow design system token mapping         |
| State / server    | TanStack Query (React Query) | All API data fetching, caching, mutations |
| Drag and drop     | dnd-kit                    | Board card dragging                        |
| Routing           | React Router v6            | Nested routes for canvas/card deep links   |
| Real-time         | Socket.io client           | Joins canvas rooms on mount                |
| Rich text         | TipTap (ProseMirror-based) | Card description editor                    |
| Date picker       | react-day-picker           | Due date selection                         |
| Build tool        | Vite                       |                                            |
| Icons             | Tabler Icons               | Consistent outline icon set                |

### Backend
| Layer             | Choice                     | Notes                                      |
|-------------------|----------------------------|--------------------------------------------|
| Runtime           | Node.js                    |                                            |
| Framework         | Express.js                 | REST API                                   |
| Database          | PostgreSQL                 | Primary data store                         |
| ORM               | Prisma                     | Type-safe queries, migrations              |
| Real-time         | Socket.io                  | WebSocket server, room management          |
| Auth              | JWT + httpOnly cookies     | Access token in memory, refresh in cookie  |
| OAuth             | Passport.js                | Google + GitHub strategies                 |
| File storage      | AWS S3                     | Card attachments                           |
| Email             | Resend                     | Invite emails, notifications, digest       |
| Background jobs   | BullMQ + Redis             | Daily digest cron, overdue notifications   |
| Search            | PostgreSQL full-text search | pg_trgm for fuzzy matching               |

### Deployment (suggested)
| Service           | Choice                     |
|-------------------|----------------------------|
| Frontend hosting  | Vercel                     |
| Backend hosting   | Railway or Render          |
| Database          | Supabase (managed Postgres)|
| File storage      | AWS S3                     |
| Redis             | Upstash                    |
| Email             | Resend                     |

---

## Implementation order (suggested for coding agent)

1. Auth system (signup, login, JWT, refresh, invite flow)
2. Workspace + member management
3. Canvas CRUD + member management
4. Card CRUD (all fields, status columns)
5. Board view with drag and drop
6. Card detail panel (slide-in, all field editing)
7. Events system + activity feed
8. Real-time via WebSocket
9. Table view
10. Filters, sort, grouping
11. Notifications (in-app + email)
12. Comment system with threading
13. File attachments
14. Search (⌘K command palette)
15. Calendar view
16. List view
17. Sub-tasks
18. Keyboard shortcuts
19. Empty states, loading skeletons, error states
20. Settings pages (workspace, profile, notifications)

---

*End of product guide. Follow the attached design system MD for all visual and component decisions.*
