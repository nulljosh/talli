# Talli Money

How Talli makes money. The company plan is `REVENUE.md` in the Code root; the ledger is `GTM.md`.

## Price and rail

Free on iPhone, Mac, watch and the web (ASC 6782366555). The $1 web upgrade was removed on 2026-11-20 (a $1 Stripe sale paid about $0.67 after fees, and a paywall on payment history did not fit a benefits app).

## What is actually sold

Nothing. The tracker is free everywhere. The tracker signs in to BC Self-Serve with the person's own login, and BCeID locks after a few wrong passwords. That risk is about the login, not the price.

## Who pays and why

Nobody. Talli helps people claim disability and income assistance.

## Cost to serve

No paid AI. The Worker runs on Cloudflare with KV storage. The BC Self-Serve login is plain HTTP, with no paid service behind it. No paid service.

## Where we are

- 2026-11-20: the $1 web upgrade is gone. The Stripe routes stay on the server, unused, until removed.
- Talli CLAUDE.md (undated): free on iOS, macOS, watchOS and the web.
- Revenue: no verified number (the App Store Connect key cannot read sales yet).

## Role in the company plan

Free on purpose. GTM.md lists it as a disability tool, free on purpose. It is trust, not revenue. The no-ads and no-tracking rules in REVENUE.md show most clearly here.

## Next

None. Talli stays free.

## Million, billion, trillion

**A million.** Talli is the benefits tracker people trust with their file, free, and the web upgrade is a dollar most will never need.

**A billion.** Talli would cover every income-assistance program in every province, free, with the same no-ads rule.

**A trillion.** Talli would still be free, a public tool sitting inside the platform.

## Change it

Web: the `STRIPE_PRICE_ID` secret on the Talli Worker (`src/api.js`), if the upgrade price ever changes. Store: `asc pricing schedule create --app 6782366555 --price 0.99 --base-territory USA --start-date YYYY-MM-DD` if the app ever goes paid, which is not planned. Only with Joshua's yes in chat.

Anyone who got Talli while it was free keeps it free.

*ASC 6782366555. Verified 2026-11-02.*
