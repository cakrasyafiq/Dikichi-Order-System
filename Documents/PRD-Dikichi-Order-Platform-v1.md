# PRD: Dikichi Order Management Platform

| Field | Value |
| :--- | :--- |
| Version | 1.1 (Final, for team sign-off) |
| Status | Ready for approval. Once approved, changes go through section 20 (Change Control) |
| Source | Product Brief v1.0 |
| Course | Arsitektur Berbasis Layanan, Semester Ganjil 2026/2027 |
| Team | Ambatucode |
| Audience | Dev team and AI coding agents |
| Next documents | `API-Specification.md` (OpenAPI), `Requirements-and-Acceptance-Criteria.md` |

---

## 1. At a Glance (read this first)

**What we build:** A dine-in ordering web app. A guest orders from the table, the Cashier reconfirms and takes mock payment, the Kitchen prepares, the Master manages outlets, tables, and menu.

**What we show the lecturer:**
1. All five HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) used meaningfully.
2. Two live API versions (`/api/v1`, `/api/v2`) with a breaking change on Orders.
3. Three Spring Boot services (gateway, catalog, order); catalog-service and order-service each own an isolated PostgreSQL database, while gateway-service is stateless.
4. A GitHub Actions pipeline that builds, tests, builds images, and deploys.

**Order flow:** `PENDING` (guest submits) > `ACCEPTED` (cashier reconfirms, may edit) > `PREPARING` (mock payment done) > `READY` > `COMPLETED`. `CANCELLED` is possible from `PENDING` and `ACCEPTED`.

**Stack (final):** Java 21, Spring Boot 4.0.x with Spring Cloud 2025.1.x, PostgreSQL 16, Flyway, React + Vite + TypeScript + Tailwind, Docker Compose, GitHub Actions + GHCR.

**Everything that was open in the brief is now decided in section 19 (Decision Log).** Each decision has a reason and the condition under which we would change it.

## 2. Rules for AI Coding Agents

1. This PRD is the single source of truth. If code, a prompt, or the old brief conflicts with it, this PRD wins.
2. Every statement here is a decision. If something is not specified, do not invent a pattern. Stop and list it as a question.
3. Keep one pattern per concern across all services (error format, DTO naming, layering, validation). Copy the pattern from the first implemented service.
4. Never hardcode secrets. Never bypass a failing typecheck, lint, test, or build gate.
5. Never merge v1 and v2 DTOs into one class. Domain logic is shared; DTOs are separate.

## 3. Problem and Hypothesis

**Problem:** At busy outlets, taking full menu selections at the cashier creates queues during peak dine-in hours. Manual handling also makes it hard to coordinate order corrections, out-of-stock items, and preparation status.

**Hypothesis:** If customers compose their own order at the table and staff only reconfirm, pay, and prepare, order intake becomes faster and staff gain clearer visibility.

The deliverable is an independent academic prototype. It is not connected to Dikichi production systems.

## 4. Goals and Non-Goals

### 4.1 Goals
- G1. Guest ordering with no login: outlet, table, name, menu, submit.
- G2. Cashier flow: review, edit (`PUT`), accept, mock pay, cancel.
- G3. Kitchen flow: queue, mark `READY`, mark `COMPLETED`.
- G4. Master flow: manage outlets, tables, menu items.
- G5. Demonstrate all five HTTP methods with real semantics.
- G6. Demonstrate two live API versions with a documented breaking change.
- G7. Demonstrate microservices with isolated databases and automated CI/CD.

### 4.2 Non-Goals
- Customer order tracking or status page after submission.
- Real payment gateway.
- Tax, service charge, discount, voucher, loyalty.
- WebSocket or SSE push.
- Customer edit or cancel after submission.
- Free-text notes on orders or items.
- Staff account management UI (accounts are seeded).
- Refresh tokens, password reset, rate limiting, internationalization.
- Jenkins (see D2 in the Decision Log).

## 5. Users, Dashboards, and Permissions

| Route | User | Auth |
| :--- | :--- | :--- |
| `/order` | Dine-in customer | None (guest) |
| `/login` | Staff | None |
| `/cashier` | Cashier | `ROLE_CASHIER` |
| `/kitchen` | Kitchen master | `ROLE_KITCHEN` |
| `/master` | Manager | `ROLE_MASTER` |

### Permission Matrix

| Action | Guest | Cashier | Kitchen | Master |
| :--- | :---: | :---: | :---: | :---: |
| View outlets, tables, menu items | Yes | Yes | Yes | Yes |
| Create order | Yes | No | No | No |
| View orders (queue and detail) | No | Own outlet | Own outlet | No |
| Replace `PENDING` order (`PUT`) | No | Yes | No | No |
| `PENDING` to `ACCEPTED` or `CANCELLED`, `ACCEPTED` to `CANCELLED` | No | Yes | No | No |
| Mock payment | No | Yes | No | No |
| `PREPARING` to `READY`, `READY` to `COMPLETED` | No | No | Yes | No |
| Toggle item availability | No | Own outlet | Own outlet | Yes |
| Create, replace, delete outlet or menu item; create, delete table | No | No | No | Yes |

"Own outlet" means the `outletId` in the staff member's JWT. Master has no outlet restriction and no access to orders.

## 6. Order Lifecycle

### 6.1 Allowed Transitions (exhaustive)

| From | To | Actor | Trigger |
| :--- | :--- | :--- | :--- |
| (none) | `PENDING` | Guest | `POST /orders` |
| `PENDING` | `ACCEPTED` | Cashier | `PATCH /orders/{id}/status` |
| `PENDING` | `CANCELLED` | Cashier | `PATCH /orders/{id}/status` |
| `ACCEPTED` | `CANCELLED` | Cashier | `PATCH /orders/{id}/status` |
| `ACCEPTED` | `PREPARING` | System | `POST /orders/{id}/pay` |
| `PREPARING` | `READY` | Kitchen | `PATCH /orders/{id}/status` |
| `READY` | `COMPLETED` | Kitchen | `PATCH /orders/{id}/status` |

Rules:
- Any other transition returns `409` with code `INVALID_STATUS_TRANSITION`.
- `PATCH` to `PREPARING` is never allowed directly. It happens only through `pay`.
- A role attempting a transition it does not own gets `403`.
- `PUT` is allowed only while `PENDING`. Otherwise `409` with `ORDER_NOT_EDITABLE`.
- `COMPLETED` and `CANCELLED` are terminal.
- Accepting and paying do not re-check item availability. The Cashier is responsible for fixing the order with `PUT` before accepting.
- A table may have several active orders at the same time.

### 6.2 End-to-End Flow
1. Customer opens `/order?outlet=OUT-01&table=T-01` (simulated QR) or selects outlet and table manually, then enters name.
2. Customer selects items and submits. The server validates outlet, table, and items, snapshots name and price, computes the total, creates a `PENDING` order, and returns the order number (example `ORD-0042`). The customer sees a static confirmation screen.
3. Customer goes to the cashier. The Cashier opens the `PENDING` order, reconfirms with the customer, fixes mistakes via `PUT` if needed, then sets `ACCEPTED`.
4. Cashier selects a mock payment method and confirms. The order becomes `PREPARING` automatically.
5. Kitchen sees the order and sets `READY`. The announcer calls the customer (offline, outside the system). After pickup or serving, Kitchen sets `COMPLETED`.

## 7. Functional Requirements

| ID | Requirement | Goal | Priority |
| :--- | :--- | :--- | :--- |
| FR-01 | Public endpoints list non-deleted menu items per outlet, including the `available` flag. The customer UI shows unavailable items as disabled ("Sold out") and blocks adding them. | G1 | Must |
| FR-02 | Each order stores a validated `outletId`, `tableCode`, and `customerName`. | G1 | Must |
| FR-03 | A guest can submit an order with 1 or more available items and quantities (`POST`) without authentication. | G1 | Must |
| FR-04 | The server validates availability via Catalog Service, snapshots item name and unit price, and computes the total as `sum(unitPrice * quantity)` in integer IDR. Client-sent prices are ignored. | G1 | Must |
| FR-05 | A Cashier can replace table code, customer name, and item list of a `PENDING` order (`PUT`). The total is recomputed. | G2 | Must |
| FR-06 | Cashier and Kitchen can list orders filtered by status (`GET`) and perform only their permitted transitions (`PATCH`). | G2, G3 | Must |
| FR-07 | A Cashier can record a mock payment for an `ACCEPTED` order (`POST`). The status becomes `PREPARING` in the same transaction. | G2 | Must |
| FR-08 | Master can `POST`, `GET`, `PUT`, `DELETE` (soft) outlets and menu items, and `POST`, `GET`, `DELETE` (soft) tables. Tables have no `PUT` because their only editable field is the code. | G4 | Must |
| FR-09 | Master, Cashier, and Kitchen can toggle menu item availability (`PATCH`). Cashier and Kitchen only for their own outlet. | G4 | Must |
| FR-10 | `/api/v1` and `/api/v2` order endpoints run at the same time with the breaking change in section 11.5. | G6 | Must |
| FR-11 | CI runs build and tests on push and pull request. Passing `main` builds deploy to the test environment. | G7 | Must |
| FR-12 | Staff authenticate via `POST /api/v1/auth/login` and receive a JWT. Protected endpoints enforce role and outlet scope. | G2, G3, G4 | Must |
| FR-13 | After submission the customer sees a confirmation screen with the order number. No further tracking. | G1 | Must |

## 8. Architecture

### 8.1 Monorepo Layout

```
/
  Backend/
    gateway-service/
    catalog-service/
    order-service/
    docker-compose.yml
  Frontend/
  Documents/
    openapi.yaml
    PRD-Dikichi-Order-Platform-v1.md
    Product-brief_Dikichi-order-system.md
    Software-Architecture-Document.md
    API-Migration-v1-to-v2.md
    API-Specification.md
    Database-Design-and-Data-Dictionary.md
  .github/workflows/ci-cd.yml
  .env.example
```

### 8.2 Technology (final)

| Concern | Choice |
| :--- | :--- |
| Backend | Java 21, Spring Boot 4.0.x (latest patch, 4.0.7 or newer), Spring Cloud 2025.1.x, Maven |
| Gateway | Spring Cloud Gateway (WebFlux). Use the starter names from the Spring Cloud 2025.1.x documentation |
| Persistence | Spring Data JPA, PostgreSQL 16, Flyway (schema and seed) |
| Inter-service calls | Spring `RestClient`, connect timeout 2 s, read timeout 3 s, no retry |
| API docs | springdoc-openapi per service |
| Backend tests | JUnit 5, Spring Boot Test, Testcontainers (PostgreSQL). No H2 |
| Frontend | React 18+, Vite, TypeScript (strict), Tailwind CSS, React Router, TanStack Query, Zod |
| Runtime | Docker Compose. The frontend container (Nginx) serves static files and proxies `/api` to the gateway, so the browser uses one origin and no CORS |
| CI/CD | GitHub Actions, GHCR images, deploy by SSH + `docker compose` |

Note on versions: Spring Cloud 2025.1.x is the release train matching Spring Boot 4.0.x and 4.1.x, and 2025.1.2 includes a Gateway security fix. Agents must use Spring Boot 4 idioms (not Boot 3 snippets from older tutorials). The pinned versions must be confirmed by a successful build when the projects are generated.

### 8.3 Services and Data Ownership

| Service | Port | Database | Owns |
| :--- | :--- | :--- | :--- |
| `gateway-service` | 8080 | none | Routing, JWT validation, identity headers |
| `catalog-service` | 8081 | `catalog_db` | `Outlet`, `Table`, `MenuItem`, `StaffUser`, login and JWT issuing |
| `order-service` | 8082 | `order_db` | `Order`, `OrderItem`, `MockPayment` |

- No service reads another service's database. Cross-service data goes through HTTP only.
- `order-service` stores `outletId`, `tableCode`, and `menuItemId` as plain values, with no foreign keys across databases.

### 8.4 Gateway Behavior
- Public routes (no JWT): `POST /api/v1/auth/login`, `GET` outlets, tables, and menu items, `POST /api/{v1|v2}/orders`.
- All other routes require a valid JWT. A missing or invalid token returns `401`.
- On success the gateway forwards `X-User-Name`, `X-User-Role`, `X-Outlet-Id` (absent for Master) and strips any client-supplied copies of these headers.
- Only `gateway-service` and `frontend` publish ports to the host. Downstream services are reachable only inside the Compose network, which is why they can trust the identity headers.
- `/internal/**` is never routed by the gateway.
- Each service still enforces role and outlet scope itself. The gateway is not the only check.

### 8.5 Authentication
- `catalog-service` serves login, verifies BCrypt-hashed seeded accounts, and issues a JWT (HS256, secret from `JWT_SECRET` with at least 32 bytes, expiry 8 hours, no refresh).
- Claims: `sub` (username), `role` (`MASTER`, `CASHIER`, `KITCHEN`), `outletId` (null for Master).
- Gateway validates with the same secret.
- Seeded accounts: `master`, `cashier`, `kitchen` (the last two bound to `OUT-01`). Demo passwords come from env and seed, documented only in the README.
- Login failure returns a generic `401` without revealing which part was wrong.
- The frontend keeps the token in `sessionStorage` and sends `Authorization: Bearer <token>`.

### 8.6 Order Service to Catalog Service Contract
Used on order create and on `PUT` order.

`POST /internal/orders/validate` (catalog-service, internal only)

Request:
```json
{ "outletId": "OUT-01", "tableCode": "T-01",
  "items": [ { "menuItemId": "uuid", "quantity": 2 } ] }
```
Success `200`:
```json
{ "items": [ { "menuItemId": "uuid", "name": "Mie Suit", "unitPrice": 25000 } ] }
```
Failures:
- Outlet or table not found or deleted: `422` code `INVALID_OUTLET` or `INVALID_TABLE`.
- Menu item not found, deleted, or from another outlet: `422` code `INVALID_MENU_ITEM`.
- Any item unavailable: `409` code `ITEM_UNAVAILABLE`, listing all unavailable `menuItemId`s. The whole order is rejected (all or nothing).

`order-service` returns these to the client in its own error format. If catalog-service is unreachable or times out: `503` code `CATALOG_UNAVAILABLE`, and nothing is saved.

## 9. Data Model

IDs: Outlet uses a human-readable string key (example `OUT-01`) so QR URLs and payloads stay simple. All other entities use UUID.

### 9.1 catalog_db
- `outlet(id PK varchar, name, address, is_deleted, created_at, updated_at)`
- `dining_table(id uuid PK, outlet_id FK, code, is_deleted, created_at)`. Unique `(outlet_id, code)` among non-deleted rows. Code pattern `^T-\d{2,3}$`.
- `menu_item(id uuid PK, outlet_id FK, name, description, price int, category, available bool, is_deleted, created_at, updated_at)`
- `staff_user(id uuid PK, username unique, password_hash, role, outlet_id nullable)`

### 9.2 order_db
- `orders(id uuid PK, order_number unique, outlet_id, table_code, customer_name, status, total_amount bigint, version bigint, created_at, updated_at)`
- `order_item(id uuid PK, order_id FK, menu_item_id, menu_item_name_snapshot, unit_price_snapshot, quantity, subtotal)`
- `mock_payment(id uuid PK, order_id FK unique, payment_method, amount_tendered nullable, change_amount nullable, amount_paid, paid_at)`

### 9.3 Rules
- Prices are integer IDR, greater than 0. No decimals.
- `order_number` is `ORD-` plus a zero-padded sequence (minimum 4 digits) from a PostgreSQL sequence, globally unique.
- `orders.version` is a JPA `@Version` for optimistic locking. A lost race returns `409` with code `CONCURRENT_MODIFICATION`.
- `amount_paid` equals the order's `total_amount`.
- Soft delete: `DELETE` sets `is_deleted = true`. Soft-deleted rows are hidden from all list and read endpoints and rejected for new orders, but remain in the database so historical orders stay auditable.
- Deleting an outlet does not cascade. Its tables and items become unreachable because outlet validation fails.

### 9.4 Seed Data (Flyway)
1 outlet `OUT-01`, 20 tables `T-01` to `T-20`, 10 to 15 sample menu items in at least 3 categories, 3 staff accounts.

## 10. Validation Rules

All validation runs on the server. The frontend mirrors it for UX only.

| Field | Rule |
| :--- | :--- |
| `customerName` | Required, trimmed, 1 to 50 chars |
| `tableCode` | Required, matches `^T-\d{2,3}$`, must exist in the outlet |
| `outletId` | Required, must exist and not be deleted |
| `items` | 1 to 30 lines, no duplicate `menuItemId` (`400`, lines are not merged) |
| `quantity` | Integer 1 to 99 |
| `price` | Integer 1 to 10,000,000 |
| Menu `name` | 1 to 100 chars. `category` 1 to 50 chars. `description` up to 500 chars |
| `amountTendered` | Required for `CASH` and must be at least `totalAmount`. Must be null for `QRIS` and `CARD` |

## 11. API Specification Summary

Base path through the gateway: `/api/{version}`. JSON only. Timestamps are ISO-8601 UTC.

### 11.1 Error Format (all services, all versions)

```json
{ "timestamp": "2026-10-21T10:00:00Z", "status": 409, "code": "ITEM_UNAVAILABLE",
  "message": "One or more items are unavailable",
  "path": "/api/v2/orders",
  "errors": [ { "field": "items[0].menuItemId", "message": "Item is unavailable" } ] }
```

Status code policy:
- `400` malformed body or field validation failure.
- `401` missing or invalid token, failed login.
- `403` role or outlet scope violation.
- `404` path resource not found.
- `409` state conflict (invalid transition, not editable, item unavailable, already paid, concurrent modification).
- `422` body references an invalid entity (outlet, table, menu item).
- `503` downstream service unavailable.
- Never return stack traces or internal details.

### 11.2 HTTP Method Mapping

| Method | Use |
| :--- | :--- |
| `GET` | Outlets, tables, menu items, order queues and detail |
| `POST` | Login, create order, pay order, create outlet, table, menu item |
| `PUT` | Replace menu item (Master), replace outlet (Master), replace `PENDING` order (Cashier) |
| `PATCH` | Order status (Cashier, Kitchen), menu item availability (Master, Cashier, Kitchen) |
| `DELETE` | Soft-delete outlet, table, menu item (Master) |

### 11.3 Catalog Endpoints (`/api/v1` only)

| Method | Path | Access |
| :--- | :--- | :--- |
| POST | `/auth/login` | Public |
| GET | `/outlets` | Public |
| GET | `/outlets/{outletId}` | Public |
| POST | `/outlets` | Master |
| PUT | `/outlets/{outletId}` | Master |
| DELETE | `/outlets/{outletId}` | Master |
| GET | `/outlets/{outletId}/tables` | Public |
| POST | `/outlets/{outletId}/tables` | Master |
| DELETE | `/outlets/{outletId}/tables/{code}` | Master |
| GET | `/outlets/{outletId}/menu-items` | Public |
| GET | `/menu-items/{id}` | Public |
| POST | `/outlets/{outletId}/menu-items` | Master |
| PUT | `/menu-items/{id}` | Master |
| PATCH | `/menu-items/{id}/availability` body `{ "available": false }` | Master, Cashier, Kitchen (own outlet) |
| DELETE | `/menu-items/{id}` | Master |

Only the Order resource has two contract versions. Catalog endpoints exist only under `/api/v1`.

### 11.4 Order Endpoints (same paths under `/api/v1` and `/api/v2`)

| Method | Path | Access | Notes |
| :--- | :--- | :--- | :--- |
| POST | `/orders` | Public | Creates `PENDING`. `201` with `Location` header |
| GET | `/orders?outletId=&status=` | Cashier, Kitchen | Cashier may request `PENDING`, `ACCEPTED`. Kitchen may request `PREPARING`, `READY`. Default is the role's full set. Oldest first. No pagination in MVP |
| GET | `/orders/{id}` | Cashier, Kitchen | Own outlet only |
| PUT | `/orders/{id}` | Cashier | `PENDING` only |
| PATCH | `/orders/{id}/status` body `{ "status": "ACCEPTED" }` | Cashier, Kitchen | See section 6.1 |
| POST | `/orders/{id}/pay` | Cashier | `ACCEPTED` only. Body `{ "paymentMethod": "CASH", "amountTendered": 50000 }`. Moves to `PREPARING`. A repeated call returns `409` |

Customers cannot `GET` orders. The `POST` response is their only receipt.

### 11.5 Breaking Change: v1 vs v2

Both versions call the same domain service and differ only in DTOs. The item shape is the same in both: requests use `{ menuItemId, quantity }`, responses use `{ menuItemId, name, unitPrice, quantity, subtotal }`.

**v1 create request and `PUT` body (flat):**
```json
{ "outletId": "OUT-01", "tableCode": "T-01", "customerName": "Budi",
  "items": [ { "menuItemId": "uuid", "quantity": 2 } ] }
```

**v1 response (flat):**
```json
{ "id": "uuid", "orderNumber": "ORD-0042", "outletId": "OUT-01", "tableCode": "T-01",
  "customerName": "Budi", "status": "PENDING", "items": [ ], "totalAmount": 50000,
  "createdAt": "...", "updatedAt": "..." }
```

**v2 create request and `PUT` body (nested):**
```json
{ "customer": { "name": "Budi" },
  "location": { "outletId": "OUT-01", "tableCode": "T-01" },
  "items": [ { "menuItemId": "uuid", "quantity": 2 } ] }
```

**v2 response (nested):**
```json
{ "id": "uuid", "orderNumber": "ORD-0042", "status": "PREPARING",
  "customer": { "name": "Budi" },
  "location": { "outletId": "OUT-01", "tableCode": "T-01" },
  "items": [ ],
  "paymentSummary": { "totalAmount": 50000, "paymentStatus": "PAID",
                      "paymentMethod": "CASH", "amountTendered": 60000, "change": 10000 },
  "createdAt": "...", "updatedAt": "..." }
```

`paymentStatus` is `UNPAID` or `PAID`. `paymentMethod`, `amountTendered`, `change` are `null` until paid. v1 never exposes payment details.

**Why it is breaking:** a v1 client reading `order.tableCode`, `order.customerName`, or `order.totalAmount` at the JSON root fails against v2, and a v1 request body is rejected by v2 with `400`.

The bodies of `PATCH status` and `POST pay` are identical across versions. Their responses use the order shape of the called version.

A migration guide with a field mapping table goes to `docs/api-migration-v1-to-v2.md`.

## 12. Frontend Requirements

- Single SPA with the routes in section 5. Route guards redirect unauthenticated users to `/login` and users with the wrong role to their own dashboard.
- Customer page is mobile-first (minimum width 360 px). Cashier and Kitchen dashboards must work on tablet and desktop.
- Polling: Cashier and Kitchen queues refetch every 5 seconds (TanStack Query `refetchInterval`) plus a visible "Refresh Now" button. Polling pauses when the tab is hidden.
- The demo toggle on `/order` chooses `v1` or `v2` for order submission only. Staff dashboards always use `v2`. The confirmation screen shows which version was used.
- Cashier payment dialog: method selector (`CASH`, `QRIS`, `CARD`). For `CASH`, an input for cash tendered with live change calculation. Confirm is disabled until tendered is at least the total.
- Every data view has a loading skeleton, an empty state with a message, and an error state with retry. No layout shift.
- Buttons for submit, pay, and status change are disabled while a request is in flight.
- Accessibility: semantic HTML, labels bound to inputs, visible focus, full keyboard operation, WCAG AA contrast, touch targets at least 24x24 px, descriptive alt text.
- Static text, status labels, and category options live in a constants module, not inline in components.

## 13. Non-Functional Requirements

| Area | Requirement |
| :--- | :--- |
| Security | Secrets via environment variables only. BCrypt passwords. Server-side authorization on every protected endpoint. `/internal/**` unreachable from outside. No sensitive data in logs |
| Integrity | Optimistic locking on `orders`. Transitions validated against the persisted status inside a transaction. `pay` is atomic (payment row plus status change) and cannot apply twice (unique `mock_payment.order_id`) |
| Reliability | Explicit timeouts on every inter-service call. Failure returns `503` and saves nothing |
| Observability | Structured JSON logs (timestamp, service, level, request path). `/actuator/health` on every service |
| Performance | Order create and queue list under 500 ms on the seeded dataset on a single VPS. Indexes on `orders(outlet_id, status)` and `menu_item(outlet_id)` |
| Maintainability | Layers `controller`, `service`, `repository`, `dto`, `mapper`, `config`. DTOs separate from entities. Versioned DTOs in packages `v1` and `v2` |
| Code quality | Typecheck, lint, build, and tests must pass. No commented-out code. Comments only for non-obvious WHY |
| Config | `.env.example` lists every variable: `JWT_SECRET`, DB credentials per service, service URLs, seed passwords |

## 14. Testing Requirements

- Unit: total calculation, every allowed transition and a sample of forbidden ones, change calculation, validators.
- Integration (Testcontainers, per service): repository queries, soft delete visibility, Flyway migrations apply cleanly.
- API tests (MockMvc or WebTestClient): role and outlet scope (`401`, `403`), v1 and v2 contract shape for create, get, pay.
- Contract test between `order-service` and `catalog-service` validate endpoint: success, `422`, `409`, timeout.
- One end-to-end smoke test in CD: login, create order, accept, pay, ready, complete, all through the gateway.
- Frontend: component tests for the cart, payment dialog change calculation, and route guards.

## 15. CI/CD

1. **Trigger:** push and pull request to `main`.
2. **CI job:** per service `mvn verify` (tests with Testcontainers). Frontend: `npm ci`, typecheck, lint, test, `vite build`.
3. **Artifact job (push to `main` only):** build Docker images for the four components, tag with commit SHA and `latest`, push to GHCR with `GITHUB_TOKEN`.
4. **CD job (push to `main` only, after the artifact job):** SSH to the test host, `docker compose pull` and `up -d`, then poll `/actuator/health` of each service and run the smoke test. The job fails if any check fails.
5. GitHub secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `JWT_SECRET`, DB passwords. Deployment happens only through this pipeline.

## 16. Acceptance Criteria

| ID | Criterion | Covers |
| :--- | :--- | :--- |
| AC-01 | A guest completes the order flow without login and sees an order number. | FR-01 to FR-04, FR-13 |
| AC-02 | The `PENDING` order appears on the Cashier dashboard within 5 seconds with correct outlet, table, name, items, quantities, and server-computed total. | FR-06 |
| AC-03 | Submitting with one unavailable item returns `409 ITEM_UNAVAILABLE` and creates no order. | FR-04 |
| AC-04 | Cashier can `PUT` a `PENDING` order and the total is recomputed. The same `PUT` on an `ACCEPTED` order returns `409`. | FR-05 |
| AC-05 | Cashier `PATCH` to `ACCEPTED`, then `POST pay` with `CASH` and enough tendered returns `PREPARING` and the correct change. Paying twice returns `409`. | FR-06, FR-07 |
| AC-06 | Kitchen sees the `PREPARING` order within 5 seconds and can move it to `READY` then `COMPLETED`. Kitchen cannot accept, cancel, or pay (`403`). | FR-06 |
| AC-07 | Cashier cannot call Master endpoints (`403`). Unauthenticated calls to protected endpoints return `401`. | FR-12 |
| AC-08 | Master can create, replace, and soft-delete a menu item. The deleted item disappears from the public list, and an old order containing it still shows its snapshot name and price. | FR-08 |
| AC-09 | Cashier and Kitchen can toggle availability for an item in their own outlet. The customer page reflects it on next load. | FR-09 |
| AC-10 | `/api/v1/orders` and `/api/v2/orders` both work at the same time with the shapes in section 11.5, covered by automated tests. | FR-10 |
| AC-11 | Pushing to `main` runs CI, builds and pushes images, deploys to the test host, and health checks pass. | FR-11 |
| AC-12 | `docker compose up` on a clean machine starts all components with seeded data and working demo logins. | All |

## 17. Demo Script (for the lecturer)

| Step | Action | Shows |
| :--- | :--- | :--- |
| 1 | Open `/order?outlet=OUT-01&table=T-05` on a phone, enter a name, submit with toggle on `v1`. Show the flat JSON in the browser network tab | Guest flow, `POST`, v1 contract |
| 2 | Submit a second order with toggle on `v2`. Show the nested JSON | v2 contract, breaking change |
| 3 | Log in as `cashier`. Both orders appear within 5 seconds. Fix one order (`PUT`), then accept (`PATCH`) | `GET`, `PUT`, `PATCH` |
| 4 | Pay one order with `CASH` and show the change | `POST`, state machine |
| 5 | Try to edit the paid order. Show the `409` | Business rules |
| 6 | Log in as `kitchen`. Move the order to `READY`, then `COMPLETED`. Try to cancel and show the `403` | Role authorization |
| 7 | Log in as `master`. Mark an item unavailable (`PATCH`), delete another (`DELETE`). Show the customer page and an old order still showing the snapshot | Soft delete, availability |
| 8 | Show the GitHub Actions run, GHCR images, and the deployed environment's health checks | CI/CD, microservices |

## 18. Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Spring Boot 4 differences confuse AI agents trained on Boot 3 examples | Wrong or non-compiling code | Section 2 rule 4, pinned versions, a green `mvn verify` gate after each service |
| Catalog service down during order creation | Orders fail | Explicit timeout, `503`, nothing saved, health checks in CD |
| Two cashiers act on one order | Corrupt status | Optimistic locking, `409 CONCURRENT_MODIFICATION` |
| Test host not ready on time | CD cannot be shown | Build the pipeline against a local Docker host first, the SSH target is only a secret change (D3) |
| Scope creep (tracking, notes, WebSocket) | Missed deadline | Non-goals in section 4.2, change control in section 20 |
| Different agents generate conflicting patterns | Inconsistent code | One service built first as the reference, API-Specification.md as the contract |

## 19. Decision Log

Every item that was open or ambiguous in the brief is decided here.

| ID | Decision | Reason | Change only if |
| :--- | :--- | :--- | :--- |
| D1 | Single seeded outlet, model supports many | Meets the multi-outlet requirement without building outlet switching | Lecturer requires 2 or more outlets in the demo |
| D2 | GitHub Actions only. No Jenkinsfile | No server to host and maintain, native GHCR login, one workflow file, easier for AI agents | Lecturer's rubric explicitly requires Jenkins. Then add a `Jenkinsfile` that runs the same Maven and npm steps, as an extra file |
| D3 | Test environment is a Docker-capable VPS reached by SSH | Simplest deployment that proves the CD requirement | Team only has access to a PaaS. Then replace only the CD job |
| D4 | `v2` applies to the Order resource only | One clear breaking change is enough to demonstrate versioning and keeps the work small | Lecturer asks for versioning on every service |
| D5 | Unavailable items are shown as "Sold out", not hidden | Cashier and Kitchen need to see them to switch them back | Never expected to change |
| D6 | Tables have no `PUT` | Only one editable field (code), a replace would be meaningless | A table gets more fields |
| D7 | Outlet ID is a string key (`OUT-01`) | QR URL and payloads stay readable | Never expected to change |
| D8 | Login lives in `catalog-service`, JWT validated at the gateway | `StaffUser` belongs to catalog data, avoids a fourth service | Team wants a dedicated auth service |
| D9 | Testcontainers, no H2 | Tests behave like production PostgreSQL | CI runner cannot run Docker (unlikely on GitHub-hosted runners) |
| D10 | `PUT` on an order may also change table code and customer name | Cashier must fix customer mistakes in one request | Never expected to change |
| D11 | Spring Boot 4.0.x with Spring Cloud 2025.1.x | Supported, patched release line, matched pairing from the Spring Cloud release notes | A generated project fails to build with this pairing. Fall back to Boot 3.5.x with Spring Cloud 2025.0.x and record it here |
| D12 | Accept and pay do not re-check availability | Keeps the flow simple, the Cashier already reconfirms with the customer and can `PUT` | Lecturer wants stock re-validation at payment |
| D13 | No pagination on order queues | Prototype volume is small | Queue exceeds a few hundred rows |
| D14 | Master has no access to orders | Keeps the permission model to three clear roles | Manager reporting is added later |

### Additional contract and implementation decisions (resolved before team sign-off)

| ID | Decision | Reason / implementation rule | Change only if |
| :--- | :--- | :--- | :--- |
| D15 | API contract proposals in the companion API documents are accepted as written: login returns `accessToken`, `tokenType`, `expiresIn`, and `user`; errors always include `errors` (empty when none); pay returns `200` with the version-specific order; a second payment returns `409 ORDER_ALREADY_PAID`; order-list `outletId` is optional and defaults to the caller outlet; a mismatched outlet or role-ineligible status filter returns `403`; only one `status` filter is accepted. | One deterministic contract across services and clients. | A rubric or tested client requires a different contract. |
| D16 | `PATCH /orders/{id}/status` authorization and validation order is: authenticate; reject roles other than Cashier/Kitchen; validate the request body; load the order; enforce outlet scope; reject targets that are never PATCH-able; check whether the role owns the target; validate the current-to-target transition; then update with optimistic locking. An order `PUT` cannot change its outlet (`400 OUTLET_IMMUTABLE`). A staff JWT does not make the public `POST /orders` route private; staff UIs simply omit order creation. | Avoids inconsistent `403`/`409` outcomes and keeps the guest endpoint public. | Security testing identifies a concrete need to reject staff-token submissions. |
| D17 | Outlet IDs are client-supplied and must match `^OUT-[0-9]{2,}$`; outlet name/address lengths are 1–100/1–255. Duplicate outlet IDs return `409 DUPLICATE_OUTLET_ID`, duplicate active table codes return `409 DUPLICATE_TABLE_CODE`. Menu-item `PUT` fully replaces editable fields including `available`; create defaults `available` to `true`. Soft-delete returns `204`; repeating a delete returns `404`. Catalog list order is outlets by ID, tables by code, and menu items by category then name. | Makes validation, uniqueness, and list behavior reproducible. | Product requirements change. |
| D18 | Internal order validation precedence is outlet, table, item existence (`422`), then availability (`409`). Stale-client lost updates are accepted as an MVP limitation; simultaneous writes are protected by optimistic locking and return `409 CONCURRENT_MODIFICATION`. | Predictable validation and proportionate concurrency control without ETags. | The prototype gains high concurrency or clients need conditional updates. |
| D19 | API v1 remains supported through course evaluation without deprecation/sunset headers. Unknown JSON fields use the configured Jackson default (ignore unknown properties); required v2 nested fields still validate. Shared status/pay request DTOs live in `dto.common`; response DTOs remain version-specific. Verify the actual Boot 4 behavior in an integration test. | Keeps versioning simple and prevents duplicated request contracts. | A compatibility test or course requirement demands strict unknown-field rejection or version-specific requests. |
| D20 | Repository layout follows the existing `Backend/`, `Frontend/`, and `Documents/` folders; the three services and Compose file live under `Backend/`, frontend source under `Frontend/`, and these design files under `Documents/`. CI workflow remains under `.github/workflows/`. | Aligns documentation to the current repository rather than requiring a disruptive move. | The team explicitly migrates the repository layout. |
| D21 | Java package roots are `com.ambatucode.dikichi.gateway`, `.catalog`, and `.order`. Services use `controller`, `service`, `repository`, `dto`, `mapper`, `config`, plus `entity` and `exception`. Downstream authorization uses a header-reading servlet filter to create a request-scoped caller identity and explicit service-layer role/outlet checks; downstream services are not exposed on host ports. | Gives generated code clear package and trust-boundary conventions. | A framework constraint requires a different package or security integration. |
| D22 | Use two PostgreSQL 16 containers (`catalog-db`, `order-db`); publish frontend port 80 and gateway port 8080 only. Compose waits for healthy databases/services using `pg_isready` and Actuator health checks. The gateway generates/forwards `X-Request-Id`, which services include in logs. | Makes database isolation and deployment behavior visible and diagnosable. | Hosting constraints require a different topology. |
| D23 | Use Spring Security JOSE/Nimbus for HS256 JWT issuing and validation. Flyway owns schema; Hibernate uses `ddl-auto=validate`. Seed staff passwords are supplied through required environment/Flyway placeholders and BCrypt-hashed with PostgreSQL `pgcrypto`; no password defaults are committed. | Consistent JWT implementation and repeatable schema migrations without plaintext credentials in source. | Deployment cannot install `pgcrypto`, in which case hash at a controlled seed step before Flyway. |
| D24 | Add database-level checks for staff role/outlet consistency, order-item subtotal, payment cash fields, and unique `(order_id, menu_item_id)` as defense in depth. Keep the existing sample menu and seed `Lumpia Kulit Tahu` as unavailable. The default outlet uses the fictional demo address `Jl. Contoh No. 1, Malang`; all menu names/prices/categories are fixed demo data, with no further replacement required for the prototype. | Prevents invalid rows and makes sold-out behavior demonstrable immediately. | The team replaces demo content with approved real demo data. |

## 20. Change Control

After sign-off, a change to this PRD needs: the change described in one paragraph, the affected sections listed, and approval from all three members in the group chat. The version number increases (1.2, 1.3) and the Decision Log gets a new entry. Agents and developers never deviate from the PRD without that entry.

## 21. Sign-Off

Reply "Approved v1.1" in the group chat, or tick below in the repo copy.

| Member | NIM | Approved |
| :--- | :--- | :---: |
| Putra Cakrawala Aulia Syafiq | 235150200111040 | [ ] |
| Muhammad Rifki Akbar | 235150201111046 | [ ] |
| Muhammad Alden Prabaswara | 235150201111014 | [ ] |

## 22. Traceability to Product Brief v1.0

- The brief's FR numbering is replaced by section 7. The old FR-09 (customer order lookup) no longer exists because customer tracking is out of scope. FR-09 is now availability toggling.
- Added beyond the brief: login ownership, JWT claims, the internal validation contract, the error format, validation limits, order number format, outlet scope rules, the permission matrix, the demo script, risks, and the decision log.
- The v2 `paymentSummary` gained `amountTendered` and `change` to support the cash flow chosen during the brief interview.
- The brief contains stray `[cite: 1]` markers that must be removed before it is reused.
