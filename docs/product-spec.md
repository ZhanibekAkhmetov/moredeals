# MoreDeals Product Spec

MoreDeals is a portfolio product comparison app inspired by platforms like Idealo.

The goal is not to build a full production marketplace, but to showcase the ability to build a modern product search and comparison experience.

## Core Idea

Users can search for a product, view matching offers from different online stores, and inspect detailed offer information before being redirected to the seller.

Unlike common price comparison tools, clicking an offer does not immediately redirect the user. Instead, it opens an offer details panel.

## Core Features

- Product search
- Exact product matching
- Offer comparison table
- Offer details drawer / popup
- Price history chart
- Earliest delivery date
- Payment methods
- Return policy
- Warranty information
- Product rating in that store
- Trustpilot-style store rating
- Clear “Go to seller” button

## MVP Product Category

The MVP will focus on smartphones.

Example product:

Apple iPhone 15 128GB Black

## Main User Flow

1. User searches for a product.
2. User selects the exact product.
3. User sees offers from multiple stores.
4. User clicks an offer row.
5. Offer details drawer opens.
6. User reviews price history, delivery, payment, return, warranty, and trust information.
7. User clicks “Go to seller” to leave the app.

## Tech Stack

Frontend:
- React
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts

Backend:
- NestJS
- TypeScript

Database:
- PostgreSQL
- Prisma

Search:
- Meilisearch later

Background Jobs:
- Redis
- BullMQ later

Deployment:
- Vercel for frontend
- Railway/Render/Fly.io for backend
- Neon/Supabase for PostgreSQL