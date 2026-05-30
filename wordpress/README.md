# MetaScrub — WordPress Plugin

**View and strip EXIF, GPS, and document metadata from WordPress media uploads.**

Powered by [metadatafinder.com](https://metadatafinder.com) — See and strip metadata from any file.

---

## Features

- Auto-scrub on upload (hook: `wp_handle_upload`)
- Bulk cleaner for existing media library (Tools → MetaScrub Bulk Cleaner)
- Settings page with preset picker (Settings → MetaScrub)
- Five presets: All / GPS only / Personal only / Keep technical / Off
- Supported formats: JPEG, PNG, PDF
- 100% local processing — no external HTTP calls, no telemetry
- Native PHP scrubbers — no Composer dependencies, no shell exec

---

## Installation

### WP-CLI (recommended)

```bash
wp plugin install metascrub --activate
```

### Manual

1. Download the plugin ZIP.
2. Go to **Plugins → Add New → Upload Plugin** in your WordPress admin.
3. Upload the ZIP and activate.

### From source

```bash
# Clone into your plugins directory
git clone https://github.com/antonkrokhmal/metascrub.git wp-content/plugins/metascrub

# Activate via WP-CLI
wp plugin activate metascrub
```

---

## Usage

### Auto-scrub on upload

1. Go to **Settings → MetaScrub**.
2. Choose a preset (All / GPS only / Personal only / Keep technical / Off).
3. Enable "Scrub on upload".
4. Upload images or PDFs normally — metadata is stripped automatically.

### Bulk clean existing media

1. Go to **Tools → MetaScrub Bulk Cleaner**.
2. Review the metadata preview per file.
3. Check the files you want to scrub.
4. Click **Scrub selected**.

---

## Presets

| Preset | What's removed |
|---|---|
| All metadata | Everything: EXIF, GPS, XMP, IPTC, comments, dates |
| GPS only | GPS/location data only |
| Personal only | Author, copyright, GPS, comments |
| Keep technical | Personal data only; camera settings (aperture, ISO, etc.) are kept |
| Off | Nothing — inspect mode |

---

## Supported formats

| Format | Segments / chunks removed |
|---|---|
| JPEG | APP1 (EXIF/XMP), APP13 (IPTC), APP2 (non-ICC), APP14 (Adobe), COM |
| PNG | tEXt, zTXt, iTXt, eXIf, tIME |
| PDF | Info dict values (Author, Title, Creator…), XMP streams |

---

## File structure

```
wordpress/
├── metascrub.php                  # Main plugin file (WP header)
├── readme.txt                     # wordpress.org plugin directory format
├── includes/
│   ├── class-metascrub.php        # Core plugin class (singleton bootstrap)
│   ├── class-uploader-hook.php    # wp_handle_upload integration
│   ├── class-bulk-cleaner.php     # Bulk-cleaner admin page
│   ├── class-settings.php         # Settings page (WP Settings API)
│   ├── class-scrubber-jpeg.php    # Native PHP JPEG segment scrubber
│   ├── class-scrubber-png.php     # Native PHP PNG chunk scrubber
│   └── class-scrubber-pdf.php     # Native PHP PDF byte-surgery scrubber
├── assets/
│   ├── icon-128x128.png
│   ├── icon-256x256.png
│   ├── banner-772x250.png
│   └── banner-1544x500.png
├── languages/
│   └── metascrub.pot              # Translation template
├── tests/
│   ├── bootstrap.php              # Minimal test harness (no PHPUnit needed)
│   ├── test-scrubber-jpeg.php     # JPEG scrubber tests (26 assertions)
│   ├── test-scrubber-png.php      # PNG scrubber tests (32 assertions)
│   └── test-scrubber-pdf.php      # PDF scrubber tests (24 assertions)
├── LICENSE                        # GPL-2.0+
└── README.md                      # This file
```

---

## Development

### Requirements

- PHP 8.0+
- WordPress 6.0+ (for local testing)

### PHP syntax check

```bash
find wordpress -name '*.php' -print0 | xargs -0 php -l
```

Or individually:

```bash
php -l metascrub.php
php -l includes/*.php
```

### Run tests

No PHPUnit required. Tests use a minimal built-in harness.

```bash
php tests/test-scrubber-jpeg.php
php tests/test-scrubber-png.php
php tests/test-scrubber-pdf.php
```

All three must exit with code 0.

### Local WordPress testing

Using [wp-env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/):

```bash
# In the plugin directory:
npx @wordpress/env start
wp --path=$(npx @wordpress/env run cli 'wp config path') plugin activate metascrub
```

Or using [wp-now](https://github.com/WordPress/playground-tools/tree/trunk/packages/wp-now):

```bash
npx @wp-now/wp-now start
```

---

## Plugin check compatibility

This plugin is designed to pass the [WP Plugin Check](https://wordpress.org/plugins/plugin-check/) tool:

- All output is escaped via `esc_html()` / `esc_attr()` / `esc_url()`
- All forms use `wp_nonce_field()` + `check_admin_referer()`
- All admin actions check `current_user_can('manage_options')`
- All input is sanitized via `sanitize_key()` / `absint()` / `sanitize_text_field()`
- No `eval()`, `extract()`, or `base64_decode()` on user input
- No external HTTP calls
- No minified code

---

## Contributing

Pull requests welcome. Please:

1. Run PHP lint before submitting.
2. Add tests for any new scrubbing logic.
3. Keep the "no external dependencies" constraint — PHP standard library only.

---

## License

GPL-2.0 or later. See [LICENSE](LICENSE).

This license is required by wordpress.org/plugins. All other MetaScrub packages are MIT.

---

## Links

- Homepage: [https://metadatafinder.com](https://metadatafinder.com)
- Plugin directory: https://wordpress.org/plugins/metascrub/
- GitHub: https://github.com/antonkrokhmal/metascrub
