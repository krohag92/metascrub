// Synthetic minimal ISOBMFF (HEIC/AVIF) fixture for parser/scrubber tests.
//
// What we emit:
//   - ftyp box with chosen major brand and compatible-brands
//   - meta box containing:
//       hdlr 'pict'
//       iinf with one infe pointing at an EXIF item (id=1) and one infe for a
//         hvc1/av01 image item (id=2)
//       iloc with absolute offsets for both items into the mdat
//   - mdat carrying:
//       4-byte EXIF prefix (BE) + a real minimal TIFF block with Artist tag
//       then a fake image payload (1 byte)
//
// All boxes are 32-bit-size form. We deliberately keep iinf/iloc the simplest
// possible layout because we only need it for our test parser.

function u32be(v: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = (v >>> 24) & 0xff;
  b[1] = (v >>> 16) & 0xff;
  b[2] = (v >>> 8) & 0xff;
  b[3] = v & 0xff;
  return b;
}
function u16be(v: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = (v >>> 8) & 0xff;
  b[1] = v & 0xff;
  return b;
}
function ascii(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}
function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
function box(type: string, payload: Uint8Array): Uint8Array {
  // 32-bit size form.
  return concat([u32be(8 + payload.length), ascii(type), payload]);
}

function fullBoxPayload(version: number, flags: number, body: Uint8Array): Uint8Array {
  // FullBox = 4-byte (version + 24-bit flags) prefix + body
  const prefix = new Uint8Array(4);
  prefix[0] = version & 0xff;
  prefix[1] = (flags >>> 16) & 0xff;
  prefix[2] = (flags >>> 8) & 0xff;
  prefix[3] = flags & 0xff;
  return concat([prefix, body]);
}

function ftyp(major: string, compats: string[]): Uint8Array {
  const minorVersion = u32be(0);
  const compat = concat(compats.map(ascii));
  return box('ftyp', concat([ascii(major), minorVersion, compat]));
}

function hdlr(handlerType: string): Uint8Array {
  // FullBox v0 flags 0; pre_defined(4 zero) + handler_type + reserved(3*4) + name (UTF-8 nul-terminated)
  const body = concat([new Uint8Array(4), ascii(handlerType), new Uint8Array(12), ascii('pict\0')]);
  return box('hdlr', fullBoxPayload(0, 0, body));
}

function infe(id: number, type: string, name: string): Uint8Array {
  // FullBox v2 flags 0; u16 item_ID; u16 item_protection_index; u32 item_type;
  // null-terminated item_name. (For type !== 'mime' we don't need extension URI)
  const body = concat([u16be(id), u16be(0), ascii(type), ascii(name + '\0')]);
  return box('infe', fullBoxPayload(2, 0, body));
}

function iinfBox(entries: Uint8Array[]): Uint8Array {
  // FullBox v0 flags 0; u16 entry_count; <infe boxes...>
  const body = concat([u16be(entries.length), concat(entries)]);
  return box('iinf', fullBoxPayload(0, 0, body));
}

interface IlocItem {
  id: number;
  /** Absolute offset where this item's data starts (we'll patch later). */
  offset: number;
  length: number;
}

function ilocBox(items: IlocItem[]): Uint8Array {
  // v0 layout:
  //   FullBox header (4 bytes)
  //   byte: offset_size(4) << 4 | length_size(4)
  //   byte: base_offset_size(4) << 4 | reserved(4)
  //   u16 item_count
  //   for each item:
  //     u16 item_ID
  //     u16 data_reference_index
  //     base_offset (size = base_offset_size; we use 0)
  //     u16 extent_count
  //     for each extent: extent_offset (offset_size), extent_length (length_size)
  // We'll use offset_size=4, length_size=4, base_offset_size=0.
  const headerByte1 = (4 << 4) | 4;
  const headerByte2 = (0 << 4) | 0;
  const itemBufs: Uint8Array[] = [];
  for (const it of items) {
    itemBufs.push(
      concat([
        u16be(it.id),
        u16be(0),
        u16be(1), // extent_count = 1
        u32be(it.offset),
        u32be(it.length),
      ]),
    );
  }
  const body = concat([
    Uint8Array.from([headerByte1, headerByte2]),
    u16be(items.length),
    concat(itemBufs),
  ]);
  return box('iloc', fullBoxPayload(0, 0, body));
}

/** Minimal little-endian TIFF with an Artist tag. */
function buildArtistTiffLE(artist: string): Uint8Array {
  const ascii0 = (s: string): Uint8Array => {
    const out = new Uint8Array(s.length + 1);
    for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
    return out;
  };
  const data = ascii0(artist);
  const headerSize = 8;
  const ifdSize = 2 + 12 + 4; // 1 entry + nextIFD
  let poolOffset = headerSize + ifdSize;
  const externalOffset = data.length > 4 ? poolOffset : null;
  if (externalOffset !== null) poolOffset += data.length;
  const total = poolOffset;
  const out = new Uint8Array(total);
  out[0] = 0x49;
  out[1] = 0x49;
  out[2] = 0x2a;
  out[3] = 0x00;
  // IFD0 offset = 8
  out[4] = 8;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  // count = 1
  out[8] = 1;
  out[9] = 0;
  // entry: tag=0x013b Artist, type=2 ASCII, count=data.length, value/offset
  out[10] = 0x3b;
  out[11] = 0x01;
  out[12] = 2;
  out[13] = 0;
  // count (uint32 LE)
  out[14] = data.length & 0xff;
  out[15] = (data.length >>> 8) & 0xff;
  out[16] = (data.length >>> 16) & 0xff;
  out[17] = (data.length >>> 24) & 0xff;
  if (externalOffset !== null) {
    out[18] = externalOffset & 0xff;
    out[19] = (externalOffset >>> 8) & 0xff;
    out[20] = (externalOffset >>> 16) & 0xff;
    out[21] = (externalOffset >>> 24) & 0xff;
    out.set(data, externalOffset);
  } else {
    out[18] = data[0] ?? 0;
    out[19] = data[1] ?? 0;
    out[20] = data[2] ?? 0;
    out[21] = data[3] ?? 0;
  }
  // nextIFD = 0
  out[22] = 0;
  out[23] = 0;
  out[24] = 0;
  out[25] = 0;
  return out;
}

export interface IsobmffBuildOpts {
  /** Major brand. Defaults to 'heic'. */
  major?: string;
  /** Compatible brands. Defaults to ['mif1', 'heic']. */
  compat?: string[];
  /** Embed an EXIF item containing this Artist value. */
  exifArtist?: string;
}

export function makeIsobmff(opts: IsobmffBuildOpts = {}): Uint8Array {
  const major = opts.major ?? 'heic';
  const compats = opts.compat ?? ['mif1', 'heic'];

  // Build the items: a fake image (1 byte placeholder) and optional EXIF.
  const imageBytes = new Uint8Array([0xaa]);
  const exifPrefix = new Uint8Array([0, 0, 0, 0]); // 4-byte BE prefix = 0
  const exifTiff = opts.exifArtist !== undefined ? buildArtistTiffLE(opts.exifArtist) : null;
  const exifBytes = exifTiff !== null ? concat([exifPrefix, exifTiff]) : null;

  // We need to know the absolute offset of each item in the final file.
  // Build all the boxes EXCEPT iloc first, so we know mdat's offset.
  const ftypBox = ftyp(major, compats);
  const hdlrBox = hdlr('pict');
  const infes: Uint8Array[] = [];
  if (exifBytes) infes.push(infe(1, 'Exif', 'Exif metadata'));
  infes.push(infe(2, 'hvc1', 'HEVC image'));
  const iinf = iinfBox(infes);

  // We don't know iloc yet because it has to encode mdat offsets. But the size
  // of iloc depends only on the number of items, which is fixed → we can
  // compute it without knowing offsets first.

  // Provisional sizes:
  //   meta box = FullBox(4) + hdlr + iinf + iloc
  //   mdat box = 8-byte header + (exifBytes? + imageBytes)
  // We'll compute layout assuming offsets, then fill them in.

  const ilocItemsCount = (exifBytes ? 1 : 0) + 1;
  const ilocBodySize = 2 + 2 + ilocItemsCount * (2 + 2 + 2 + 4 + 4); // see ilocBox
  const ilocSize = 8 + 4 + ilocBodySize; // box header + FullBox + body
  const metaPayloadSize = 4 + hdlrBox.length + iinf.length + ilocSize;
  const metaSize = 8 + metaPayloadSize;
  const mdatHeaderSize = 8;
  const mdatPayloadSize = (exifBytes ? exifBytes.length : 0) + imageBytes.length;
  const mdatSize = mdatHeaderSize + mdatPayloadSize;

  const ftypEnd = ftypBox.length;
  const metaStart = ftypEnd;
  const mdatStart = metaStart + metaSize;
  const mdatPayloadStart = mdatStart + mdatHeaderSize;

  const exifAbsoluteOffset = exifBytes ? mdatPayloadStart : 0;
  const imageAbsoluteOffset = mdatPayloadStart + (exifBytes ? exifBytes.length : 0);

  const items: IlocItem[] = [];
  if (exifBytes) items.push({ id: 1, offset: exifAbsoluteOffset, length: exifBytes.length });
  items.push({ id: 2, offset: imageAbsoluteOffset, length: imageBytes.length });
  const iloc = ilocBox(items);
  if (iloc.length !== ilocSize) {
    throw new Error(`iloc size mismatch: predicted ${ilocSize}, actual ${iloc.length}`);
  }

  const metaPayload = concat([
    Uint8Array.from([0, 0, 0, 0]), // FullBox version+flags for meta itself
    hdlrBox,
    iinf,
    iloc,
  ]);
  const metaBox = box('meta', metaPayload);
  if (metaBox.length !== metaSize) {
    throw new Error(`meta size mismatch: predicted ${metaSize}, actual ${metaBox.length}`);
  }
  const mdatPayload = exifBytes ? concat([exifBytes, imageBytes]) : imageBytes;
  const mdatBox = box('mdat', mdatPayload);
  if (mdatBox.length !== mdatSize) {
    throw new Error(`mdat size mismatch: predicted ${mdatSize}, actual ${mdatBox.length}`);
  }
  return concat([ftypBox, metaBox, mdatBox]);
}
