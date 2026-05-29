// Synthetic EBML (Matroska / WebM) fixture builder.
//
// Produces a minimal valid stream:
//   EBML header (with DocType)
//   Segment
//     Info (Title, MuxingApp, WritingApp)
//     Tags (Tag(SimpleTag(TagName, TagString)))
//
// No Cluster / Tracks elements — not required for parsing tests.

import { concatBytes, textEncoder } from '../../src/utils/bytes.js';
import { ID, encodeId, encodeVintSize } from '../../src/formats/_ebml.js';

function elem(id: number, payload: Uint8Array): Uint8Array {
  return concatBytes([encodeId(id), encodeVintSize(payload.length), payload]);
}

function stringElem(id: number, s: string): Uint8Array {
  return elem(id, textEncoder.encode(s));
}

export interface EbmlBuildOpts {
  docType?: string; // "matroska" or "webm"
  title?: string;
  muxingApp?: string;
  writingApp?: string;
  /** [name, value] pairs for SimpleTag children of one Tag element. */
  simpleTags?: Array<[string, string]>;
}

function buildHeader(docType: string): Uint8Array {
  const children: Uint8Array[] = [];
  // EBMLVersion = 1
  children.push(elem(0x4286, Uint8Array.from([0x01])));
  // EBMLReadVersion = 1
  children.push(elem(0x42f7, Uint8Array.from([0x01])));
  // EBMLMaxIDLength = 4
  children.push(elem(0x42f2, Uint8Array.from([0x04])));
  // EBMLMaxSizeLength = 8
  children.push(elem(0x42f3, Uint8Array.from([0x08])));
  // DocType
  children.push(stringElem(ID.DocType, docType));
  // DocTypeVersion = 4
  children.push(elem(0x4287, Uint8Array.from([0x04])));
  // DocTypeReadVersion = 2
  children.push(elem(0x4285, Uint8Array.from([0x02])));
  return elem(ID.EBML, concatBytes(children));
}

function buildInfo(opts: EbmlBuildOpts): Uint8Array {
  const children: Uint8Array[] = [];
  // TimecodeScale (0x2AD7B1) = 1_000_000 (1ms) — required.
  const timecode = new Uint8Array(3);
  timecode[0] = (1000000 >> 16) & 0xff;
  timecode[1] = (1000000 >> 8) & 0xff;
  timecode[2] = 1000000 & 0xff;
  children.push(elem(0x2ad7b1, timecode));
  if (opts.title !== undefined) children.push(stringElem(ID.Title, opts.title));
  if (opts.muxingApp !== undefined) children.push(stringElem(ID.MuxingApp, opts.muxingApp));
  if (opts.writingApp !== undefined) children.push(stringElem(ID.WritingApp, opts.writingApp));
  return elem(ID.Info, concatBytes(children));
}

function buildTags(simpleTags: Array<[string, string]>): Uint8Array {
  const tagChildren: Uint8Array[] = [];
  // Targets (required for Tag) — empty/default.
  tagChildren.push(elem(ID.Targets, new Uint8Array(0)));
  for (const [name, value] of simpleTags) {
    const stChildren: Uint8Array[] = [
      stringElem(ID.TagName, name),
      stringElem(ID.TagString, value),
    ];
    tagChildren.push(elem(ID.SimpleTag, concatBytes(stChildren)));
  }
  const tag = elem(ID.Tag, concatBytes(tagChildren));
  return elem(ID.Tags, tag);
}

export function makeEbml(opts: EbmlBuildOpts = {}): Uint8Array {
  const docType = opts.docType ?? 'matroska';
  const header = buildHeader(docType);
  const segmentChildren: Uint8Array[] = [buildInfo(opts)];
  if (opts.simpleTags && opts.simpleTags.length) {
    segmentChildren.push(buildTags(opts.simpleTags));
  }
  const segment = elem(ID.Segment, concatBytes(segmentChildren));
  return concatBytes([header, segment]);
}
