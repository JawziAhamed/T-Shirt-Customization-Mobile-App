# Mobile Project Guide

This guide maps the current mobile app so you can verify the core flows quickly.

## Start the app

```bash
cd server
npm run dev

cd ../client
npx expo start
```

## Demo accounts

- Admin: `admin@example.com` / `Admin@12345`
- Staff: `staff@example.com` / `Staff@12345`
- Customer: `customer@example.com` / `Customer@12345`

## Customer flow

- `Home`
  - Featured products and category shortcuts.
- `Products`
  - Search and filter the catalog.
- `Product details`
  - Size, color, quantity, image upload, AI generation, add to cart.
- `Cart`
  - Update quantities and proceed to checkout.
- `Checkout`
  - Delivery address, payment method, promo code, gift card, order placement.
- `Orders`
  - Order history and installment payment.
- `More`
  - Notifications, returns, complaints, and profile.

## Admin flow

- `Dashboard`
  - Summary cards, top products, low stock items.
- `Products`
  - Create and edit products.
- `Orders`
  - Update order statuses.
- `More`
  - Analytics, users, inventory, returns and complaints, gift cards, promos, reports, notifications, profile.

## Important files

- App entry: [client/src/App.js](/client/src/App.js)
- Navigator: [client/src/navigation/AppNavigator.js](/client/src/navigation/AppNavigator.js)
- Auth state: [client/src/store/authStore.js](/client/src/store/authStore.js)
- Cart state: [client/src/store/cartStore.js](/client/src/store/cartStore.js)
- API client: [client/src/services/apiClient.js](/client/src/services/apiClient.js)
- Mobile env sample: [client/.env.example](/client/.env.example)

## Notes

- The app uses Expo public environment variables.
- The backend still serves the MongoDB API and PDF reporting endpoints.
- Old web-only React Router, Vite, and Tailwind files were removed from the client.
