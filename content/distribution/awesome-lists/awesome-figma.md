# Awesome Figma — MetaScrub Submission

## Target list

**Repository:** https://github.com/react-figma/awesome-figma

**Contributing guide:** https://github.com/react-figma/awesome-figma/blob/master/CONTRIBUTING.md

**Target section:** "Open-Source Plugins" — react-figma/awesome-figma uses asterisks for list items and groups plugins by category.

---

## Submission line

This list uses `* [Name](url) - Description.`

```markdown
- [MetaScrub](https://www.figma.com/community/plugin/metascrub) - View and strip metadata from design assets — file author, creation date, software version, and embedded EXIF data from imported images.
```

[verify: replace with the actual Figma Community plugin URL after the plugin is published]

If the list prefers the GitHub source link:

```markdown
- [MetaScrub](https://github.com/metascrub/metascrub/tree/main/packages/figma) - View and strip metadata from design assets — file author, creation date, software version, and embedded EXIF data from imported images.
```

---

## PR title

```
Add MetaScrub plugin — metadata viewer for Figma design assets
```

## PR body

```markdown
Hi! Adding MetaScrub to the Open-Source Plugins section.

**What it does:** MetaScrub is a Figma plugin that reads and strips metadata from design files and imported assets. It surfaces:

- File author name and creation date embedded in the Figma file
- Software version information
- EXIF metadata inside images imported into the design (make, model, GPS if present)
- XMP metadata from embedded assets

Useful for design teams that import client-provided images and want to verify there is no unexpected metadata (GPS coordinates, unintended author names) before sharing the design or exporting assets.

**Figma Community:** https://www.figma.com/community/plugin/metascrub [verify: update after publishing]
**License:** MIT
**Source:** https://github.com/metascrub/metascrub
**Homepage:** https://metadatafinder.com
```

---

_Note: Submit this PR only after the Figma Community plugin is live. The Figma Community URL is needed. The design-team angle (checking imported client photos for GPS before sharing mockups) is the strongest differentiator for this audience._
