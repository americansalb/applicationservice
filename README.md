This is the **AALB Careers** application ([Next.js](https://nextjs.org/) + Prisma + PostgreSQL), served at **careers.aalb.org**.

## Configuration

Environment variables (see deployment dashboard):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Careers Postgres connection string. |
| `PARTNERS_DATABASE_URL` | Partners portal Postgres connection string. |
| `NEXT_PUBLIC_SITE_URL` | Public base URL of the site (default `https://careers.aalb.org`). Used for SEO/OpenGraph metadata and to build interview invitation links. Set this to the deployed domain. |
| `JWT_SECRET` | Secret for signing admin auth tokens. **Set this in production.** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed/refresh the admin login on boot. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_DRIVE_FOLDER_ID` | Google Drive upload for interview videos. |
| `EMAIL_SERVICE` + `EMAIL_USER` + `EMAIL_PASSWORD`, or `RESEND_API_KEY`, or `SENDGRID_API_KEY` | Outbound email (confirmations). |

## Interviews

Admins can author self-paced **video + written interviews** from the dashboard
(**Admin → Interviews**), assign each to a role, and share an unguessable,
invitation-only link (`/interview/<slug>`). Candidate responses appear under
**Admin → Submissions**; recorded videos are uploaded to Google Drive.

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
