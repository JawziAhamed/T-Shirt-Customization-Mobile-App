# Customized T-Shirt Management System

01). GitHub Repository Link 
GitHub Repository: [https://github.com/your-repo-link ](https://github.com/JawziAhamed/T-Shirt-Customization-Mobile-App.git)
02).Team Details 
Group Number: XX 
Member 1: ITxxxx – Name – Module   
Member 2: ITxxxx – Name – Module   
Member 3: ITxxxx – Name – Module   
Member 4: ITxxxx – Name – Module   
Member 5: ITxxxx – Name – Module   
Member 6: ITxxxx – Name – Module   
03). Deployment Details 
Backend URL:[ https://your-api-link ](https://t-shirt-customization-mobile-app.onrender.com)

A mobile-first customized t-shirt storefront and operations platform built with Expo React Native, Node.js, Express, and MongoDB.

## Overview

The project now runs as an Expo Go-compatible mobile app. The web client has been replaced with a native React Native experience that keeps the same core business flow:

- Browse products and categories
- View product details and live customization preview
- Add items to cart as a guest or signed-in user
- Sign in to place orders, view orders, returns, complaints, and notifications
- Manage products, users, inventory, promos, gift cards, analytics, and support flows from the admin side

## Recent Updates

- Expo Go-only mobile setup on Expo SDK 54
- Guest browsing with cart support
- Product details swipe between customization preview and base T-shirt view
- Empty cart product suggestions
- Admin dashboard with revenue trend, notifications, quick actions, and summary cards
- Seeded demo data for users, products, orders, payments, returns, complaints, notifications, promos, and gift cards
- Mobile-friendly image upload confirmation for product management

## Project Structure

```text
root/
|-- client/   Expo React Native mobile app
|-- server/   Express + MongoDB API
|-- README.md
```

## Tech Stack

### Client

- Expo SDK 54
- React Native 0.81
- React 19
- React Navigation
- Zustand
- Axios
- Expo image, file, picker, secure storage, and linear gradient modules

### Server

- Node.js
- Express
- MongoDB / Mongoose
- JWT authentication
- Cloudinary uploads
- Reporting, notifications, AI, orders, returns, and complaint endpoints

## Prerequisites

- Node.js 18 or newer
- MongoDB Atlas or local MongoDB
- Expo Go installed on your phone

## Setup

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

Copy the sample files and update the values:

```bash
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

For the mobile app, use your computer LAN IP when testing on a physical device:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8080/api
EXPO_PUBLIC_ASSET_URL=http://192.168.x.x:8080
```

## Running the Project

### 1. Seed demo data

This populates the database with demo users, products, orders, returns, complaints, notifications, promos, and gift cards.

```bash
cd server
npm run seed
```

### 2. Start the backend API

```bash
cd server
npm run dev
```

### 3. Start the mobile app

```bash
cd client
npx expo start
```

If you are testing on a phone, keep the phone and computer on the same Wi-Fi network and scan the QR code with Expo Go.

If the app is on a physical Android device and requests fail with `Network Error`, confirm the client `.env` uses your PC LAN IP instead of `localhost`.

## Useful Commands

### Server

```bash
npm run dev
npm run seed
npm test
```

### Client

```bash
npx expo start
npx expo start --clear
```

## Demo Accounts

- Admin: `admin@example.com` / `Admin@12345`
- Staff: `staff@example.com` / `Staff@12345`
- Customer: `customer@example.com` / `Customer@12345`

## Key Features

- Native authentication and guest mode
- Product catalog with search, categories, and featured products
- Product detail page with swipeable customization and base T-shirt preview
- Cart with guest-friendly browsing and login-gated checkout
- Customer orders, returns, complaints, notifications, and profile tools
- Admin dashboard with analytics, recent orders, top products, low stock alerts, and quick actions
- Product image upload confirmation for mobile management

## Notes

- The client is intended to run in Expo Go.
- The backend keeps the same MongoDB-based data model and API routes.
- Seed data can be rerun at any time, but it will reset the demo collections first.

## API Docs

- [server/API_DOCS.md](server/API_DOCS.md)
