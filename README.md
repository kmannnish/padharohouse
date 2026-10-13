# Padharo House

Website for **Padharo House** — a luxury boutique homestay in Amer, Jaipur, right opposite the Amber (Amer) Fort. *Where heritage meets hospitality.*

**Live site:** https://padharohouse.in · **Instagram:** [@padharo_house](https://www.instagram.com/padharo_house)

## Structure
| Path | Purpose |
|------|---------|
| `index.html` | Home — hero slider, the suite, gallery, experiences, location |
| `booking.html` | Availability + indicative quote → request-to-book on WhatsApp |
| `blog.html` | Journal; guest reviews begin once we host real guests |
| `admin.html` | Static back-office mock (reference for Phase 2 — unlinked, not indexed) |
| `assets/` | Shared CSS, JS, images, logo |
| `opening-soon/` | Archived "Opening Soon" launch page |

## Phases
- ✅ **Phase 1** — public marketing site (this); booking = request-to-book via WhatsApp
- ⏳ **Phase 2** — real booking engine, online payments (Razorpay), lead dashboard, admin login

## Hosting & deploys
Static site on **Cloudflare Pages**, connected to this GitHub repo:
- Push/merge to **`main`** → auto-deploys to production (`padharohouse.in`).
- Each **pull request** gets its own preview URL to review before going live.

No build step. Framework preset: **None** · Build command: *(empty)* · Build output directory: `/`.
