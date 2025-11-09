# Figma Integration Specification

This document maps the Figma designs to the implementation spec for @.agent-os/specs/2025-11-09-invite-users-seat-visualization/spec.md

## Figma File Reference

**Figma File:** time8.io
**Design System:** Based on existing Time8 components and patterns

## Screen Flow Overview

The invite users dialog has 9 distinct states/screens that handle different scenarios:

1. **Initial State (2/3 seats available)** - Default dialog when seats are available
2. **One Invitation Added (1/3 seats available)** - After adding first user
3. **At Capacity (0/3 seats)** - All seats filled with pending invitations
4. **Success State** - Confirmation after invitations sent
5. **Upgrade Required (Hobby Plan)** - When trying to invite beyond seat limit
6. **Different Plan View (2/10 PRO)** - Shows higher tier seat visualization
7. **PRO Plan at Capacity (10/10)** - All PRO seats filled
8. **PRO Plan Success** - Confirmation for PRO plan invitations
9. **PRO Plan with Paid Users** - Shows billing for additional seats

---

## Screen 1: Initial State - Available Seats

**Figma:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26146-82899
**Node ID:** `26146:82899`

### Visual Design

**Header:**
- Title: "Zaproś nowych użytkowników" (Invite new users)
- Close button (X) in top-right corner

**Seat Visualization:**
- Text: "Masz 2/3 wolne zaproszenia w Twoim planie Hobby"
- Three seat indicators displayed horizontally:
  - 1st seat: User icon with green "Ty" badge (You - occupied)
  - 2nd seat: User icon with dashed border and purple "Wolny" badge (Available)
  - 3rd seat: User icon with dashed border and purple "Wolny" badge (Available)

**Add User Form:**
- Section title: "Dodaj użytkownika" (Add user)
- Email input field with placeholder "Wpisz adres email"
- Purple "Dodaj" button (Add)

**Footer:**
- "Anuluj" button (Cancel) - secondary style
- "Wyślij zaproszenia" button (Send invitations) - primary purple

### Component Mapping

```typescript
<Dialog>
  <DialogHeader>
    <DialogTitle>Zaproś nowych użytkowników</DialogTitle>
  </DialogHeader>

  <SeatVisualizationCard>
    <SeatIndicator status="occupied" label="Ty" />
    <SeatIndicator status="available" label="Wolny" />
    <SeatIndicator status="available" label="Wolny" />
  </SeatVisualizationCard>

  <InvitationForm>
    <Input placeholder="Wpisz adres email" />
    <Button variant="primary">Dodaj</Button>
  </InvitationForm>

  <DialogFooter>
    <Button variant="ghost">Anuluj</Button>
    <Button variant="primary">Wyślij zaproszenia</Button>
  </DialogFooter>
</Dialog>
```

---

## Screen 2: One Invitation Added

**Figma:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26152-215653
**Node ID:** `26152:215653`

### Visual Design

**Seat Visualization:**
- Text: "Masz 1/3 wolne zaproszenia w Twoim planie Hobby"
- Three seat indicators:
  - 1st: Occupied (Ty)
  - 2nd: Zajęty (Occupied/Reserved - gray background)
  - 3rd: Wolny (Available)

**Pending Invitations Section:**
- Section title: "Do zaproszenia" (To be invited)
- List item:
  - Email: "Wednesday.Addams@bb8.pl"
  - Badge: "Plan Hobby" (gray)
  - Delete button (trash icon)

### Component Mapping

```typescript
<SeatVisualizationCard>
  <p>Masz 1/3 wolne zaproszenia w Twoim planie Hobby</p>
  <SeatIndicator status="occupied" label="Ty" />
  <SeatIndicator status="reserved" label="Zajęty" />
  <SeatIndicator status="available" label="Wolny" />
</SeatVisualizationCard>

<PendingInvitationsList title="Do zaproszenia">
  <PendingInvitationItem
    email="Wednesday.Addams@bb8.pl"
    plan="Plan Hobby"
    onDelete={() => {}}
  />
</PendingInvitationsList>
```

---

## Screen 3: At Full Capacity

**Figma:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26153-216068
**Node ID:** `26153:216068`

### Visual Design

**Seat Visualization:**
- Text: "Masz 0/3 wolne zaproszenia w Twoim planie Hobby"
- Three seat indicators:
  - 1st: Occupied (Ty)
  - 2nd: Zajęty (Reserved)
  - 3rd: Zajęty (Reserved)

**Pending Invitations:**
- Two users pending:
  - Wednesday.Addams@bb8.pl - Plan Hobby
  - dajana.bieganowska@bb8.pl - Plan Hobby

### Component Mapping

```typescript
<SeatVisualizationCard>
  <p>Masz 0/3 wolne zaproszenia w Twoim planie Hobby</p>
  <SeatIndicator status="occupied" label="Ty" />
  <SeatIndicator status="reserved" label="Zajęty" />
  <SeatIndicator status="reserved" label="Zajęty" />
</SeatVisualizationCard>

<PendingInvitationsList title="Do zaproszenia">
  <PendingInvitationItem email="Wednesday.Addams@bb8.pl" plan="Plan Hobby" />
  <PendingInvitationItem email="dajana.bieganowska@bb8.pl" plan="Plan Hobby" />
</PendingInvitationsList>
```

---

## Screen 4: Success State - Empty

**Figma:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26155-239487
**Node ID:** `26155:239487`

### Visual Design

**Empty State:**
- Icon: User icon with outline border (centered)
- Title: "Zaproszenia wysłane" (Invitations sent)
- Description: "Po zaakceptowaniu zaproszeń przez użytkowników znajdziesz ich na liście 'Aktywni'"
- Button: "Zamknij" (Close) - purple primary

### Component Mapping

```typescript
<EmptyState>
  <UserIcon />
  <h3>Zaproszenia wysłane</h3>
  <p>Po zaakceptowaniu zaproszeń przez użytkowników znajdziesz ich na liście "Aktywni"</p>
  <Button variant="primary" onClick={closeDialog}>Zamknij</Button>
</EmptyState>
```

---

## Screen 5: Upgrade Required - Hobby Plan

**Figma:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26204-222000
**Node ID:** `26204:222000`

### Visual Design

**Seat Visualization:**
- Text: "Masz 0/3 wolne zaproszenia w Twoim planie Hobby"
- All 3 seats shown as Zajęty (Reserved)

**Alert Banner:**
- Background: Light purple
- Text: "Plan Hobby zawiera max 3 użytkowników. Przejdź na plan PRO."
- Button: "Skonfiguruj płatność" (Configure payment)

**Already Added Section:**
- Title: "Już dodani" (Already added)
- Shows user with price tag: "szymon.brodzicki@bb8.pl" - "+10,99 Euro"

**Pending Invitations:**
- Title: "Do zaproszenia"
- Three users listed with "+10,99 Euro" badges:
  - Wednesday.Addams@bb8.pl
  - dajana.bieganowska@bb8.pl
  - harry.potter@bb8.pl

**Pricing Summary:**
- "Podsumowanie" (Summary): "+32.97 Euro"

**Footer Note:**
- "Wszystkie zaproszenia zostaną wysłane po opłaceniu planu PRO"

**Footer Buttons:**
- "Anuluj" (Cancel)
- "Przejdź do płatności" (Go to payment) - purple primary

### Component Mapping

```typescript
<Dialog>
  <SeatVisualizationCard>
    <p>Masz 0/3 wolne zaproszenia w Twoim planie Hobby</p>
    <SeatIndicator status="reserved" label="Zajęty" />
    <SeatIndicator status="reserved" label="Zajęty" />
    <SeatIndicator status="reserved" label="Zajęty" />
  </SeatVisualizationCard>

  <UpgradeAlert variant="info">
    <p>Plan Hobby zawiera max 3 użytkowników. Przejdź na plan PRO.</p>
    <Button size="sm">Skonfiguruj płatność</Button>
  </UpgradeAlert>

  <InvitationsList title="Już dodani">
    <InvitationItem email="szymon.brodzicki@bb8.pl" price="+10,99 Euro" />
  </InvitationsList>

  <InvitationsList title="Do zaproszenia">
    <InvitationItem email="Wednesday.Addams@bb8.pl" price="+10,99 Euro" />
    <InvitationItem email="dajana.bieganowska@bb8.pl" price="+10,99 Euro" />
    <InvitationItem email="harry.potter@bb8.pl" price="+10,99 Euro" />
  </InvitationsList>

  <PricingSummary total="+32.97 Euro" />

  <Alert>
    Wszystkie zaproszenia zostaną wysłane po opłaceniu planu PRO
  </Alert>

  <DialogFooter>
    <Button variant="ghost">Anuluj</Button>
    <Button variant="primary">Przejdź do płatności</Button>
  </DialogFooter>
</Dialog>
```

---

## Screen 6: PRO Plan - Available Seats

**Figma:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26153-216207
**Node ID:** `26153:216207`

### Visual Design

**Seat Visualization:**
- Text: "Masz 2/10 wolne zaproszenia w Twoim planie PRO"
- Two pill-style indicators (compact design):
  - Left: "Zajęte 8" (Occupied 8) - green background
  - Right: "Wolne 2" (Available 2) - white with dashed border

**Add User Form:**
- Email input with "Dodaj" button

### Component Mapping

```typescript
<SeatVisualizationCard variant="compact">
  <p>Masz 2/10 wolne zaproszenia w Twoim planie PRO</p>
  <SeatPill status="occupied" count={8}>Zajęte</SeatPill>
  <SeatPill status="available" count={2}>Wolne</SeatPill>
</SeatVisualizationCard>

<InvitationForm>
  <Input placeholder="Wpisz adres email" />
  <Button>Dodaj</Button>
</InvitationForm>
```

---

## Screen 7: PRO Plan - Full Capacity

**Figma:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26155-236997
**Node ID:** `26155:236997`

### Visual Design

**Seat Visualization:**
- Text: "Masz 0/10 wolne zaproszenia w Twoim planie PRO"
- Two pill indicators:
  - Left: "Zajęte 10" - green
  - Right: "Wolne 0" - dashed border

**Pending Invitations:**
- Two users with green "Opłacony" (Paid) badges:
  - Wednesday.Addams@bb8.pl
  - dajana.bieganowska@bb8.pl

### Component Mapping

```typescript
<SeatVisualizationCard variant="compact">
  <p>Masz 0/10 wolne zaproszenia w Twoim planie PRO</p>
  <SeatPill status="occupied" count={10}>Zajęte</SeatPill>
  <SeatPill status="available" count={0}>Wolne</SeatPill>
</SeatVisualizationCard>

<PendingInvitationsList title="Do zaproszenia">
  <PendingInvitationItem
    email="Wednesday.Addams@bb8.pl"
    status="Opłacony"
    statusVariant="success"
  />
  <PendingInvitationItem
    email="dajana.bieganowska@bb8.pl"
    status="Opłacony"
    statusVariant="success"
  />
</PendingInvitationsList>
```

---

## Screen 8: PRO Plan Success State

**Figma:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26155-239309
**Node ID:** `26155:239309`

### Visual Design

**Empty State:**
- User icon (centered)
- Title: "Zaproszenia wysłane"
- Description: "Po zaakceptowaniu zaproszeń przez użytkowników znajdziesz ich na liście 'Aktywni'"
- Button: "Zamknij" (Close)

### Component Mapping

Same as Screen 4 - reusable success state component.

---

## Screen 9: PRO Plan - Upgrade with Pricing

**Figma:** https://www.figma.com/design/Xb0VKGqH8b7w6nXW3HoacI/time8.io?node-id=26155-237132
**Node ID:** `26155:237132`

### Visual Design

**Seat Visualization:**
- "Masz 0/10 wolne zaproszenia w Twoim planie PRO"
- Zajęte 10, Wolne 0

**Already Paid Section:**
- Title: "Do zaproszenia"
- Two users with green "Opłacony" badges:
  - Wednesday.Addams@bb8.pl
  - dajana.bieganowska@bb8.pl

**New Paid Users Section:**
- Three users with purple "+10,99 Euro" badges:
  - Wednesday.Addams@bb8.pl
  - dajana.bieganowska@bb8.pl
  - harry.potter@bb8.pl

**Pricing Summary:**
- "Podsumowanie": "+32.97 Euro"

**Footer Note:**
- "Wszystkie zaproszenia zostaną wysłane po opłaceniu dodatkowych użytkowników"

**Footer Buttons:**
- "Anuluj"
- "Przejdź do płatności"

### Component Mapping

```typescript
<Dialog>
  <SeatVisualizationCard variant="compact">
    <SeatPill status="occupied" count={10}>Zajęte</SeatPill>
    <SeatPill status="available" count={0}>Wolne</SeatPill>
  </SeatVisualizationCard>

  <InvitationsList title="Do zaproszenia">
    <InvitationItem
      email="Wednesday.Addams@bb8.pl"
      status="Opłacony"
      statusVariant="success"
    />
    <InvitationItem
      email="dajana.bieganowska@bb8.pl"
      status="Opłacony"
      statusVariant="success"
    />
    <InvitationItem
      email="Wednesday.Addams@bb8.pl"
      price="+10,99 Euro"
    />
    <InvitationItem
      email="dajana.bieganowska@bb8.pl"
      price="+10,99 Euro"
    />
    <InvitationItem
      email="harry.potter@bb8.pl"
      price="+10,99 Euro"
    />
  </InvitationsList>

  <PricingSummary total="+32.97 Euro" />

  <Alert>
    Wszystkie zaproszenia zostaną wysłane po opłaceniu dodatkowych użytkowników
  </Alert>

  <DialogFooter>
    <Button variant="ghost">Anuluj</Button>
    <Button variant="primary">Przejdź do płatności</Button>
  </DialogFooter>
</Dialog>
```

---

## Design System Components Required

### 1. SeatVisualizationCard

**Variants:**
- `default`: Individual seat indicators for small plans (Hobby - 3 seats)
- `compact`: Pill-style aggregated counts for larger plans (PRO - 10+ seats)

**Props:**
```typescript
interface SeatVisualizationCardProps {
  variant?: 'default' | 'compact'
  totalSeats: number
  occupiedSeats: number
  availableSeats: number
  planName: string
}
```

### 2. SeatIndicator (for default variant)

**Statuses:**
- `occupied`: Green background, "Ty" label
- `reserved`: Gray background, "Zajęty" label
- `available`: Dashed border, "Wolny" label

### 3. SeatPill (for compact variant)

**Props:**
```typescript
interface SeatPillProps {
  status: 'occupied' | 'available'
  count: number
  children: string
}
```

### 4. PendingInvitationItem

**Props:**
```typescript
interface PendingInvitationItemProps {
  email: string
  plan?: string // "Plan Hobby", "Plan PRO"
  status?: string // "Opłacony"
  statusVariant?: 'success' | 'info'
  price?: string // "+10,99 Euro"
  onDelete?: () => void
}
```

### 5. UpgradeAlert

**Props:**
```typescript
interface UpgradeAlertProps {
  variant: 'info' | 'warning'
  message: string
  actionLabel?: string
  onAction?: () => void
}
```

### 6. PricingSummary

**Props:**
```typescript
interface PricingSummaryProps {
  total: string
}
```

### 7. EmptyState

**Props:**
```typescript
interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}
```

---

## Color Palette (from Figma)

### Status Colors
- **Occupied Seat (Green):** `#10B981` or similar success color
- **Available Seat (Purple):** `#8B5CF6` (matches primary button)
- **Reserved Seat (Gray):** `#E5E7EB`

### Button Colors
- **Primary (Purple):** `#8B5CF6`
- **Secondary/Ghost:** Transparent with border

### Badge Colors
- **Success (Opłacony):** Green `#10B981`
- **Info (Plan Name):** Gray `#6B7280`
- **Price (Euro):** Purple `#8B5CF6`

---

## Spacing & Layout

**Dialog:**
- Max width: 560px
- Padding: 24px
- Border radius: 8px

**Seat Indicators:**
- Individual indicator size: ~48px × 48px
- Spacing between indicators: 12px
- User icon size: 24px

**Seat Pills (Compact):**
- Height: 50px
- Padding: 16px
- Border radius: 8px

**List Items:**
- Height: 52px (auto)
- Padding: 12px 0
- Border between items

---

## Typography

**Dialog Title:**
- Font size: 20px
- Font weight: 600 (Semibold)
- Color: Gray 900

**Section Titles:**
- Font size: 14px
- Font weight: 600
- Color: Gray 900

**Body Text:**
- Font size: 14px
- Font weight: 400
- Color: Gray 700

**Badges/Pills:**
- Font size: 12px
- Font weight: 500

---

## State Management Flow

```
Initial (Available Seats)
  ↓ [Add email]
One Invitation Added
  ↓ [Add more emails]
Multiple Invitations / At Capacity
  ↓ [Try to add beyond limit]
Upgrade Required
  ↓ [Click "Przejdź do płatności"]
LemonSqueezy Checkout
  ↓ [Payment success]
Success State
  ↓ [Click "Zamknij"]
Dialog Closed
```

---

## Implementation Priority

1. **Phase 1:** Basic dialog with seat visualization (Screens 1-3)
2. **Phase 2:** Pending invitations list and management
3. **Phase 3:** Upgrade flow with pricing (Screen 5, 9)
4. **Phase 4:** Success states (Screen 4, 8)
5. **Phase 5:** PRO plan compact view (Screens 6-7)

---

## Notes for Developers

- Use existing shadcn/ui Dialog component as base
- Seat visualization switches automatically between `default` and `compact` based on total seats (threshold: 5 seats)
- All text should support i18n using next-intl
- Price formatting should use locale-aware currency formatting
- Email validation should match existing patterns in AddEmployeePage
- Delete actions require confirmation dialog
- All states should be accessible via keyboard navigation
- Loading states needed for async operations (sending invitations, payment processing)
