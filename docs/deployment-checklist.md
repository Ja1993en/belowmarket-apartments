# Deployment Checklist

## Required Runtime

- Use Node `20.19.0` or newer.
- This repo includes `.nvmrc` and `.node-version` set to `20.19.0`.
- If your terminal uses an older Node version, run `nvm use` before building.

## Cloudflare Variables

Set these in Cloudflare Pages for production:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `LEAD_NOTIFICATION_TO`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Legacy fallback variables still work for admin auth:

- `VITE_ADMIN_USERNAME`
- `VITE_ADMIN_PASSWORD`

For security, prefer `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET`, then remove the old `VITE_ADMIN_*` values from Cloudflare when confirmed.

## Production QA Flow

1. Submit `/start`.
2. Confirm the lead appears in Supabase.
3. Confirm the admin notification email arrives.
4. Log in at `/admin-login`.
5. Confirm `/admin/leads` shows the new lead.
6. Open the lead detail page.
7. Send property recommendations.
8. Open the renter recommendation link.
9. Request a tour from the renter link.
10. Confirm the tour request appears in admin.

## Security QA

1. Open `/admin/leads` in a private browser window.
2. Confirm it redirects to `/admin-login`.
3. Log in.
4. Confirm `/admin/leads` loads.
5. Click Logout.
6. Confirm `/admin/leads` redirects again.
