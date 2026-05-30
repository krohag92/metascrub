=== MetaScrub ===

Contributors: metadatafinder
Tags: exif, metadata, privacy, media, image
Requires at least: 6.0
Tested up to: 6.7
Stable tag: 0.1.0
Requires PHP: 8.0
License: GPL v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

View and strip EXIF, GPS, and document metadata from media uploads. Privacy-first. Powered by metadatafinder.com.

== Description ==

**MetaScrub** automatically scrubs sensitive metadata from images and documents uploaded to your WordPress media library — before they reach your visitors.

Every photo taken on a modern smartphone contains hidden EXIF data: GPS coordinates pinpointing where the photo was taken, the camera make and model, the date and time, and sometimes the author's name. PDF documents often carry author names, revision history, and software fingerprints. MetaScrub removes all of this in one click.

**Powered by [metadatafinder.com](https://metadatafinder.com) — see and strip metadata from any file.**

= Key features =

* **Auto-scrub on upload** — metadata is stripped as soon as files enter your media library. No extra steps needed.
* **Bulk cleaner** — clean your existing media library in batches via Tools → MetaScrub Bulk Cleaner.
* **Preset picker** — choose how aggressively to scrub:
  * *All metadata* — full strip (EXIF, GPS, XMP, IPTC, comments)
  * *GPS only* — remove only location data
  * *Personal only* — remove author, copyright, GPS; keep camera settings
  * *Keep technical* — remove personal data; keep aperture, shutter speed, focal length
  * *Off* — disable scrubbing (inspect mode)
* **Preview metadata** — see what fields a file contains before scrubbing.
* **Supported formats** — JPEG, PNG, PDF (the three most common WordPress upload types).
* **100% local** — no file data is ever sent to an external server.
* **No telemetry** — zero analytics, zero phone-home.
* **GPL-licensed** — fully open source.

= Privacy =

MetaScrub processes all files locally on your web server. No file content or metadata is sent to any third-party service. See the full privacy information at [metadatafinder.com](https://metadatafinder.com).

= Use cases =

* **Photography blogs** — strip GPS from location-sensitive images.
* **Legal / medical** — ensure documents don't reveal author names or revision history.
* **News and journalism** — protect source locations embedded in uploaded images.
* **E-commerce** — remove warehouse GPS from product photos.
* **General privacy** — follow data minimisation best practices automatically.

= Technical notes =

MetaScrub uses native PHP for all scrubbing — no external binaries, no Composer dependencies, no shell exec. It walks JPEG segments, PNG chunks, and PDF byte-streams natively in PHP 8.0+.

== Installation ==

= From WordPress Admin =

1. Go to **Plugins → Add New**.
2. Search for **MetaScrub**.
3. Click **Install Now**, then **Activate**.

= Manual installation =

1. Download the plugin ZIP from the WordPress.org plugin directory.
2. Go to **Plugins → Add New → Upload Plugin**.
3. Upload the ZIP and click **Install Now**, then **Activate**.

= WP-CLI =

`wp plugin install metascrub --activate`

= Configuration =

1. Go to **Settings → MetaScrub** to choose your scrub preset and enable/disable auto-scrub on upload.
2. For existing media, go to **Tools → MetaScrub Bulk Cleaner**.

== Frequently Asked Questions ==

= Which file types are supported? =

JPEG (.jpg, .jpeg), PNG (.png), and PDF (.pdf). These cover the vast majority of WordPress media uploads.

= Will scrubbing affect image quality? =

No. MetaScrub only removes metadata segments/chunks. The actual image pixel data and compression are untouched.

= Can I undo a scrub? =

No. Scrubbing is destructive and irreversible. WordPress does not keep a backup of the original file once overwritten. If you need to preserve originals, make a backup before scrubbing.

= Does MetaScrub preserve ICC colour profiles? =

Yes. ICC profiles (embedded in JPEG APP2 segments and PNG iCCP chunks) are always preserved regardless of preset — they are needed for correct colour rendering.

= Does it work with WebP or HEIC? =

Not in version 0.1. JPEG, PNG, and PDF are supported. Additional formats may be added in future versions.

= Does it send my files anywhere? =

Never. All processing happens on your web server using PHP's standard library. No data leaves your server.

= Is it compatible with WooCommerce product images? =

Yes. MetaScrub hooks into `wp_handle_upload`, which fires for all WordPress uploads including WooCommerce product images.

= Does it slow down uploads? =

The overhead is minimal (a few milliseconds for typical web images). For large PDF files it may add a fraction of a second.

= What happens if scrubbing fails? =

MetaScrub logs the error via PHP's `error_log()` and lets WordPress continue with the original file. The upload is never blocked.

= Is the source code available? =

Yes. MetaScrub is GPL-2.0+ licensed. The full source code is on GitHub: https://github.com/antonkrokhmal/metascrub

== Screenshots ==

1. Settings page — preset picker and scrub-on-upload toggle.
2. Bulk Cleaner — media library list with metadata preview per file.
3. Bulk Cleaner — results table after scrubbing.

== Changelog ==

= 0.1.0 =
* Initial release.
* Auto-scrub on upload for JPEG, PNG, PDF.
* Bulk-cleaner admin page under Tools.
* Settings page with preset picker under Settings.
* Five presets: All / GPS only / Personal only / Keep technical / Off.
* Native PHP scrubbers — no external dependencies.

== Upgrade Notice ==

= 0.1.0 =
Initial release. No upgrade needed.
