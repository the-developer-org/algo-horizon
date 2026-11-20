This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:5050](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. Next.js Fast Refresh updates the page as you edit. The development commands use file polling to detect changes reliably when filesystem notifications are unavailable. Restart the server after changing environment variables or server configuration.

To skip the app login check locally, set `NEXT_PUBLIC_SKIP_AUTH=true` in `.env.local` and restart the server. Any other value or an unset variable keeps the login check enabled. This does not create a user or bypass separate admin checks. Do not enable this flag in production; public Next.js environment variables are embedded in the client build.

Set `NEXT_PUBLIC_CANDLES_ALL_DAY=true` to show live-market candles from the candle socket. Set it to `false` or remove it to use the usual closing-prices API candles instead. Restart the server after changing it. Quote and market-feed sockets still follow market hours.

## Live Market profiles

The Indexes view shows constituents returned by live-indexes even when they are not currently tracked. Untracked constituents have no price until their instruments are tracked and market data is available.

Select **Profile** on an instrument in Live Market to view its live quote, market depth, and trading activity when supplied by the existing market-data feed. Missing fields are shown as unavailable; the feed does not provide company fundamentals. The instrument must already be subscribed, and live updates depend on the feed and market availability.
Stock and index profiles wait for a connected feed and valid live price before fetching option contracts for the nearest remaining expiry in the current month. Pull CE displays up to three distinct strikes above that price; Pull PE displays up to three below it. Results capture the price when clicked and do not subscribe the contracts. Option-contract profiles do not perform an underlying lookup.

Run the feed decoder tests with Node.js 22.18 or later:

```bash
node --test lib/upstoxFeed.test.mjs
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
