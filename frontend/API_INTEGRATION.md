# Frontend integration

The `test-project` frontend keeps the tan-leader visual styles and uses the APIs deployed on the WareFlow VPS. SMTP remains deferred. Existing local backend source is older than the deployed API: do not replace the running backend with a build of this branch as part of a frontend deployment.

## Running locally

Create an ignored `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://YOUR_VPS
```

Use `API_PROXY_TARGET=http://127.0.0.1:8080` for a compatible local gateway. Vite forwards `/api` unchanged; the gateway/Nginx strips the service prefix. Browser requests use the same origin and a bearer token from the authenticated session. No API credentials belong in a `VITE_*` variable.

```sh
npm install
npm run dev
npm test
npm run test:ui
npm run build
```

The UI suite needs the dev server plus Chrome (`CHROME_PATH` can override its path). `TEST_ORIGIN` can point it at a locally served production build. It intercepts API requests with deterministic fixtures and never creates production records. The API checks on the VPS are separate read-only checks; Cloudinary upload/delete was checked during the preceding connection audit.

## Connected areas

| Area | API prefix | Actions |
| --- | --- | --- |
| Authentication and profile | `/api/core/auth`, `/users/me`, `/companies/my-company` | Login, role routing, expiry/logout, profile update |
| Companies | `/api/core/companies` | Read, update profile, activate/lock, delete |
| Warehouses | `/api/core/warehouses`, `/warehouse-transactions` | Lists, create, propose purchase/rent, approve/reject a chosen deal, company assigns warehouse manager |
| Suppliers and catalog | `/api/core/suppliers` | Read/create/update/delete suppliers and their products |
| Company employees | `/api/core/employees` | Read/create/update name and status |
| Inventory | `/api/inventory/warehouses/{id}` | Products, lots, movements, purchase orders, receipts, exports/transfers and their approval stages |
| Finance | `/api/finance` | Transactions, budget allocation/update, expense requests and approvals, calculations and reports |
| Delivery | `/api/delivery/warehouses/{id}/shipments` | Create shipment, update status, confirm collected COD |
| Notifications and audit | `/api/core/notifications`, `/system-logs` | Read notifications/logs, mark notifications read |
| Images | `/api/core/upload/image` | Upload profile/catalog images to Cloudinary through the backend |

Company data is scoped by the authenticated company. Warehouse managers only see warehouses assigned in `handover.managerId`; changing the active warehouse also resets open forms. Cached data is separated by user/session and warehouse. A successful mutation invalidates subscribed queries. Failures are surfaced and retryable; no local demo records substitute for failed API calls.

## Calculation rules

- Fetch every page before aggregation. Reject incomplete, duplicated or changing paginated results rather than silently undercounting.
- Periods use the Vietnam calendar (UTC+7), including today, and contain 30, 90 or 365 days. The previous comparison window is the preceding, nonoverlapping window of the same length. Three calendar years of transactions cover both 365-day windows.
- Income = sum of `INCOME`. Expense = sum of `EXPENSE` and `SYSTEM_FEE`; a fee is counted once. Cash difference = income − expense. This is a cash-flow difference, not an accounting gross-profit figure.
- Monetary sums use integer minor units with a safe-range check. Percentages use `(part / total) × 100`. Growth uses `(current − previous) / abs(previous) × 100`. Missing/zero denominators render `—`; two zero comparison totals produce 0% growth.
- Chart buckets fill missing days with zero. Short periods use days; longer periods use calendar months, including partial first/last months. Values on chart axes are millions of VND; stored/API amounts remain VND.
- Budget usage = spent / allocated. Progress bars clamp to 0–100 while the text keeps the real rate and reports overspending. Budget panels show the current month independently of the cash-flow period.
- Available lot quantity = max(quantity − reserved, 0); expired/damaged lots contribute zero. Expiry warnings use Vietnam calendar days. Product low-stock alerts use the sum of available lots.

## Backend limitations reflected in the UI

- There is no system-admin list-all-users endpoint in the deployed API. The account page displays `/users/me`; employee administration uses the company workspace. It does not claim a total user count.
- Companies are created through registration, not an admin create-company endpoint. Posted transactions have no update-note endpoint; read notifications have no mark-unread endpoint; expense requests have no manager cancel endpoint. Unsupported buttons do not report a fake successful operation.
- Supplier catalog products have prices but no warehouse stock. Catalog statistics describe suppliers and prices; inventory statistics use warehouse products/lots.
- Email password-reset delivery remains unavailable until SMTP is configured.

## Validation

`npm test` checks period boundaries across years, decimal sums, fees, safe ranges, zero denominators, chart reconciliation, bearer headers, pagination, malformed responses and session expiry. `npm run test:ui` checks the active admin/company/warehouse routes, calculations, failed/successful writes, profile and product updates, changing warehouses, mobile overflow and role guards. Live reads were checked against the four services through both Nginx and the Vite proxy on 2026-11-18.
