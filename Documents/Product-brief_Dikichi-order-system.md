# Product Brief: Dikichi Order Management Platform

**Document status:** Historical baseline; PRD v1.1 and its Decision Log supersede this brief  
**Version:** 1.0  
**Product type:** Web-based dine-in ordering and outlet order-management prototype  
**Primary technical constraints:** Spring Boot microservices, Spring Cloud Gateway, PostgreSQL, React (Vite + TypeScript + Tailwind CSS), REST APIs, API versioning with breaking changes (`/api/v1` and `/api/v2`), HTTP `GET`/`POST`/`PUT`/`PATCH`/`DELETE`, Automated CI/CD

---

## 1. Product Summary

The Dikichi Order Management Platform is a web application that allows dine-in customers to browse a menu and submit orders from their table, while outlet staff validate, process payment, prepare, and complete those orders through role-specific digital dashboards.

The product reduces reliance on ordering from scratch at the cashier and gives cashiers, kitchen operators, and administrators a structured view of order and catalog state. The initial deliverable is an independent academic prototype and is not connected to Dikichi's production infrastructure.

---

## 2. Problem Statement

At busy food outlets, taking full menu selections at the cashier creates queues and slows down service during peak dine-in hours. Disconnected or manual order-taking workflows also make it difficult for cashiers and kitchen staff to coordinate order modifications, out-of-stock items, and preparation status.

**Problem hypothesis to validate:** Allowing customers to compose their own order at the table (`PENDING`), followed by quick cashier reconfirmation (`ACCEPTED`), mock payment (`PREPARING`), and kitchen queue management (`READY` -> `COMPLETED`), streamlines order intake and improves visibility across outlet staff.

---

## 3. Product Vision

Provide a fast, guest-friendly dine-in ordering interface for customers and role-tailored operational dashboards for Cashiers, Kitchen Staff, and Master Administrators, backed by a versioned REST API and a Spring Boot microservices architecture.

---

## 4. Goals and Success Indicators

### Product Goals
1. Let guest customers identify their outlet, table, and name, browse available menu items, and submit an order without logging in.
2. Let Cashiers review `PENDING` orders with the customer, edit order items if mistakes or stock issues occur (`PUT`), confirm the order (`ACCEPTED`), and process a mock payment to send the order to the kitchen (`PREPARING`).
3. Let Kitchen Staff view paid orders in the `PREPARING` queue and advance them to `READY` (for outlet announcement) and `COMPLETED`.
4. Let Master Administrators manage outlets, tables, and menu items, while allowing Cashiers and Kitchen Staff to toggle real-time item availability.
5. Demonstrate resource-oriented REST API design across all five HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
6. Demonstrate two concurrent API versions (`/api/v1` and `/api/v2`) featuring an intentional, documented breaking change on the Order contract.
7. Demonstrate Spring Boot microservices with isolated databases and an automated CI/CD pipeline.

### Prototype Acceptance Indicators
- A guest customer can complete the ordering flow and receive an order confirmation code/summary screen to show the cashier.
- A submitted `PENDING` order appears on the Cashier Dashboard with the correct outlet, table code, customer name, items, quantities, and server-calculated total.
- A Cashier can modify items on a `PENDING` order (`PUT`), advance it to `ACCEPTED` (`PATCH`), and execute a mock payment (`POST`) that transitions the order to `PREPARING`.
- A Kitchen Operator sees `PREPARING` orders on the Kitchen Dashboard and can transition them to `READY` and `COMPLETED` (`PATCH`).
- API endpoints demonstrate `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` with proper HTTP status codes, server-side validation, and role-based authorization.
- Both `/api/v1/orders` and `/api/v2/orders` are runnable, tested, and documented with migration instructions.
- Automated CI checks run on push/PR, and CD deploys passing builds to the designated test environment.

---

## 5. Target Users & Dashboards

The frontend is a single React SPA (Vite + TypeScript + Tailwind CSS) exposing four distinct interfaces:

| Dashboard / Route | Target User | Authentication & Role | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| **1. Customer Dashboard** (`/order`) | Dine-in Customer | **Guest (Public / No Auth)** | Select/scan outlet & table code, input customer name, browse available menu, submit order, and view static confirmation receipt (no live order tracking). Includes a demo toggle to submit via `/api/v1` or `/api/v2`. |
| **2. Cashier Dashboard** (`/cashier`) | Outlet Cashier | **JWT Auth (`ROLE_CASHIER`)** | View `PENDING` and `ACCEPTED` orders; edit `PENDING` orders (`PUT`) to fix customer misinputs or stock issues; transition order to `ACCEPTED` (`PATCH`) or `CANCELLED` (`PATCH`); process mock payment (`POST`) to move order to `PREPARING`; toggle menu item availability (`PATCH`). |
| **3. Kitchen Dashboard** (`/kitchen`) | Kitchen Master / Operator | **JWT Auth (`ROLE_KITCHEN`)** | View `PREPARING` and `READY` orders; transition orders from `PREPARING` to `READY` (for meal pickup announcement) and `READY` to `COMPLETED` (`PATCH`); toggle menu item availability (`PATCH`). |
| **4. Master Dashboard** (`/master`) | Outlet Manager / Admin | **JWT Auth (`ROLE_MASTER`)** | Full CRUD management over Outlets, Tables, and Menu Items (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). |

---

## 6. Core User Journeys & Order State Machine

### Order Lifecycle State Machine
Valid statuses: `PENDING`, `ACCEPTED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`.

- `PENDING` -> `ACCEPTED` (Cashier confirms order with customer)
- `PENDING` -> `CANCELLED` (Cashier cancels abandoned/invalid order)
- `ACCEPTED` -> `PREPARING` (Triggered automatically when Cashier completes Mock Payment)
- `ACCEPTED` -> `CANCELLED` (Cashier cancels before payment)
- `PREPARING` -> `READY` (Kitchen Master marks meal ready for announcer/pickup)
- `READY` -> `COMPLETED` (Kitchen Master marks order handed over to customer/server)

*Note: Orders in `PENDING` can have their item list replaced (`PUT`) by a Cashier prior to becoming `ACCEPTED`. Once `ACCEPTED`, order items are locked.*

### End-to-End Operational Flow
1. **Table & Guest Entry:** Customer scans a table QR URL (e.g., `/order?outlet=OUT-01&table=T-01`) or manually selects the outlet, enters the table code (`T-01`), and enters their name.
2. **Order Submission:** Customer selects available menu items and quantities and submits the cart. The system validates the outlet, table, and item availability, calculates the total in integer IDR (`sum(price * quantity)`), creates the order in `PENDING` status, and displays a static Order Confirmation Screen with the human-readable order number (e.g., `ORD-0042`).
3. **Cashier Reconfirmation:** Customer approaches the cashier with their order number/name. The Cashier pulls up the `PENDING` order on the Cashier Dashboard. If the customer made a mistake or an item just ran out of stock, the Cashier edits the order items (`PUT /orders/{id}`). Once verified, the Cashier marks the order `ACCEPTED` (`PATCH /orders/{id}/status`).
4. **Mock Payment:** The Cashier selects a mock payment method (`CASH`, `QRIS`, or `CARD`), records the mock payment (`POST /orders/{id}/pay`), and the backend transitions the order status from `ACCEPTED` to `PREPARING`.
5. **Kitchen Preparation & Announcement:** The order appears on the Kitchen Dashboard (polled every 5 seconds with a manual "Refresh Now" button). When cooking finishes, the Kitchen Master updates the status to `READY` (`PATCH`). The outlet announcer calls the customer's name/order number, and once picked up or served, the Kitchen Master updates the status to `COMPLETED` (`PATCH`).

---

## 7. Confirmed MVP Scope

### In Scope
- Multi-outlet data model and API support, pre-seeded with **1 default outlet**, **20 tables (`T-01` to `T-20`)**, sample menu items, and pre-seeded staff accounts (`master`, `cashier`, `kitchen`) for immediate evaluation.
- Four frontend views (Customer, Cashier, Kitchen, Master) in a responsive React SPA.
- Mock payment processing (`CASH`, `QRIS`, `CARD`) on the Cashier Dashboard.
- 5-second periodic polling + manual refresh button on Cashier and Kitchen queues.
- Spring Boot microservices architecture with an API Gateway and dedicated PostgreSQL databases per service.
- Concurrent `/api/v1` and `/api/v2` order endpoints with a documented breaking change.
- Full coverage of `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` (soft-delete via `isDeleted = true` on catalog resources).
- Automated tests, Docker Compose orchestration, and CI/CD pipeline.

### Out of Scope
- Live customer-facing order status tracking after submission.
- Real third-party payment gateway integration.
- Tax, service charge, discount, voucher, or loyalty calculation.
- WebSockets / Server-Sent Events (SSE) push notifications.
- Self-service customer order editing or cancellation.

---

## 8. Functional Requirements

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| **FR-01** | The system shall display available (non-deleted) menu items scoped by outlet. | Must |
| **FR-02** | The system shall associate each order with a validated `outletId`, `tableCode`, and `customerName`. | Must |
| **FR-03** | The system shall allow a guest customer to submit an order with one or more available items and quantities (`POST`). | Must |
| **FR-04** | The server shall validate item availability against the Catalog Service, snapshot item names and prices at order creation/update, and compute the order total in integer IDR. | Must |
| **FR-05** | The system shall allow an authenticated Cashier (`ROLE_CASHIER`) to replace the item list of a `PENDING` order (`PUT`) and re-compute the order total. | Must |
| **FR-06** | The system shall allow Cashiers and Kitchen Staff to filter and view orders by status (`GET`) and advance orders through role-permitted status transitions (`PATCH`). | Must |
| **FR-07** | The system shall allow an authenticated Cashier to record a mock payment (`POST`) for an `ACCEPTED` order, automatically transitioning its status to `PREPARING`. | Must |
| **FR-08** | The system shall allow `ROLE_MASTER` to create (`POST`), read (`GET`), fully update (`PUT`), and soft-delete (`DELETE`) outlets, tables, and menu items. | Must |
| **FR-09** | The system shall allow `ROLE_MASTER`, `ROLE_CASHIER`, and `ROLE_KITCHEN` to toggle menu item availability (`PATCH`). | Must |
| **FR-10** | The system shall expose `/api/v1` and `/api/v2` endpoints demonstrating an intentional breaking schema change on Order resources. | Must |
| **FR-11** | Automated unit/integration checks shall run in CI, and passing builds shall deploy to a designated test environment. | Must |

---

## 9. High-Level Architecture & Service Boundaries

The system is structured as a **monorepo** containing a React SPA and three Spring Boot applications orchestrated via Docker Compose:

1. **API Gateway (`gateway-service`):**
   - Spring Cloud Gateway acting as the single entry point for the frontend.
   - Handles JWT authentication/validation and forwards user role/claims headers to downstream services.
2. **Catalog & Outlet Service (`catalog-service` + `catalog_db` PostgreSQL):**
   - Owns `Outlet`, `Table`, `MenuItem`, and seeded `StaffUser` credentials.
   - Enforces soft deletion (`isDeleted = true`) on `MenuItem` and `Table` entities so historical orders remain auditable.
   - Exposes public read endpoints for outlets/menus, protected CRUD endpoints for staff, and an internal validation lookup endpoint for `order-service`.
3. **Order Service (`order-service` + `order_db` PostgreSQL):**
   - Owns `Order`, `OrderItem` (containing `menuItemId`, `menuItemNameSnapshot`, `unitPriceSnapshot`, `quantity`, `subtotal`), and `MockPayment` (`paymentMethod`, `amountPaid`, `paidAt`).
   - Synchronously calls `catalog-service` via Spring `RestClient` during order creation (`POST`) and cashier order editing (`PUT`) to verify table validity and item availability/prices. If any item is unavailable, the request is rejected with `409 Conflict`.
4. **Frontend (`frontend`):**
   - React + Vite + TypeScript + Tailwind CSS client.

---

## 10. REST API Semantics & Versioning Specification

### Required HTTP Methods Mapping
- **`GET`:** List/retrieve outlets, tables, menu items, and status-filtered order queues.
- **`POST`:** Submit a new order, execute a mock payment on an `ACCEPTED` order, create a menu item/outlet/table, and authenticate via `/auth/login`.
- **`PUT`:** Full replacement of a menu item (`ROLE_MASTER`) **and** full replacement of items/customer details on a `PENDING` order (`ROLE_CASHIER`).
- **`PATCH`:** Transition an order's `status` (`ROLE_CASHIER` / `ROLE_KITCHEN`) **and** toggle a menu item's `available` boolean (`ROLE_MASTER` / `ROLE_CASHIER` / `ROLE_KITCHEN`).
- **`DELETE`:** Soft-delete (`isDeleted = true`) a menu item or table (`ROLE_MASTER`).

### Intentional Breaking Change (`v1` vs. `v2`)
Both versions reuse the same domain service layer while mapping to distinct DTO contracts:

- **`/api/v1/orders` (Legacy Contract):**
  - **Request & Response:** Uses flat location/customer attributes (`outletId`, `tableCode`, `customerName`) and a single integer `totalAmount`.
- **`/api/v2/orders` (Current Contract, Breaking Change):**
  - **Request & Response:** Replaces flat fields with structured nested objects:
    - `customer: { name: string }`
    - `location: { outletId: string, tableCode: string }`
    - `paymentSummary: { totalAmount: number, paymentStatus: "UNPAID" | "PAID", paymentMethod: "CASH" | "QRIS" | "CARD" | null }`
  - **Why it is breaking:** A `v1` client reading `order.tableCode`, `order.customerName`, or `order.totalAmount` at the root of the JSON payload will fail unless updated to read nested objects.

---

## 11. CI/CD Pipeline & Deployment

1. **Trigger:** Push or Pull Request to `main` in the monorepo.
2. **CI Stage:** Builds `gateway-service`, `catalog-service`, `order-service` (Maven + JUnit 5/Testcontainers or H2 integration tests) and `frontend` (TypeScript typecheck + Vite build).
3. **Artifact Stage:** Builds versioned Docker images for each service and pushes them to the container registry.
4. **CD Stage:** Deploys the updated containers via Docker Compose to the target development/test environment and verifies `/actuator/health` endpoints.