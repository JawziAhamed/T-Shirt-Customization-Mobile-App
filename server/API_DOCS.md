# API Documentation

Base URL: `http://localhost:8080/api`

Auth header for protected routes:
`Authorization: Bearer <token>`

## Health
- `GET /health`

## Auth
- `POST /auth/register`
- `POST /auth/login`
  - for customer/staff: after multiple failed attempts, returns `423` with suspension details
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me` (protected)
- `PUT /auth/me` (protected, supports multipart with `avatar`)
- `POST /auth/change-password` (protected)
- `GET /auth/activity` (protected)
- `POST /auth/logout` (protected)

## Users (Admin)
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id/role`
- `PATCH /users/:id/profile`
- `DELETE /users/:id`

## Products
- `GET /products` (public)
  - query: `page`, `limit`, `search`, `category`, `color`, `active`
  - `category` accepts a category `_id`, slug, or comma-separated values
- `GET /products/:id` (public)
- `POST /products` (admin/staff, multipart)
  - supports `categories` as JSON array/comma string (category IDs or names/slugs)
- `PUT /products/:id` (admin/staff, multipart)
  - supports `categories` as JSON array/comma string (category IDs or names/slugs)
- `DELETE /products/:id` (admin/staff)

## Categories
- `GET /categories` (public)
  - query: `active`, `search`
- `POST /categories` (admin/staff)
  - body: `{ "name": "New Arrivals", "description": "...", "sortOrder": 10 }`

## Inventory (Admin/Staff)
- `GET /inventory`
- `GET /inventory/alerts/low-stock`
- `PATCH /inventory/:id`
- `POST /inventory/adjust`

## Promo Codes
- `GET /promos` (public)
- `POST /promos` (admin/staff)
- `PATCH /promos/:id` (admin/staff)
- `DELETE /promos/:id` (admin/staff)
- `POST /promos/broadcast` (admin/staff)

## Orders (Protected)
- `POST /orders/quote`
- `POST /orders` (supports multipart with `designFile`)
- `GET /orders/mine`
- `GET /orders/payments/mine`
- `GET /orders/:id`
- `POST /orders/:id/installment-pay`
- `PATCH /orders/:id/status` (admin/staff)
- `GET /orders` (admin/staff)

## Notifications (Protected)
- `GET /notifications`
  - query: `page`, `limit`, `tab` (`all|unread|read`), `type` (comma separated)
- `GET /notifications/unread-count`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `DELETE /notifications/:id`
- `DELETE /notifications/clear`

## Returns (Protected)
- `POST /returns` (multipart with required `damagedImage`)
- `GET /returns/mine`
- `GET /returns` (admin/staff)
- `PATCH /returns/:id` (admin/staff)

## Complaints (Protected)
- `POST /complaints`
- `GET /complaints/mine`
- `GET /complaints` (admin/staff)
- `PATCH /complaints/:id` (admin/staff)

## Analytics (Admin/Staff)
- `GET /analytics/dashboard`
- `GET /analytics/sales/monthly?year=2026`
- `GET /analytics/returns-complaints`
- `GET /analytics/reports/sales/pdf?from=2026-02-01&to=2026-02-29` (admin only, PDF download)
- `GET /analytics/reports/stock/pdf` (admin only, PDF download)

## AI Design (Protected)
- `POST /ai/generate`
  - body: `{ "prompt": "minimal dragon logo" }`
  - response: `{ "photo": "<base64_png>" }`

## Uploads
Static files are available under:
- `GET /uploads/<filename>`
