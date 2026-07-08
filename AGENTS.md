# TS-JioTV - Agent Guide

## Stack

Pure PHP 7.4+ procedural app (no Composer, no Node, no build step). Apache-recommended with `.htaccess` rewrite rules; non-Apache servers fall back to query param URLs. Frontend via CDN (Tailwind, JW Player 8, Plyr).

## Project Type

JioTV streaming proxy: OTP login → fetch live/catchup HLS streams → relay to browser or IPTV player (M3U). Stores auth tokens in `app/assets/data/*.jtv` files.

## Key Files

| File | Role |
|---|---|
| `index.php` | Channel grid UI + modals (login, playlist, search) |
| `app/functions.php` | Core: cURL helpers, JioTV API calls, crypto, `isApache()` |
| `app/auth.php` | Authenticated stream proxy for HLS segments |
| `app/playlist.php` | M3U playlist generator (supports 7-day catchup) |
| `app/live.php` | Live HLS playlist rewriter |
| `app/stream.php` | BPK-TV stream manifest proxy |
| `app/catchup/` | Catchup mirror of the above (cp*.php) with ~70% code duplication |
| `config.ini` | `proxy=true` routes segments through auth.php (needed outside India) |
| `.gitignore` | Ignores `*.jtv`, `test/`, `decrypt/` |

## API Constants (hardcoded, mimicking JioTV Android app)

- `appkey = NzNiMDhlYcQyNjJm` (base64 of `73b08e?262f`)
- `usergroup = tvYR7NSNn7rymo3F`
- `versionCode = 452`
- `User-Agent = plaYtv/7.1.3 (Linux;Android 14) ExoPlayerLib/2.11.7`

## URL Scheme

Channel data fields: `bin2hex("channel_id=?=channel_name=?=catchup_flag")`. Decode with `hex2bin()` then split on `=?=`.

## Credential Crypto

Custom Caesar-cipher on base64: key in `credskey.jtv`, ciphertext in `creds.jtv`. Token expiry ~7000s, cookie expiry ~40000s.

## No Tests / No CI / No Linting

Manual testing only. Deploy by copying files to a web server document root with PHP 7.4+ and `curl` extension.
