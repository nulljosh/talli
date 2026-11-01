# Security

## Reporting

Found something? Email **trommatic@icloud.com**. Don't open a public issue for anything exploitable.

You'll hear back within a week. This is a solo side project. No bounty, no SLA, just a reply.

## Supported versions

The deployed version and the tip of `main`. Nothing else.

## What keeps you safe

Talli signs in to BC Self-Serve with your BCeID because Self-Serve has no public API. Your password is encrypted with AES-256 and a fresh IV every time and is never written in the clear. Your SIN is masked on every screen.

BCeID locks an account after a few wrong passwords, so a failed sign-in is never retried. Sessions, paid months and read state live in Workers KV. The terminal app keeps only a read-only widget token, never the password.

The only outside calls are to BC Self-Serve. No ads, no trackers, and the page counter sets no cookies.
