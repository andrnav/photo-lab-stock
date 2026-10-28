# Photo Lab Stock

Inventory web app for Cloudflare Pages Functions + D1.

## Features
- Public read-only inventory and movement history.
- Admin-only item creation, editing and stock movements.
- Product code and optional color label for each item.
- Inventory sorted alphabetically by item name.
- QR code per item. Scanning the QR opens the inventory URL and deducts one unit only after the administrator is authenticated. If the administrator is not logged in, the app asks for admin login first.
- Existing D1 databases are upgraded automatically: the API adds `product_code` and `color` columns if missing. Do not rerun `schema.sql` on an existing database.

## Cloudflare setup
Required bindings/secrets:
- D1 database binding named `DB`
- Secret `APP_PASSWORD` for the `admin` account
- Secret `SESSION_SECRET` (long random secret)

Deploy as a Cloudflare Pages project with the `functions/` directory at the repository root. The QR library is loaded from cdnjs, so QR generation requires internet access in the browser.

## QR stock deduction
An admin can click **QR kodas** next to an item and print the QR. Scanning it with the iPhone camera opens the site. If the browser has an active admin session, one unit is deducted immediately and the change is logged. Otherwise, the admin must log in first. Do not share the admin login with visitors; QR links do not bypass server-side authorization.
