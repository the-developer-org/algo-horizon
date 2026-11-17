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

## Live Market profiles

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
