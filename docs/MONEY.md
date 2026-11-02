# Talli Money

How Talli makes money. The company plan is `REVENUE.md` in the Code root; the ledger is `GTM.md`.

## Price and rail

Free on iPhone, Mac, watch and the web (ASC 6782366555). The web has a one-time $1 upgrade through Stripe. A $1 Stripe sale pays about $0.67 after fees.

## What is actually sold

The web upgrade, one dollar, once. The tracker itself is free everywhere. The tracker signs in to BC Self-Serve with the person's own login, and BCeID locks after a few wrong passwords. That risk is about the login, not the price.

## Who pays and why

Nobody has to. Talli helps people claim disability and income assistance. The upgrade is for someone who wants more than the free tracker, and it costs one dollar, once.

## Cost to serve

No paid AI. The Worker runs on Cloudflare with KV storage. The BC Self-Serve login is plain HTTP, with no paid service behind it. Stripe is the only paid service, and it takes its fee per sale.

## Where we are

- Root CLAUDE.md gotchas (undated): Stripe is live on the web for Talli.
- Talli CLAUDE.md (undated): free on iOS, macOS, watchOS and the web.
- Revenue: no verified number (the App Store Connect key cannot read sales yet).

## Role in the company plan

Free on purpose. GTM.md lists it as a disability tool, free on purpose, with a web upgrade. It is trust, not revenue. The no-ads and no-tracking rules in REVENUE.md show most clearly here.

## Next

None. Talli stays free, and the Stripe upgrade stays as it is.

## Million, billion, trillion

**A million.** Talli is the benefits tracker people trust with their file, free, and the web upgrade is a dollar most will never need.

**A billion.** Talli would cover every income-assistance program in every province, free, with the same no-ads rule.

**A trillion.** Talli would still be free, a public tool sitting inside the platform.

## Change it

Web: the `STRIPE_PRICE_ID` secret on the Talli Worker (`src/api.js`), if the upgrade price ever changes. Store: `asc pricing schedule create --app 6782366555 --price 0.99 --base-territory USA --start-date YYYY-MM-DD` if the app ever goes paid, which is not planned. Only with Joshua's yes in chat.

Anyone who got Talli while it was free keeps it free.

*ASC 6782366555. Verified 2026-11-02.*
