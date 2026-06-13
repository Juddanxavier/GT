# Feature Landscape: Multi-Tenant Shipment Tracking Platform

**Domain:** Multi-tenant shipment tracking / logistics platform
**Researched:** 2026-06-13
**Mode:** Ecosystem research for Gajan Traders project

## Feature Taxonomy

Features are categorized into three tiers:

| Tier | Definition | Missing It Means |
|------|-----------|------------------|
| **Table Stakes** | Users expect these. Competitors all have them. | Users leave for another platform. |
| **Differentiators** | Not universal. Set the platform apart. Win deals. | Commodity positioning, harder to sell. |
| **Anti-Features** | Should explicitly NOT build. | Waste of time, scope creep, or irrelevant. |

---

## Table Stakes

### T1: Real-Time Shipment Tracking
**Why expected:** This is the core product. AfterShip, 17TRACK, Track123, Freightify — all offer it as the baseline. Without it, no one uses the platform.
**Complexity:** Medium
**Notes:**
- Multi-carrier via 17TRACK (2,400+ carriers, 3 req/s rate limit)
- Carrier auto-detection from tracking number
- Normalized status mapping: In Transit, Delivered, Expired, Ready to Pick Up, Undelivered, Returned, Not Found (17TRACK's taxonomy)
- Webhook listener for automatic status push (17TRACK pushes to callback URL)
- Status polling fallback if webhook misses events
- Shipment must show: current status, location, timestamp, carrier, estimated delivery

### T2: Multi-Carrier Coverage
**Why expected:** Customers ship via multiple carriers (DHL, FedEx, UPS, India Post, Sri Lanka Post, regional couriers). A platform that only supports one carrier is useless.
**Complexity:** Low (handled by 17TRACK integration)
**Notes:**
- 17TRACK covers 3,300+ carriers globally — this decision is already made
- No need to build carrier integrations; 17TRACK abstracts them
- Australia Post, India Post, Sri Lanka Post all covered per project needs

### T3: White-Label / Branded Customer Portal
**Why expected:** B2B logistics customers expect the tracking page to show their brand, not "Powered by GT Express." Logixboard, Freightify, Fourways Track all position white-label as baseline.
**Complexity:** Medium
**Notes:**
- Custom domain per tenant
- Tenant logo, colors, favicon
- No third-party branding anywhere on the page
- Locale/language per tenant (English for India, Sinhala/Tamil/English for Sri Lanka)
- This is already designed into the architecture via packages/tenant-config

### T4: Proactive Notifications (Email)
**Why expected:** "Where Is My Order" (WISMO) reduction is the primary KPI for all tracking platforms. AfterShip reports 65% WISMO reduction from proactive notifications. Customers expect to hear when status changes.
**Complexity:** Medium
**Notes:**
- Triggered on every status change from 17TRACK webhook
- React Email templates (tenant-branded)
- Resend as delivery provider (already selected)
- Must include: tracking number, current status, ETA, link to portal
- Configurable notification preferences per customer (opt-in/out per event type)

### T5: Real-Time Status Dashboard
**Why expected:** Operations teams need to see all active shipments at a glance — which are on time, delayed, delivered, or stuck.
**Complexity:** Low
**Notes:**
- Filterable by status, date range, carrier, branch, customer
- Quick stats: total active, in transit, delivered today, exceptions
- Sort by most recently updated, ETA, priority

### T6: Customer Management (CRUD)
**Why expected:** Can't track shipments for customers without managing customer records.
**Complexity:** Low
**Notes:**
- Create, read, update, deactivate customers
- Contact info, phone, email, address, notes
- Shipment history per customer
- Tenant-scoped (customers belong to an org/branch)

### T7: Shipment Management (CRUD)
**Why expected:** Foundational — add/manage shipments with tracking numbers, references, notes.
**Complexity:** Low
**Notes:**
- Manual entry and/or bulk import
- Fields: tracking number, carrier, customer, origin/destination, ETA, reference number, notes
- Auto-register tracking number with 17TRACK API on creation (required for webhook to fire)
- Status update on webhook receipt
- History/log of all status changes

### T8: Quotation Management
**Why expected:** Freight forwarders and logistics providers quote before shipping. Without quote → invoice flow, the platform doesn't complete the workflow. Freightify built their entire platform around this.
**Complexity:** Medium
**Notes:**
- Create quotes for customers
- Quote status: draft, sent, accepted, expired, converted to shipment
- Line items: services, charges, taxes
- Convert accepted quote to shipment
- Customer portal shows quote status

### T9: Invoice Management
**Why expected:** After quoting and shipping, billing is the natural next step. Incomplete without it.
**Complexity:** Medium
**Notes:**
- Generate invoice from accepted quote or directly
- PDF generation via React PDF (already selected — <50ms, no Chrome dependency)
- Invoice fields: invoice number, date, customer, line items, totals, tax, payment terms
- Status: unpaid, paid, overdue, cancelled
- Customer portal shows invoices

### T10: Branch Management
**Why expected:** Multi-tenant with org+branch hierarchy means branches are a core entity. Without branch management, the org structure breaks.
**Complexity:** Low
**Notes:**
- Branches belong to orgs
- Each branch can have its own customers, shipments, users
- Branch-specific branding overrides possible (within tenant bounds)
- Branch-scoped dashboards

### T11: Tenant Data Isolation
**Why expected:** Absolute requirement for multi-tenant SaaS. A customer in Org A must never see Org B's data. Data leaks kill trust instantly.
**Complexity:** Medium
**Notes:**
- All queries scoped by tenantId (middleware pattern)
- tenantId column on every core table
- CASL roles enforce what data each role sees within a tenant
- Super admin can cross-tenant view (this is the exception, not the rule)
- Test: Can customer from Org A see Org B shipments? Must answer NO.

### T12: Admin Dashboard with KPIs
**Why expected:** Operations needs a command center. Fourways Track, Logixboard, Freightify all feature admin dashboards prominently.
**Complexity:** Low
**Notes:**
- Key metrics: shipments today, active shipments, delivered, exceptions
- Per branch/org drill-down
- Charts: shipments over time, status breakdown, carrier performance
- At-a-glance view for daily ops

---

## Differentiators

### D1: WhatsApp Notifications (Email + WhatsApp)
**Why valuable:** In India and Sri Lanka, WhatsApp is the dominant messaging channel with 95%+ open rates vs ~20% for email. Most logistics tracking platforms offer email + SMS only. WhatsApp integration (via MSG91, already proven in GT Express) is a real differentiator for the target market.
**Complexity:** Medium
**Notes:**
- MSG91 WhatsApp API (existing in GT Express, carries forward)
- Tenant-scoped sender numbers
- Template-based messages with tracking info
- Triggered on same events as email
- Must handle WhatsApp opt-in/opt-out per customer
- Rich media support (status updates with images)

### D2: Multi-Tenant Org+Branch Role Hierarchy
**Why valuable:** Most off-the-shelf tracking platforms are single-tenant. The org → branch → staff hierarchy with per-scope permissions is rare. This is valuable for logistics companies with multiple offices/divisions.
**Complexity:** High
**Notes:**
- Roles: superadmin, tenant-admin, staff, customer
- Scope: global, org, branch, self
- Staff can be assigned to specific branches
- Customers are org-scoped (not branch-scoped by default)
- This is already designed in AUTH-02 via CASL

### D3: Super Admin Cross-Tenant View
**Why valuable:** Most multi-tenant platforms hide cross-tenant data even from admins. A super admin who can see ALL orgs, branches, shipments, and performance metrics is unusual and valuable for a logistics group running multiple brands.
**Complexity:** Medium
**Notes:**
- Reserved for superadmin role only
- Cross-tenant dashboards: total shipments across all orgs, comparison views
- Drill-down into any org without switching login
- Audit log per org for governance
- Feature flag: disable cross-tenant visibility for security-conscious tenants

### D4: Per-Tenant Branding Configuration (Logo, Colors, Domain, Locale)
**Why valuable:** Each tenant (India vs Sri Lanka) needs distinct branding, language, currency, and domain. Most white-label platforms offer one brand per instance, not per-tenant config.
**Complexity:** Medium
**Notes:**
- packages/tenant-config holds per-tenant branding
- Applied at middleware/render time via tenantId
- India portal: .in domain, INR currency, English
- Sri Lanka portal: .lk domain, LKR currency, Sinhala/Tamil/English
- Config-driven — adding a tenant requires config entry, not code change

### D5: Real-Time Tracking Updates via Socket.IO + Redis
**Why valuable:** Most tracking platforms use polling (check every 5-10 minutes). Real-time push via WebSocket gives instant updates. Customers see status changes as they happen without refreshing.
**Complexity:** High
**Notes:**
- Socket.IO with Redis adapter for horizontal scaling
- Webhook from 17TRACK → Hono API → emit to relevant Socket.IO rooms
- Rooms scoped by customer/shipment
- Only customers who own the shipment receive updates (enforced via auth)
- Fallback: polling every 60s if WebSocket disconnected

### D6: Automated Quotation with Status Workflow
**Why valuable:** Freightify's differentiator is sub-30-second quote generation. Standard platforms have manual quoting. Automating the quote → approval → shipment conversion loop saves hours per day for ops.
**Complexity:** Medium
**Notes:**
- Customer requests quote from portal
- Admin receives notification, creates quote
- Status: Draft → Sent → Accepted → Converted to Shipment
- Or: Sent → Expired/Rejected
- Quote templates per customer/branch
- PDF download of quote

### D7: Invoice + PDF Generation with React PDF
**Why valuable:** Fast PDF generation is table stakes, but using React PDF (50ms vs Puppeteer's 2-3s) is a technical differentiator that enables better UX.
**Complexity:** Low
**Notes:**
- React PDF already selected per project decisions
- Tenant-branded invoice PDF
- Shipment summary PDF for customer portal
- Instant generation — no queue needed (unlike Puppeteer)

### D8: Background Job Queue (BullMQ + Redis) for Reliability
**Why valuable:** When 17TRACK webhook fires, the platform needs to: (1) update DB, (2) send email, (3) send WhatsApp, (4) push Socket.IO event. Doing all this synchronously is fragile. Background job queue ensures reliability — if email service is down, the job retries.
**Complexity:** Medium
**Notes:**
- BullMQ + Redis already selected per INFRA-01
- Jobs: send notification, generate PDF, sync tracking
- Retry with backoff
- Dead letter queue for failed jobs
- Tenant-isolated job queues or tenantId-tagged jobs

### D9: Exception and Delay Detection
**Why valuable:** AfterShip positions this as premium — auto-flagging shipments that haven't been scanned in 48+ hours, or where ETA is missed. Standard platforms just show the status. Proactive exception alerting is differentiator.
**Complexity:** Medium
**Notes:**
- Cron job (via BullMQ) checks for stale shipments
- No status update for >X hours → flag as "delayed"
- ETA passed but still in transit → flag as "overdue"
- Notify admin + customer proactively
- Dashboard shows exceptions prominently

### D10: Analytics and Reporting per Tenant
**Why valuable:** Logixboard and Freightify both report this as a differentiator — most tracking platforms have weak analytics. Per-tenant reporting with shipment volumes, carrier performance, on-time delivery rates, and revenue tracking is valuable ops intelligence.
**Complexity:** Medium
**Notes:**
- Shipment volume trends (daily/weekly/monthly)
- Carrier performance: on-time %, avg transit time, exception rate
- Customer activity: total shipments per customer, active customers
- Revenue: invoices generated, outstanding payments
- Export to CSV/PDF
- Super admin gets roll-up across all tenants

### D11: Quote → Shipment → Invoice Lifecycle Pipeline
**Why valuable:** This is the killer workflow — a customer requests a quote, admin responds, customer accepts, shipment is created, tracked, delivered, and invoiced — all on one platform. Most solutions do tracking OR quoting OR invoicing, not all three.
**Complexity:** High
**Notes:**
- End-to-end: Quote Request → Quote → Approval → Shipment → Tracking → Delivery → Invoice
- Status visibility at every step
- Portal shows customer the pipeline for their shipments
- This is the core workflow that ties the whole platform together

---

## Anti-Features

### AF1: Native Mobile Apps (iOS/Android)
**Why avoid:** Mobile apps require separate codebases, app store management, push notification infrastructure, and ongoing maintenance. The project explicitly marks this out of scope. Web-first with responsive design covers mobile browser usage.
**Instead:** Responsive Next.js frontends + PWA capabilities if mobile is needed later.

### AF2: Payment Processing / Payment Gateway
**Why avoid:** Handling payments means PCI DSS compliance, payment gateway integration, refund handling, failed payment retries, fraud detection. Adds massive compliance scope without being core to the product. The project explicitly marks this out of scope.
**Instead:** Invoices show amounts. Payment is handled outside the platform (bank transfer, cash, etc.). Add payment tracking (mark invoice as paid) but not payment processing.

### AF3: Fleet Management / GPS Tracking
**Why avoid:** GPS tracking of vehicles is a different product category (Teltonika, Navixy, Fleet tracking). It requires IoT hardware, real-time GPS data ingestion, geofencing, driver behavior monitoring. Completely different domain.
**Instead:** Focus on shipment tracking via 17TRACK carrier data. If fleet tracking is needed later, it's a separate product.

### AF4: Warehouse Management (WMS)
**Why avoid:** Inventory management, bin locations, pick/pack/ship workflows, receiving — all WMS features. Different domain, different customers.
**Instead:** The platform tracks shipments after they leave the warehouse. No inventory features.

### AF5: Route Optimization / Dispatch Planning
**Why avoid:** AI-driven route optimization and dispatch planning are resource-intensive features requiring graph algorithms, real-time traffic data, and driver allocation. Locus and others exist for this.
**Instead:** Manual carrier selection. No route optimization.

### AF6: Returns Management
**Why avoid:** AfterShip makes returns management a pillar, but for this platform (freight forwarding / cross-border), returns follow a different workflow and are rare.
**Instead:** Track manually if needed, but don't build automated returns flow.

### AF7: EDI (Electronic Data Interchange) Connections
**Why avoid:** EDI integrations (EDIFACT, ANSI X12) are complex, require certification per trading partner, and are typically handled by enterprise TMS systems. Not relevant for an India/Sri Lanka focused platform.
**Instead:** API-first approach. 17TRACK handles carrier EDI. Don't build direct EDI connections.

### AF8: Market Expansion Beyond India/Sri Lanka (for Phase 1)
**Why avoid:** Additional countries add locale complexity, carrier coverage verification, compliance, and multi-currency. Per project scope, this is out of scope for now.
**Instead:** Architecture supports adding tenants via config. Future phases can add countries.

---

## Feature Dependencies

```
Foundation Layer (Phase 1)
├── Auth & Multi-Tenancy (AUTH-01 through AUTH-03)
│   └── Tenant data isolation (T11) — all features depend on this
├── Customer Management (T6) — needed by shipments, quotes, invoices
└── Branch Management (T10) — needed by org hierarchy

Tracking Layer (Phase 2)
├── Shipment Management (T7) — requires Customer Management
├── 17TRACK Integration (T1, T2) — requires Shipment Management
├── Real-Time Dashboard (T5) — requires Shipment Management + 17TRACK
└── Exception Detection (D9) — requires 17TRACK Integration

Customer Portal Layer (Phase 3)
├── White-Label Portal (T3) — requires Shipment + Customer Management
├── Proactive Notifications - Email (T4) — requires 17TRACK Integration
├── Proactive Notifications - WhatsApp (D1) — requires T4 infrastructure
├── Real-Time Updates via Socket.IO (D5) — requires T1 webhook pipeline
├── Per-Tenant Branding (D4) — requires tenant config system
└── Quote lifecycle (D11 part 1: customer requests) — requires Portal

Admin Operations Layer (Phase 4)
├── Quotation Management (T8) — requires Customer Management
├── Invoice Management (T9) — requires Quotation Management
├── Quote → Shipment → Invoice Pipeline (D11) — requires T8 + T9 + T7
├── PDF Generation (D7) — requires Invoice Management
└── Admin KPIs (T12) — requires all above

Super Admin Layer (Phase 5)
├── Cross-Tenant Dashboard (D3) — requires all tenant data sources
├── Analytics & Reporting (D10) — requires data from all layers
└── Background Job Queue (D8) — operational infra, built early but scaffolded

```

## Complexity Summary

| Feature | Complexity | Dependencies | Phase |
|---------|-----------|-------------|-------|
| T11: Tenant Data Isolation | Medium | Auth system | P1 |
| T6: Customer Management | Low | None | P1 |
| T10: Branch Management | Low | Auth + org | P1 |
| T7: Shipment Management | Low | Customer Mgmt | P2 |
| T1: Real-Time Tracking | Medium | Shipment Mgmt, 17TRACK | P2 |
| T2: Multi-Carrier Coverage | Low | 17TRACK (handled) | P2 |
| T5: Status Dashboard | Low | Shipment Mgmt | P2 |
| D9: Exception Detection | Medium | T1, T7 | P2 |
| T3: White-Label Portal | Medium | Everything above | P3 |
| T4: Email Notifications | Medium | T1, T7 | P3 |
| D1: WhatsApp Notifications | Medium | T4 patterns | P3 |
| D5: Socket.IO Real-Time | High | T1 webhook pipeline | P3 |
| D4: Per-Tenant Branding | Medium | Tenant config | P3 |
| D6: Automated Quoting | Medium | T6, T8 | P4 |
| T8: Quotation Management | Medium | T6 | P4 |
| T9: Invoice Management | Medium | T8 | P4 |
| D11: Full Lifecycle Pipeline | High | T7, T8, T9 | P4 |
| D7: React PDF | Low | T9 | P4 |
| T12: Admin KPIs | Low | All ops data | P4 |
| D3: Super Admin View | Medium | All tenants | P5 |
| D10: Analytics & Reporting | Medium | All data | P5 |
| D8: BullMQ Job Queue | Medium | Redis | P0 (infra) |

## Phase Prioritization Recommendation

### Phase 1 (Foundation)
Build the core multi-tenant infrastructure and the data entities everything depends on:
- **T11** (Tenant Isolation)
- **T6** (Customer Management)
- **T10** (Branch Management)
- **T8** (Quotation Management - so customers can start quoting)
- **D8** (BullMQ job scaffolding — foundation for notifications)

### Phase 2 (Core Tracking)
The primary value proposition — add shipments and track them:
- **T7** (Shipment Management)
- **T1** + **T2** (17TRACK Integration)
- **T5** (Status Dashboard)
- **D9** (Exception Detection — cheap to add once tracking works)

### Phase 3 (Customer Portals)
Expose tracking to customers and notify them:
- **T3** (White-Label Portal)
- **T4** (Email Notifications)
- **D1** (WhatsApp Notifications)
- **D5** (Socket.IO Real-Time)
- **D4** (Per-Tenant Branding)

### Phase 4 (Admin Operations)
Close the business loop:
- **T9** (Invoice Management)
- **D11** (Quote → Shipment → Invoice pipeline)
- **D7** (PDF Generation)
- **T12** (Admin KPIs)

### Phase 5 (Cross-Tenant Intelligence)
Super admin visibility and analytics:
- **D3** (Cross-Tenant Dashboard)
- **D10** (Analytics & Reporting)

---

## Sources

| Source | Type | Confidence |
|--------|------|-----------|
| AfterShip (aftership.com) — product features, tracking, notifications, white-label | Official site | HIGH |
| 17TRACK API (api.17track.net/en/doc) — tracking API, webhooks, 3,300+ carriers | Official docs | HIGH |
| Freightify (checkthat.ai/brands/freightify) — feature breakdown, quote automation, portals | Review aggregator | MEDIUM |
| Logixboard (logixboard.com) — white-label customer portal, tracking, quoting | Official site | MEDIUM |
| Fourways Track (fourways-track.info) — white-label tracking, admin, documents | Official site | MEDIUM |
| Locus.sh — logistics tracking evaluation framework (8 capabilities) | Industry analysis | MEDIUM |
| Acquaint Softtech — logistics software development guide 2026 | Industry analysis | MEDIUM |
| ShipTrack (shiptrackapp.com) — feature set: paperless, productivity, invoicing | Official site | MEDIUM |
| CXT Software — customer portal features: ETA, tracking, notifications, invoicing | Official site | MEDIUM |

