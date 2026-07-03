# Phase 3a: Customer Dashboard & Home

**Goal**: Customer dashboard with shipment KPIs, recent shipments, alerts; redesigned home/landing page

## Tasks

### 1. API: GET /api/customers/my-dashboard

**File**: `apps/api/src/routes/customers.ts`

Add endpoint `GET /my-dashboard` (alongside existing `/my-shipments`):

- Guard: `user.role === 'customer'` (same pattern as `/my-shipments`)
- Resolve customer record by email match: `db.select().from(customers).where(and(eq(customers.tenantId, tenantId), eq(customers.email, userEmail)))`
- Build shipment filter conditions (same dual lookup as `/my-shipments`):
  - `contactMatch = eq(shipments.contactEmail, userEmail)`
  - `customerIdMatch = customerRecord ? eq(shipments.customerId, customerRecord.id)` : null
  - Final: `and(isNull(shipments.archivedAt), eq(shipments.tenantId, tenantId), or(contactMatch, customerIdMatch))`

Return shape:

```ts
{
  kpis: {
    total: number;
    inTransit: number;
    delivered: number;
    exception: number;
    pending: number;
  };
  recent: Array<{
    id: string;
    trackingNo: string;
    status: string;
    carrier: string | null;
    origin: string | null;
    destination: string | null;
    createdAt: string;
  }>;
  alerts: Array<{
    trackingNo: string;
    status: string;
    message: string;
  }>;
}
```

Query logic:
- **KPIs**: 5 individual `SELECT COUNT(*)` queries with status filters
- **Recent**: `SELECT` with `ORDER BY createdAt DESC LIMIT 5`
- **Alerts**: `SELECT` with `status IN ('exception', 'delivery_failure') LIMIT 5`

No caching needed (customer-scoped, low traffic).

### 2. UI: Redesign Home Page

**File**: `apps/customer/app/(portal)/page.tsx`

Split into two states:

**Logged out** (existing behavior — minimal changes):
- Hero section with brand logo + title
- Tracking number input + Track button
- Quick search result display
- CTA: Sign in / Register buttons

**Logged in** (new dashboard view):
- Welcome section: "Welcome back, {name}"
- KPI cards row:
  - Total Shipments (Package icon)
  - In Transit (Truck icon)
  - Delivered (CheckCircle2 icon)
  - Exceptions (AlertTriangle icon)
- Recent Shipments list (last 5) — compact card format with status badges, carrier, route
- Alerts section (if any) — warning cards for exception/delivery_failure shipments
- Quick link to /my-shipments

### 3. UI: KPI Card Component

**File**: `apps/customer/components/kpi-card.tsx`

Simple presentational component:

```tsx
interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  color?: 'emerald' | 'violet' | 'amber' | 'blue';
}
```

Render: icon badge + label + value in a bordered card.

### 4. Create DB directory structure

```
apps/customer/app/(portal)/
├── page.tsx            ← Redesigned: dashboard when logged in, tracking when logged out
├── layout.tsx          ← Already exists (portal-nav wrapper)
├── my-shipments/
└── track/
```

## Files to Create
- `apps/customer/components/kpi-card.tsx`

## Files to Modify
- `apps/api/src/routes/customers.ts` — add `/my-dashboard` endpoint
- `apps/customer/app/(portal)/page.tsx` — redesign with dashboard state
- `apps/customer/lib/api.ts` — add `fetchCustomerDashboard` helper (if needed)

## Success Criteria
1. Logged-in customer sees KPI cards with shipment counts on home page
2. KPI numbers match actual DB state (total matches my-shipments count)
3. Recent shipments list shows last 5 shipments with status badges
4. Alert section shows any exception/failure shipments
5. Logged-out users still see tracking lookup (existing behavior preserved)
6. Both Gajan Traders (emerald) and Lanka Mahal (violet) theming works
7. Mobile: KPI cards stack in 2-column grid, recent shipments list is full-width
8. Loading state shows skeleton placeholders
9. Error state shows message with retry

## Dependencies
- `@heroui/react` already installed in customer app
- `lucide-react` already installed
- API auth/session middleware already handles `customer` role
- No DB schema changes needed
