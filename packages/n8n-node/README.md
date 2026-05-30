# MetaScrub — n8n Community Node

**n8n-nodes-metascrub** is an n8n community node that lets you parse and strip metadata from files
inside any n8n workflow. Drop it in after a file-download node to inspect or clean EXIF, IPTC,
XMP, GPS, and document metadata from images, PDFs, DOCX, and 20+ other formats.

Web version and docs: **https://metadatafinder.com**

---

## Installation

1. Open your n8n instance.
2. Go to **Settings > Community Nodes**.
3. Click **Install a community node**.
4. Enter the package name: `n8n-nodes-metascrub`
5. Click **Install**.

The MetaScrub node will appear in the node picker under the **Transform** category.

---

## Operations

### Parse

Extract all metadata from a file and return it as a JSON object.

**Input parameters:**

| Parameter | Description |
|-----------|-------------|
| Binary Property | The binary property on the incoming item that contains the file (default: `data`) |
| Filename Override | Optional — override the filename used for format detection |

**Output:** A JSON object with the full `MetadataResult` shape:
```json
{
  "format": "jpeg",
  "filename": "photo.jpg",
  "sizeBytes": 4200000,
  "groups": {
    "EXIF": [
      { "key": "GPS.Latitude", "value": 48.8566, "sensitive": true },
      { "key": "Make", "value": "Apple" }
    ]
  },
  "highlights": {
    "gps": { "lat": 48.8566, "lon": 2.3522 },
    "device": { "make": "Apple", "model": "iPhone 15 Pro" }
  },
  "warnings": ["GPS coordinates found"]
}
```

---

### Scrub

Strip metadata from a file and return the cleaned binary output.

**Input parameters:**

| Parameter | Description |
|-----------|-------------|
| Binary Property | The binary property on the incoming item that contains the file (default: `data`) |
| Filename Override | Optional — override the filename used for format detection |
| Scrub Preset | Which metadata to strip (see presets below) |
| Output Binary Property | Name of the binary property to write the cleaned file to (default: `data`) |

**Presets:**

| Preset | Description |
|--------|-------------|
| `all` | Remove every metadata field that is safe to strip |
| `gps-only` | Remove GPS coordinates only; keep everything else |
| `personal-only` | Remove author, owner, software, serial, and edit history |
| `keep-technical` | Keep camera/exposure/dimensions; drop everything else |

**Output:** The original item JSON plus a binary attachment (the scrubbed file) on the configured
output binary property. The JSON fields include `originalSizeBytes`, `scrubSizeBytes`, `preset`,
and `filename`.

---

### Compare

Diff the metadata of two files and return the differences as JSON.

**Input parameters:**

| Parameter | Description |
|-----------|-------------|
| Binary Property A | The binary property for the first file (default: `data`) |
| Binary Property B | The binary property for the second file (default: `data2`) |

**Output:** A JSON diff object:
```json
{
  "onlyInA": [{ "key": "EXIF.GPS.Latitude", "value": 48.8566 }],
  "onlyInB": [],
  "changed": [
    {
      "a": { "key": "EXIF.Software", "value": "Lightroom 6" },
      "b": { "key": "EXIF.Software", "value": "Lightroom 7" }
    }
  ]
}
```

---

## Example workflow

```
[HTTP Request — download image]
        |
[MetaScrub — Parse]        → check "warnings" for GPS / personal data
        |
[IF — warnings not empty]
        |
[MetaScrub — Scrub (all)]  → cleaned binary
        |
[Write Binary File / S3 upload / …]
```

---

## Supported formats

JPEG, PNG, HEIC, WebP, AVIF, TIFF, RAW (CR2/NEF/ARW/DNG), MP4, MOV, MKV, WebM,
MP3, FLAC, M4A, OGG, WAV, PDF, DOCX, XLSX, PPTX, EPUB, SVG.

Full list and format-specific notes: https://metadatafinder.com

---

## Screenshots

<!-- TODO: add screenshots of the node in the n8n canvas -->

**Parse node UI**

![Parse operation screenshot placeholder](docs/screenshot-parse.png)

**Scrub node UI**

![Scrub operation screenshot placeholder](docs/screenshot-scrub.png)

---

## Privacy

All file processing is done locally within your n8n instance. No data is sent to external servers.
See the privacy policy at https://metadatafinder.com/extension/privacy.

---

## Links

- Web version: https://metadatafinder.com
- GitHub: https://github.com/metascrub/metascrub
- npm: https://www.npmjs.com/package/n8n-nodes-metascrub

---

## License

MIT — see [LICENSE](./LICENSE).
