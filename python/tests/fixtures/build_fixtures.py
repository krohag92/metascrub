"""
Synthetic fixture builder — creates minimal test files for each format.

Run directly to regenerate fixtures:
    python tests/fixtures/build_fixtures.py

Mirrors the approach used in packages/core/test/helpers/.
"""

from __future__ import annotations

import io
import os
import struct
import zipfile
import zlib

FIXTURES_DIR = os.path.dirname(os.path.abspath(__file__))


# -------------------------------------------------------------------------
# JPEG with GPS + Artist EXIF
# -------------------------------------------------------------------------


def build_jpeg_with_gps() -> bytes:
    """Build a minimal JPEG with EXIF GPS + Artist tags."""
    import piexif

    # Create a tiny 1x1 white JPEG via Pillow
    from PIL import Image

    img = Image.new("RGB", (1, 1), color=(255, 255, 255))
    buf = io.BytesIO()

    # Build EXIF with GPS
    exif_dict = {
        "0th": {
            piexif.ImageIFD.Make: b"TestCam",
            piexif.ImageIFD.Model: b"Model X",
            piexif.ImageIFD.Software: b"TestSoftware 1.0",
            piexif.ImageIFD.Artist: b"Test Artist",
            piexif.ImageIFD.Orientation: 1,
        },
        "Exif": {
            piexif.ExifIFD.DateTimeOriginal: b"2023:06:15 12:30:00",
        },
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef: b"N",
            piexif.GPSIFD.GPSLatitude: ((37, 1), (46, 1), (0, 1)),
            piexif.GPSIFD.GPSLongitudeRef: b"W",
            piexif.GPSIFD.GPSLongitude: ((122, 1), (25, 1), (0, 1)),
            piexif.GPSIFD.GPSAltitudeRef: 0,
            piexif.GPSIFD.GPSAltitude: (10, 1),
        },
        "1st": {},
        "thumbnail": None,
    }
    exif_bytes = piexif.dump(exif_dict)
    img.save(buf, format="JPEG", exif=exif_bytes, quality=50)
    return buf.getvalue()


def build_jpeg_no_metadata() -> bytes:
    """Build a plain JPEG with no metadata."""
    from PIL import Image

    img = Image.new("RGB", (1, 1), color=(128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=50)
    return buf.getvalue()


# -------------------------------------------------------------------------
# PNG with text chunks
# -------------------------------------------------------------------------


def _make_png_chunk(chunk_type: str, data: bytes) -> bytes:
    type_bytes = chunk_type.encode("latin-1")
    crc = zlib.crc32(type_bytes + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + type_bytes + data + struct.pack(">I", crc)


def build_png_with_metadata() -> bytes:
    """Build a PNG with tEXt metadata chunks."""
    from PIL import Image

    img = Image.new("RGB", (1, 1), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    base = buf.getvalue()

    # Insert tEXt chunks before IEND
    iend_pos = base.rfind(b"IEND")
    if iend_pos < 0:
        return base

    # Build tEXt chunks
    def text_chunk(keyword: str, value: str) -> bytes:
        data = keyword.encode("latin-1") + b"\x00" + value.encode("latin-1")
        return _make_png_chunk("tEXt", data)

    # tIME chunk: 2024-03-15 10:30:00
    time_data = struct.pack(">H", 2024) + bytes([3, 15, 10, 30, 0])
    time_chunk = _make_png_chunk("tIME", time_data)

    extra = (
        text_chunk("Author", "PNG Artist")
        + text_chunk("Software", "GIMP 2.10")
        + text_chunk("Comment", "Test image")
        + time_chunk
    )

    # Insert before the IEND chunk (4 bytes length + 4 bytes type)
    insert_at = iend_pos - 4  # before the 4-byte length prefix of IEND
    return base[:insert_at] + extra + base[insert_at:]


def build_png_no_metadata() -> bytes:
    """Build a plain PNG with no text metadata."""
    from PIL import Image

    img = Image.new("RGB", (1, 1), color=(0, 128, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# -------------------------------------------------------------------------
# PDF with Info dict
# -------------------------------------------------------------------------


def build_pdf_with_metadata() -> bytes:
    """Build a minimal PDF with Info dict metadata."""
    content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj

4 0 obj
<< /Title (Test Document)
   /Author (Test Author)
   /Subject (Test Subject)
   /Keywords (test, metadata)
   /Creator (TestApp 1.0)
   /Producer (TestProducer 2.0)
   /CreationDate (D:20230615123000)
   /ModDate (D:20230615140000)
>>
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000206 00000 n

trailer
<< /Size 5 /Root 1 0 R /Info 4 0 R >>
startxref
450
%%EOF"""
    return content


def build_pdf_no_metadata() -> bytes:
    """Build a minimal PDF with no Info dict."""
    return b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj

xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n

trailer
<< /Size 4 /Root 1 0 R >>
startxref
200
%%EOF"""


# -------------------------------------------------------------------------
# DOCX with core.xml metadata
# -------------------------------------------------------------------------


def build_docx_with_metadata() -> bytes:
    """Build a minimal DOCX with core.xml and app.xml metadata."""
    core_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Test Author</dc:creator>
  <cp:lastModifiedBy>Another User</cp:lastModifiedBy>
  <dc:title>Test Document Title</dc:title>
  <dc:subject>Test Subject</dc:subject>
  <dc:description>Test description</dc:description>
  <cp:keywords>test, docx, metadata</cp:keywords>
  <dcterms:created xsi:type="dcterms:W3CDTF">2023-06-15T12:30:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2023-06-15T14:00:00Z</dcterms:modified>
  <cp:revision>3</cp:revision>
</cp:coreProperties>"""

    app_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <AppVersion>16.0</AppVersion>
  <Company>Test Corp</Company>
  <Manager>Test Manager</Manager>
  <Pages>1</Pages>
  <Words>42</Words>
  <Revision>3</Revision>
</Properties>"""

    doc_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>Hello World</w:t></w:r></w:p></w:body>
</w:document>"""

    rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""

    content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml)
        zf.writestr("_rels/.rels", rels_xml)
        zf.writestr("word/document.xml", doc_xml)
        zf.writestr("docProps/core.xml", core_xml)
        zf.writestr("docProps/app.xml", app_xml)
    return buf.getvalue()


def build_docx_no_metadata() -> bytes:
    """Build a minimal DOCX with empty metadata."""
    empty_core = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:creator></dc:creator>
</cp:coreProperties>"""

    doc_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>No metadata</w:t></w:r></w:p></w:body>
</w:document>"""

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "")
        zf.writestr("word/document.xml", doc_xml)
        zf.writestr("docProps/core.xml", empty_core)
    return buf.getvalue()


# -------------------------------------------------------------------------
# MP3 with ID3v2 + ID3v1 tags
# -------------------------------------------------------------------------


def _encode_syncsafe(n: int) -> bytes:
    """Encode a 4-byte syncsafe integer."""
    out = bytearray(4)
    for i in range(3, -1, -1):
        out[i] = n & 0x7F
        n >>= 7
    return bytes(out)


def _id3v2_frame(frame_id: str, text: str) -> bytes:
    """Build an ID3v2.3 text frame."""
    # Encoding byte 0x00 = ISO-8859-1
    payload = b"\x00" + text.encode("latin-1", errors="replace")
    size = len(payload)
    return frame_id.encode("ascii") + struct.pack(">I", size) + b"\x00\x00" + payload


def build_mp3_with_tags() -> bytes:
    """Build a minimal MP3 with ID3v2 header + fake audio frame + ID3v1 footer."""
    # Build ID3v2.3 frames
    frames = (
        _id3v2_frame("TIT2", "Test Track")
        + _id3v2_frame("TPE1", "Test Artist")
        + _id3v2_frame("TALB", "Test Album")
        + _id3v2_frame("TYER", "2023")
        + _id3v2_frame("TCON", "Pop")
        + _id3v2_frame("COMM", "Test comment")
    )

    # ID3v2.3 header: "ID3" + version(2.3) + flags(0) + syncsafe size
    id3v2_size = _encode_syncsafe(len(frames))
    id3v2_header = b"ID3\x03\x00\x00" + id3v2_size
    id3v2 = id3v2_header + frames

    # Minimal MPEG frame (silence) — 4-byte header + 413 bytes zeros for 128kbps
    # Header: 0xFF 0xFB = MPEG1 Layer3 128kbps 44100Hz stereo
    mpeg_frame = b"\xff\xfb" + b"\x00" * 416

    # ID3v1 tag (128 bytes)
    def _pad(s: str, length: int) -> bytes:
        encoded = s.encode("latin-1", errors="replace")
        return encoded[:length].ljust(length, b"\x00")

    id3v1 = (
        b"TAG"
        + _pad("Test Track", 30)
        + _pad("Test Artist", 30)
        + _pad("Test Album", 30)
        + _pad("2023", 4)
        + _pad("Test comment", 28)
        + b"\x00\x01"  # track number marker + track 1
        + bytes([12])  # genre: Other
    )
    assert len(id3v1) == 128

    return id3v2 + mpeg_frame + id3v1


def build_mp3_no_tags() -> bytes:
    """Build a minimal MP3 with no ID3 tags (just MPEG frames)."""
    # Two minimal MPEG frames
    return b"\xff\xfb" + b"\x00" * 416


# -------------------------------------------------------------------------
# Write all fixtures to disk
# -------------------------------------------------------------------------


def build_all():
    fixtures = {
        "jpeg_with_gps.jpg": build_jpeg_with_gps,
        "jpeg_no_metadata.jpg": build_jpeg_no_metadata,
        "png_with_metadata.png": build_png_with_metadata,
        "png_no_metadata.png": build_png_no_metadata,
        "pdf_with_metadata.pdf": build_pdf_with_metadata,
        "pdf_no_metadata.pdf": build_pdf_no_metadata,
        "docx_with_metadata.docx": build_docx_with_metadata,
        "docx_no_metadata.docx": build_docx_no_metadata,
        "mp3_with_tags.mp3": build_mp3_with_tags,
        "mp3_no_tags.mp3": build_mp3_no_tags,
    }
    for name, builder in fixtures.items():
        path = os.path.join(FIXTURES_DIR, name)
        data = builder()
        with open(path, "wb") as fh:
            fh.write(data)
        print(f"  Written: {name} ({len(data):,} bytes)")


if __name__ == "__main__":
    build_all()
