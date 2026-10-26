# API Specification: Dikichi Order Management Platform

| Field | Value |
| :--- | :--- |
| Version | 1.1 (resolved, aligned to PRD v1.1) |
| Status | Resolved contract; implementation must follow the PRD Decision Log |
| Machine-readable contract | [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1) |
| Source of truth | [`PRD-Dikichi-Order-Platform-v1.md`](./PRD-Dikichi-Order-Platform-v1.md). If this document conflicts with the PRD, the PRD wins |
| Related | [`API-Migration-v1-to-v2.md`](./API-Migration-v1-to-v2.md), [`Software-Architecture-Document.md`](./Software-Architecture-Document.md) |

This document explains the contract in `openapi.yaml`: conventions, access rules, error codes, and the decisions the PRD leaves open. It does not repeat every schema. Read the YAML for exact field definitions.

> **Decision rule.** Contract decisions are recorded in the PRD Decision Log (§19, D15–D19). The PRD is the source of truth; the OpenAPI file is the machine-readable contract.

---

## 1. Conventions

| Topic | Rule | Source |
| :--- | :--- | :--- |
| Base path | `/api/{version}` through the gateway (`:8080`) or the frontend Nginx (same origin) | PRD §11 |
| Versions | Only Orders have `v1` and `v2`. Catalog and auth exist only under `v1` | PRD §11.3, D4 |
| Format | JSON only, `Content-Type: application/json` | PRD §11 |
| Time | ISO-8601 UTC (`2026-10-21T10:00:00Z`) | PRD §11 |
| Money | Integer IDR. No decimals. Prices 1 to 10,000,000 | PRD §9.3, §10 |
| IDs | Outlet: string key (`OUT-01`). Everything else: UUID | PRD §9, D7 |
| Order number | `ORD-` + zero-padded sequence, at least 4 digits (`ORD-0042`, `ORD-12345`) | PRD §9.3 |
| Soft delete | `DELETE` sets `is_deleted = true`. Deleted rows return `404` and never appear in lists | PRD §9.3 |
| Create | `201 Created` with a `Location` header | PRD §11.4 |
| Delete | `204 No Content`. Deleting an already-deleted resource returns `404` (D17) | - |
| Paths | The gateway does not rewrite paths. Services expose the full `/api/v1/...` path, so springdoc output matches this spec (D19) | - |

## 2. Authentication

1. `POST /api/v1/auth/login` with `{ "username", "password" }`. It is served by `catalog-service` (D8).
2. The response contains a JWT: HS256, secret from `JWT_SECRET` (at least 32 bytes), 8-hour expiry, no refresh token.
3. Claims: `sub` = username, `role` ∈ `MASTER | CASHIER | KITCHEN`, `outletId` (null for MASTER).
4. The client sends `Authorization: Bearer <token>`. The frontend stores the token in `sessionStorage`.
5. The gateway validates the token. It strips any client-supplied `X-User-*` / `X-Outlet-Id` headers and then forwards:

| Header | Value |
| :--- | :--- |
| `X-User-Name` | `sub` |
| `X-User-Role` | `role` |
| `X-Outlet-Id` | `outletId` (header absent for MASTER) |

6. A failed login returns a generic `401` that does not say which credential was wrong.

**Login response** (D15):

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 28800,
  "user": { "username": "cashier", "role": "CASHIER", "outletId": "OUT-01" }
}
```

Returning `user` means the frontend route guards don't have to decode the JWT.

## 3. Gateway Routing and Public Routes

| Path pattern | Routed to |
| :--- | :--- |
| `/api/v1/auth/**` | `catalog-service:8081` |
| `/api/v1/outlets/**` | `catalog-service:8081` |
| `/api/v1/menu-items/**` | `catalog-service:8081` |
| `/api/v1/orders/**`, `/api/v2/orders/**` | `order-service:8082` |
| `/internal/**` | **Never routed** (returns `404` at the gateway) |
| anything else | `404` |

Public routes (no JWT required). Everything else returns `401` without a valid token:

| Method | Path |
| :--- | :--- |
| `POST` | `/api/v1/auth/login` |
| `GET` | `/api/v1/outlets/**` |
| `GET` | `/api/v1/menu-items/**` |
| `POST` | `/api/v1/orders` and `/api/v2/orders` (**exact path only**) |

> [!WARNING]
> Match the public order route on the exact path `/api/{v}/orders`. A prefix matcher such as `/api/*/orders/**` would make `POST /orders/{id}/pay` public too.

## 4. Endpoint Overview

### 4.1 Catalog (`/api/v1` only)

| Method | Path | Access | Success |
| :--- | :--- | :--- | :--- |
| POST | `/auth/login` | Public | 200 |
| GET | `/outlets` | Public | 200 |
| GET | `/outlets/{outletId}` | Public | 200 |
| POST | `/outlets` | Master | 201 |
| PUT | `/outlets/{outletId}` | Master | 200 |
| DELETE | `/outlets/{outletId}` | Master | 204 |
| GET | `/outlets/{outletId}/tables` | Public | 200 |
| POST | `/outlets/{outletId}/tables` | Master | 201 |
| DELETE | `/outlets/{outletId}/tables/{code}` | Master | 204 |
| GET | `/outlets/{outletId}/menu-items` | Public | 200 |
| GET | `/menu-items/{id}` | Public | 200 |
| POST | `/outlets/{outletId}/menu-items` | Master | 201 |
| PUT | `/menu-items/{id}` | Master | 200 |
| PATCH | `/menu-items/{id}/availability` | Master; Cashier and Kitchen own outlet | 200 |
| DELETE | `/menu-items/{id}` | Master | 204 |

Tables have no `PUT` (D6). The public menu list includes unavailable items (`available: false`), and the UI shows them as "Sold out" (D5).

### 4.2 Orders (same paths under `/api/v1` and `/api/v2`)

| Method | Path | Access | Success | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/orders` | Public | 201 | Creates `PENDING` |
| GET | `/orders?outletId=&status=` | Cashier, Kitchen | 200 | Oldest first, no pagination (D13) |
| GET | `/orders/{id}` | Cashier, Kitchen (own outlet) | 200 | |
| PUT | `/orders/{id}` | Cashier | 200 | `PENDING` only. Can change table, name, items (D10) |
| PATCH | `/orders/{id}/status` | Cashier, Kitchen | 200 | See §5 |
| POST | `/orders/{id}/pay` | Cashier | 200 | `ACCEPTED` only, moves to `PREPARING` |

Customers can't `GET` orders. The `201` response is their only receipt. Master has no access to orders (D14) and gets `403`.

### 4.3 Internal (not routed)

`POST /internal/orders/validate` on `catalog-service:8081`, called by `order-service` on order create and order `PUT`. Spring `RestClient`, connect timeout 2 s, read timeout 3 s, no retry. If the call is unreachable or times out, the client gets `503 CATALOG_UNAVAILABLE` and nothing is saved.

## 5. Order Status Rules

Allowed transitions (exhaustive, PRD §6.1):

| From | To | Actor | Endpoint |
| :--- | :--- | :--- | :--- |
| - | `PENDING` | Guest | `POST /orders` |
| `PENDING` | `ACCEPTED` | Cashier | `PATCH /status` |
| `PENDING` | `CANCELLED` | Cashier | `PATCH /status` |
| `ACCEPTED` | `CANCELLED` | Cashier | `PATCH /status` |
| `ACCEPTED` | `PREPARING` | System | `POST /pay` |
| `PREPARING` | `READY` | Kitchen | `PATCH /status` |
| `READY` | `COMPLETED` | Kitchen | `PATCH /status` |

**Evaluation order for `PATCH /orders/{id}/status` (decision D16).** Without a fixed order, the same request could return `403` from one implementation and `409` from another.

1. Caller role is not Cashier or Kitchen → `403 FORBIDDEN`
2. Body invalid (missing or unknown status) → `400 VALIDATION_ERROR`
3. Order not found → `404 NOT_FOUND`
4. Order belongs to another outlet → `403 FORBIDDEN`
5. Target is `PENDING` or `PREPARING` (never PATCH-able) → `409 INVALID_STATUS_TRANSITION`
6. Role does not own the target (Cashier owns `ACCEPTED`/`CANCELLED`, Kitchen owns `READY`/`COMPLETED`) → `403 FORBIDDEN`
7. Current status does not allow that target → `409 INVALID_STATUS_TRANSITION`
8. Optimistic lock lost → `409 CONCURRENT_MODIFICATION`

This order gives the results the demo expects. Kitchen cancelling an order gets `403` (Demo step 6), and Cashier accepting an already-accepted order gets `409`.

**Pay rules:**
- `amountTendered` is required for `CASH` and must be ≥ `totalAmount`, otherwise `400`. It must be null or omitted for `QRIS`/`CARD`, otherwise `400`.
- `change = amountTendered − totalAmount` (CASH only). `amountPaid = totalAmount`.
- Paying an order that already has a payment returns `409 ORDER_ALREADY_PAID`. Paying any other non-`ACCEPTED` order returns `409 INVALID_STATUS_TRANSITION`.
- Accept and pay do not re-check item availability (D12).

## 6. Error Format and Catalog

Every error from every service and version uses one shape:

```json
{
  "timestamp": "2026-10-21T10:00:00Z",
  "status": 409,
  "code": "ITEM_UNAVAILABLE",
  "message": "One or more items are unavailable",
  "path": "/api/v2/orders",
  "errors": [ { "field": "items[0].menuItemId", "message": "Item is unavailable" } ]
}
```

`errors` is always present and is `[]` when there are no field-level details. Responses never include stack traces or internal details.

| Code | Status | Decision source | When |
| :--- | :---: | :--- | :--- |
| `MALFORMED_REQUEST` | 400 | Final | Body is not valid JSON or has the wrong types |
| `VALIDATION_ERROR` | 400 | Final | Field rule violated (§7). Details in `errors[]` |
| `DUPLICATE_MENU_ITEM` | 400 | Final | Same `menuItemId` on two lines |
| `OUTLET_IMMUTABLE` | 400 | Final | Order `PUT` tries to change the outlet |
| `UNAUTHORIZED` | 401 | Final | Missing or invalid token, failed login |
| `FORBIDDEN` | 403 | Final | Role or outlet scope violation |
| `NOT_FOUND` | 404 | Final | Path resource missing or soft-deleted |
| `ITEM_UNAVAILABLE` | 409 | PRD | Any item unavailable. Lists **all** unavailable items in `errors[]` |
| `INVALID_STATUS_TRANSITION` | 409 | PRD | Transition not in §5 |
| `ORDER_NOT_EDITABLE` | 409 | PRD | `PUT` on a non-`PENDING` order |
| `CONCURRENT_MODIFICATION` | 409 | PRD | Optimistic lock lost |
| `ORDER_ALREADY_PAID` | 409 | Final | Second payment on the same order |
| `DUPLICATE_OUTLET_ID` | 409 | Final | Outlet id already exists (including soft-deleted rows, since it is the PK) |
| `DUPLICATE_TABLE_CODE` | 409 | Final | A non-deleted table with that code already exists in the outlet |
| `INVALID_OUTLET` | 422 | PRD | Body references a missing or deleted outlet |
| `INVALID_TABLE` | 422 | PRD | Body references a missing or deleted table |
| `INVALID_MENU_ITEM` | 422 | PRD | Item missing, deleted, or from another outlet |
| `CATALOG_UNAVAILABLE` | 503 | PRD | catalog-service down or timed out |

## 7. Validation Rules (server-side, PRD §10)

| Field | Rule |
| :--- | :--- |
| `customerName` / `customer.name` | Required, trimmed, 1–50 chars |
| `tableCode` / `location.tableCode` | Required, `^T-\d{2,3}$`, must exist in the outlet |
| `outletId` / `location.outletId` | Required, must exist and not be deleted |
| `items` | 1–30 lines, no duplicate `menuItemId` |
| `quantity` | Integer 1–99 |
| Menu `price` | Integer 1–10,000,000 |
| Menu `name` / `category` / `description` | 1–100 / 1–50 / ≤ 500 chars |
| `amountTendered` | Required and ≥ total for `CASH`; null for `QRIS`/`CARD` |
| Outlet `name` / `address` | 1–100 / 1–255 chars (D17) |
| Outlet `id` | Client-supplied, `^OUT-\d{2,}$` (D17) |

Field validation (`400`) runs before the catalog call, so invalid bodies never reach `catalog-service`.

## 8. Example Calls

```http
POST /api/v2/orders
Content-Type: application/json

{ "customer": { "name": "Budi" },
  "location": { "outletId": "OUT-01", "tableCode": "T-05" },
  "items": [ { "menuItemId": "11111111-0000-4000-8000-000000000001", "quantity": 2 } ] }
```
```http
HTTP/1.1 201 Created
Location: /api/v2/orders/7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10
```

```http
POST /api/v2/orders/7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10/pay
Authorization: Bearer <cashier token>

{ "paymentMethod": "CASH", "amountTendered": 60000 }
```
→ `200` with `status: "PREPARING"` and `paymentSummary.change: 10000`.

For the v1 and v2 shapes side by side, see [`API-Migration-v1-to-v2.md`](./API-Migration-v1-to-v2.md).

## 9. Resolved Contract Decisions

The former OQ-API-01 through OQ-API-15 are resolved and recorded in PRD §19, decisions D15–D19. No API decision remains open in this document.

| Area | Final rule | PRD decision |
| :--- | :--- | :--- |
| Login response and error envelope | `accessToken`, `tokenType`, `expiresIn`, `user`; `errors` always exists | D15 |
| Payment response and duplicate payment | `200` with order; duplicate payment is `409 ORDER_ALREADY_PAID` | D15 |
| Order list filters | `outletId` optional/defaults to caller outlet; mismatch or role-ineligible status filter is `403`; one status only | D15 |
| Status validation and order outlet | Role → existence → outlet scope → transition; order `PUT` cannot change outlet | D16 |
| Public order creation | Remains public even if request carries a staff JWT | D16 |
| Outlet/table IDs and duplicates | Client-supplied outlet ID pattern; duplicate outlet/table codes have stable `409` codes | D17 |
| Menu item replacement and delete | `available` included in `PUT`, defaults true on create; soft delete `204`, repeated delete `404` | D17 |
| Validation precedence and concurrency | Outlet → table → item existence → availability; simultaneous writes use optimistic locking | D18 |
| Version compatibility | v1 supported through course evaluation; unknown JSON fields ignored per configured Jackson default; common status/pay request DTOs | D19 |
| Catalog ordering | Outlets by ID, tables by code, menu items by category then name | D17 |
