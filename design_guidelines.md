# IT Service Management Platform - Design Guidelines

## Design Approach

**Selected Framework:** Design System Approach inspired by Linear, Vercel, and modern SaaS dashboards
**Rationale:** Enterprise productivity tools require consistency, clarity, and efficiency. The interface prioritizes information density, rapid task completion, and clear role-based workflows over visual experimentation.

---

## Typography System

**Font Family:** Inter (via Google Fonts CDN) - single family for consistency
- **Display/Headers:** font-semibold to font-bold, tracking-tight
- **Body Text:** font-normal, leading-relaxed for readability
- **Data/Labels:** font-medium, text-sm for compact information display
- **Chat Messages:** font-normal, text-sm with adequate line-height

**Hierarchy:**
- Page Titles: text-2xl md:text-3xl font-bold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-semibold
- Body Text: text-base
- Labels/Metadata: text-sm text-muted-foreground
- Buttons/CTAs: text-sm font-medium

---

## Layout & Spacing System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16** exclusively
- Component padding: p-4 to p-6
- Section spacing: space-y-6 to space-y-8
- Card margins: gap-4 to gap-6 in grids
- Form fields: space-y-4
- Dashboard sections: py-8 to py-12

**Grid System:**
- Dashboard Layouts: 3-column for admin/staff (sidebar + main + detail panel when needed)
- Service Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Task Lists: Single column with compact rows
- Chat Interface: Fixed-width centered (max-w-4xl)

**Container Constraints:**
- Dashboard Content: max-w-7xl mx-auto px-4 md:px-6
- Forms: max-w-2xl
- Chat Messages: max-w-4xl

---

## Component Library

### Navigation
**Top Bar (All Roles):**
- Fixed height (h-16), border-b, flex justify-between items-center
- Logo/Brand left, notification bell + user menu right
- Role badge next to user avatar

**Sidebar (Admin/Staff):**
- w-64, fixed, border-r, full-height
- Navigation items: px-4 py-2, rounded-md, with icons (Heroicons)
- Active state: subtle background highlight
- Grouped sections with text-xs uppercase labels

### Dashboard Cards
**Service Cards:**
- Rounded-lg border, p-6, hover:shadow-md transition
- Image thumbnail top (if applicable), title, description, status badge
- Action buttons bottom-right

**Stat Cards:**
- Grid layout, compact design (p-4)
- Large number display, small label, optional trend indicator

**Booking Cards:**
- Border-l-4 for status indication (active/pending/closed)
- Customer name, service, timestamp, status badge
- Action buttons (assign, chat, close)

### Forms
**Consistent Structure:**
- Labels above inputs (text-sm font-medium mb-2)
- Input spacing: space-y-4
- Helper text: text-xs text-muted-foreground mt-1
- Buttons: full-width on mobile, inline on desktop

**Service Booking Form:**
- Multi-step wizard with progress indicator
- Step headers with icons
- Clear CTAs at each step

### Chat Interface
**Layout:**
- Three sections: header (h-16), messages (flex-1 overflow-y-auto), input (h-20)
- Messages: alternating alignment (customer left, admin/staff right)
- Private messages: distinct visual treatment (italic, icon indicator)

**Message Bubbles:**
- Rounded-2xl, px-4 py-2, max-w-[75%]
- Timestamp: text-xs below bubble
- Sender name above (for multi-participant chats)

**Quotation Messages:**
- Distinct card within chat, border-l-4, p-4
- Structured layout: amount, description, action button

### Tables & Lists
**Booking Lists:**
- Striped rows, hover states
- Column headers: sticky top-0, font-medium, text-sm
- Row actions: dropdown menu right-aligned
- Mobile: Stack as cards

**Task Lists:**
- Compact rows with checkbox, title, assignee avatar, due date
- Quick-action icons on hover

### Notifications
**In-App Notifications:**
- Dropdown panel from top-right bell icon
- List items: border-b, p-4, unread indicator dot
- Icon left, message center, timestamp right
- "Mark all read" action at bottom

**Toast Notifications:**
- Fixed bottom-right position
- Auto-dismiss after 5 seconds
- Icon, message, close button

### Modals & Dialogs
**User Approval Modal (Admin):**
- Centered, max-w-md
- User details, role selector, approve/reject buttons

**Task Assignment Modal:**
- Staff member selector (searchable)
- Due date picker
- Note field
- Confirm/Cancel actions

---

## Role-Specific Dashboard Layouts

### Customer Dashboard
- Clean, minimal layout
- Hero section: "Book a Service" prominent CTA (no background image)
- Service grid below with search/filter
- "My Bookings" section: cards with chat access buttons
- Active chats: expandable list with unread indicators

### Admin Dashboard
- Dense information layout
- Top stats row: pending approvals, active bookings, open chats (4 cards)
- Main area: tabbed interface (Users, Services, Bookings, Tasks)
- Right panel: notification feed (w-80, border-l)

### Staff Dashboard
- Task-focused layout
- Priority task list top (assigned to me)
- Calendar view for scheduled tasks
- Quick access to active chats
- Performance metrics card (optional, if tracking hours/completions)

---

## Interaction Patterns

**Real-Time Updates:**
- Chat: instant message append with smooth scroll
- Notifications: badge count increments, toast appears
- Booking status: live update without page refresh

**Loading States:**
- Skeleton screens for data-heavy sections
- Spinner for quick actions (button disabled state)
- Progressive loading for chat history (load more on scroll)

**Empty States:**
- Friendly illustrations placeholder
- Clear CTA to take first action
- Helpful guidance text

---

## Icons & Assets

**Icon Library:** Heroicons (outline for navigation, solid for emphasis)
- Navigation icons: 20px
- Card icons: 24px
- Status indicators: 16px

**No Images Required** except:
- User avatars (placeholder initials in circles)
- Optional service thumbnails (generic placeholders acceptable)

---

## Accessibility Standards

- All form inputs: proper labels, aria-labels, error states
- Focus indicators: ring-2 ring-offset-2 on all interactive elements
- Keyboard navigation: tab order, escape to close modals
- Screen reader support: aria-live for chat messages, notifications
- Consistent implementation across all forms and inputs