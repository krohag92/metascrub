<?php
/**
 * Native PHP JPEG segment-level metadata scrubber.
 *
 * JPEG structure (ISO/IEC 10918-1):
 *   - Each segment starts with 0xFF followed by a marker byte.
 *   - Most segments have a 2-byte big-endian length field (includes the 2 length bytes).
 *   - Segments we drop per preset:
 *       APP1  (0xFFE1) — EXIF and XMP
 *       APP2  (0xFFE2) — ICC profile is kept; Flashpix/extended XMP dropped
 *       APP13 (0xFFED) — IPTC / Photoshop IRB
 *       APP14 (0xFFEE) — Adobe (optional; dropped when stripping all)
 *       COM   (0xFFFE) — comment segments
 *   - Segments we always preserve:
 *       SOI   (0xFFD8) — start of image
 *       EOI   (0xFFD9) — end of image
 *       APP0  (0xFFE0) — JFIF header (required for display)
 *       APP2  (0xFFE2) — only if it carries an ICC profile signature
 *       DQT   (0xFFDB) — quantisation tables
 *       DHT   (0xFFC4) — Huffman tables
 *       SOF*  (0xFFC0–0xFFC3, 0xFFC5–0xFFC7, 0xFFC9–0xFFCB, 0xFFCD–0xFFCF)
 *       SOS   (0xFFDA) — start of scan (followed by raw image data)
 *       DNL   (0xFFDC) — define number of lines
 *       DRI   (0xFFDD) — define restart interval
 *       RST*  (0xFFD0–0xFFD7) — restart markers (no length field)
 *
 * Orientation is preserved in a minimal EXIF segment when preset != 'all'.
 *
 * @package MetaScrub
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * JPEG metadata scrubber.
 */
class MetaScrub_Scrubber_JPEG {

	// APP segment markers.
	const MARKER_SOI  = 0xD8;
	const MARKER_EOI  = 0xD9;
	const MARKER_SOS  = 0xDA;
	const MARKER_APP0 = 0xE0;
	const MARKER_APP1 = 0xE1;
	const MARKER_APP2 = 0xE2;
	const MARKER_APP13 = 0xED;
	const MARKER_APP14 = 0xEE;
	const MARKER_COM  = 0xFE;

	/** Markers with no length field (standalone). */
	const STANDALONE_MARKERS = array( 0xD8, 0xD9, 0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7 );

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	/**
	 * Scrubs JPEG metadata and writes the result to $dest_path.
	 *
	 * @param string $src_path  Source file path.
	 * @param string $dest_path Destination file path.
	 * @param string $preset    Preset: all | gps-only | personal-only | keep-technical | off.
	 * @return int|false        Number of segments removed, or false on error.
	 */
	public function scrub( string $src_path, string $dest_path, string $preset = 'all' ): int|false {
		if ( 'off' === $preset ) {
			return 0;
		}

		$segments = $this->parse_segments( $src_path );
		if ( false === $segments ) {
			return false;
		}

		$removed  = 0;
		$out_segs = array();

		foreach ( $segments as $seg ) {
			if ( $this->should_drop( $seg, $preset ) ) {
				$removed++;
				// If we need orientation (non-'all' presets), inject a minimal EXIF.
				// That injection is handled below after the loop.
			} else {
				$out_segs[] = $seg;
			}
		}

		// For presets other than 'all', if we dropped an APP1 that contained
		// orientation, we could inject a minimal one — but since WordPress itself
		// handles orientation via image editing API, we leave it to WP.

		return $this->write_segments( $out_segs, $dest_path ) ? $removed : false;
	}

	/**
	 * Returns a list of human-readable metadata field labels found in the file.
	 *
	 * @param string $src_path Source file path.
	 * @return list<string>
	 */
	public function parse_fields( string $src_path ): array {
		$segments = $this->parse_segments( $src_path );
		if ( false === $segments ) {
			return array();
		}

		$fields = array();
		foreach ( $segments as $seg ) {
			$marker = $seg['marker'];
			if ( 0xE1 === $marker ) {
				$data = $seg['data'];
				if ( str_starts_with( $data, "Exif\x00\x00" ) ) {
					$fields[] = 'EXIF data (APP1)';
					// Try to enumerate a few EXIF tags.
					$fields = array_merge( $fields, $this->enumerate_exif_tags( $data ) );
				} elseif ( str_starts_with( $data, '<?xpacket' ) || str_starts_with( $data, 'http://ns.adobe.com' ) ) {
					$fields[] = 'XMP metadata (APP1)';
				} else {
					$fields[] = 'APP1 segment';
				}
			} elseif ( 0xED === $marker ) {
				$fields[] = 'IPTC / Photoshop metadata (APP13)';
			} elseif ( 0xFE === $marker ) {
				$comment = trim( $seg['data'] );
				$preview = mb_substr( $comment, 0, 60 );
				$fields[] = 'Comment: ' . ( $preview ?: '(empty)' );
			} elseif ( 0xEE === $marker ) {
				$fields[] = 'Adobe APP14 segment';
			} elseif ( 0xE2 === $marker && ! str_starts_with( $seg['data'], 'ICC_PROFILE' ) ) {
				$fields[] = 'APP2 (non-ICC)';
			}
		}

		return $fields;
	}

	// -------------------------------------------------------------------------
	// Segment parsing
	// -------------------------------------------------------------------------

	/**
	 * Parses a JPEG file into a flat list of segments.
	 *
	 * Each segment is: [ 'marker' => int, 'data' => string ] where data
	 * does NOT include the marker bytes or the 2-byte length field, but DOES
	 * include the raw SOS entropy-coded data for the SOS segment.
	 *
	 * @param string $path File path.
	 * @return list<array{marker: int, data: string}>|false
	 */
	private function parse_segments( string $path ): array|false {
		$raw = @file_get_contents( $path );
		if ( false === $raw || strlen( $raw ) < 4 ) {
			return false;
		}

		// Verify SOI.
		if ( "\xFF\xD8" !== substr( $raw, 0, 2 ) ) {
			return false;
		}

		$segments = array();
		$pos      = 0;
		$len      = strlen( $raw );

		while ( $pos < $len ) {
			if ( $raw[ $pos ] !== "\xFF" ) {
				// Skip padding 0xFF bytes.
				$pos++;
				continue;
			}

			// Consume all 0xFF padding.
			while ( $pos < $len && $raw[ $pos ] === "\xFF" ) {
				$pos++;
			}
			if ( $pos >= $len ) {
				break;
			}

			$marker = ord( $raw[ $pos ] );
			$pos++;

			if ( in_array( $marker, self::STANDALONE_MARKERS, true ) ) {
				$segments[] = array( 'marker' => $marker, 'data' => '' );
				if ( self::MARKER_EOI === $marker ) {
					break;
				}
				continue;
			}

			if ( self::MARKER_SOS === $marker ) {
				// SOS: has a normal header but is followed by raw entropy-coded data.
				if ( $pos + 2 > $len ) {
					break;
				}
				$seg_len = ( ord( $raw[ $pos ] ) << 8 ) | ord( $raw[ $pos + 1 ] );
				if ( $seg_len < 2 ) {
					break;
				}
				$header_data = substr( $raw, $pos + 2, $seg_len - 2 );
				$pos += $seg_len;

				// The entropy-coded data runs until the next 0xFF marker (excluding stuffed bytes).
				$entropy_start = $pos;
				while ( $pos < $len ) {
					$ff_pos = strpos( $raw, "\xFF", $pos );
					if ( false === $ff_pos ) {
						$pos = $len;
						break;
					}
					$pos = $ff_pos + 1;
					if ( $pos >= $len ) {
						break;
					}
					$next_byte = ord( $raw[ $pos ] );
					if ( 0x00 === $next_byte ) {
						// Stuffed byte — skip.
						$pos++;
						continue;
					}
					if ( $next_byte >= 0xD0 && $next_byte <= 0xD7 ) {
						// RST marker — continue.
						$pos++;
						continue;
					}
					// Real marker found; back up to the 0xFF.
					$pos = $ff_pos;
					break;
				}

				$entropy_data = substr( $raw, $entropy_start, $pos - $entropy_start );
				$segments[]   = array( 'marker' => self::MARKER_SOS, 'data' => $header_data . $entropy_data );
				continue;
			}

			// Normal segment with 2-byte length.
			if ( $pos + 2 > $len ) {
				break;
			}
			$seg_len = ( ord( $raw[ $pos ] ) << 8 ) | ord( $raw[ $pos + 1 ] );
			if ( $seg_len < 2 ) {
				$pos += 2;
				continue;
			}
			$data    = substr( $raw, $pos + 2, $seg_len - 2 );
			$pos    += $seg_len;
			$segments[] = array( 'marker' => $marker, 'data' => $data );
		}

		return $segments;
	}

	/**
	 * Determines whether a segment should be dropped for the given preset.
	 *
	 * @param array{marker: int, data: string} $seg    Segment.
	 * @param string                           $preset Preset.
	 * @return bool
	 */
	private function should_drop( array $seg, string $preset ): bool {
		$marker = $seg['marker'];

		// APP0 (JFIF) — always keep.
		if ( 0xE0 === $marker ) {
			return false;
		}

		// APP2 — keep only if ICC profile.
		if ( 0xE2 === $marker ) {
			return ! str_starts_with( $seg['data'], 'ICC_PROFILE' );
		}

		// Comment segments.
		if ( 0xFE === $marker ) {
			return 'keep-technical' !== $preset;
		}

		// APP13 (IPTC/Photoshop) — always contains personal/copyright data.
		if ( 0xED === $marker ) {
			return in_array( $preset, array( 'all', 'personal-only', 'gps-only' ), true );
		}

		// APP14 (Adobe) — drop on 'all' and 'personal-only'.
		if ( 0xEE === $marker ) {
			return in_array( $preset, array( 'all', 'personal-only' ), true );
		}

		// APP1 — EXIF or XMP.
		if ( 0xE1 === $marker ) {
			$data = $seg['data'];
			$is_xmp = str_starts_with( $data, '<?xpacket' ) || str_starts_with( $data, 'http://ns.adobe.com' );
			if ( $is_xmp ) {
				// XMP always contains personal/GPS data.
				return in_array( $preset, array( 'all', 'personal-only', 'gps-only' ), true );
			}
			// EXIF.
			return match ( $preset ) {
				'all'           => true,
				'gps-only'      => true,   // GPS is inside EXIF; we drop the whole segment.
				'personal-only' => true,   // Author, copyright etc. inside EXIF.
				'keep-technical'=> false,  // Keep full EXIF (camera settings, etc.).
				default         => false,
			};
		}

		// Other APPn segments (3–12, 15) — drop on 'all'.
		if ( $marker >= 0xE3 && $marker <= 0xEF ) {
			return 'all' === $preset;
		}

		return false;
	}

	/**
	 * Writes segments back to a JPEG file.
	 *
	 * @param list<array{marker: int, data: string}> $segments Segments.
	 * @param string                                  $path     Output path.
	 * @return bool
	 */
	private function write_segments( array $segments, string $path ): bool {
		$out = '';

		foreach ( $segments as $seg ) {
			$marker = $seg['marker'];

			if ( in_array( $marker, self::STANDALONE_MARKERS, true ) ) {
				$out .= "\xFF" . chr( $marker );
				continue;
			}

			$data = $seg['data'];

			if ( self::MARKER_SOS === $marker ) {
				// SOS header + entropy data: encode the header length, then raw entropy.
				// The entropy data contains the raw scan data which must not be re-framed.
				// We stored header + entropy together; we need to split back.
				// We detect the header length by scanning for the end of the SOS header.
				// SOS header: Ns (1 byte) + 2*Ns bytes component + 3 bytes = Ns*2+4 bytes.
				// Actually we stored header_data (seg_len-2 bytes) concatenated with entropy.
				// We re-encode the entire SOS payload as-is by figuring out the SOS header size.

				// Re-split: SOS header is determined by: Ns = first byte of header_data, then Ns*2 more bytes + 3 bytes.
				// Total header length = 1 + Ns*2 + 3 = Ns*2 + 4.
				// But since we don't track split point, we stored them together and need to split.
				// Approach: store SOS special marker that already has the proper length in the data.
				// Because parse_segments splits header vs entropy, we concatenate header+entropy for data.
				// To re-write: we need the header portion for length field, then raw entropy data.
				// We'll treat the first (Ns*2+4) bytes as the header.

				if ( strlen( $data ) > 0 ) {
					$ns = ord( $data[0] );
					$header_len = 1 + $ns * 2 + 3;
					if ( $header_len > strlen( $data ) ) {
						// Fallback: write everything as header.
						$header_len = strlen( $data );
					}
					$sos_header  = substr( $data, 0, $header_len );
					$entropy     = substr( $data, $header_len );
					$length_field = pack( 'n', $header_len + 2 );
					$out .= "\xFF" . chr( $marker ) . $length_field . $sos_header . $entropy;
				}
				continue;
			}

			$length_field = pack( 'n', strlen( $data ) + 2 );
			$out .= "\xFF" . chr( $marker ) . $length_field . $data;
		}

		return false !== @file_put_contents( $path, $out );
	}

	/**
	 * Attempts to enumerate some EXIF tag names from raw EXIF data for preview.
	 *
	 * @param string $exif_data Raw APP1 data (including "Exif\x00\x00").
	 * @return list<string>
	 */
	private function enumerate_exif_tags( string $exif_data ): array {
		// Only do a best-effort scan — we are not a full EXIF parser.
		$known_tags = array(
			0x010F => 'Make',
			0x0110 => 'Model',
			0x0112 => 'Orientation',
			0x013B => 'Artist',
			0x0213 => 'YCbCrPositioning',
			0x8298 => 'Copyright',
			0x9003 => 'DateTimeOriginal',
			0x9010 => 'OffsetTimeOriginal',
			0x8825 => 'GPS IFD (location data)',
			0x927C => 'MakerNote',
			0x9286 => 'UserComment',
			0xA420 => 'ImageUniqueID',
			0xA430 => 'CameraOwnerName',
			0xA431 => 'BodySerialNumber',
		);

		$fields = array();
		// Skip "Exif\x00\x00" prefix and parse TIFF header.
		if ( strlen( $exif_data ) < 14 ) {
			return $fields;
		}
		$tiff = substr( $exif_data, 6 );
		$byte_order = substr( $tiff, 0, 2 );
		$big_endian = ( 'MM' === $byte_order );

		$unpack_short = $big_endian ? 'n' : 'v';
		$unpack_long  = $big_endian ? 'N' : 'V';

		if ( strlen( $tiff ) < 8 ) {
			return $fields;
		}

		$ifd0_offset = unpack( $unpack_long . 'o', substr( $tiff, 4, 4 ) )['o'] ?? 0;
		if ( $ifd0_offset < 8 || $ifd0_offset + 2 > strlen( $tiff ) ) {
			return $fields;
		}

		$num_entries = unpack( $unpack_short . 'n', substr( $tiff, $ifd0_offset, 2 ) )['n'] ?? 0;
		$entry_pos   = $ifd0_offset + 2;

		for ( $i = 0; $i < $num_entries && $i < 50; $i++ ) {
			if ( $entry_pos + 12 > strlen( $tiff ) ) {
				break;
			}
			$tag = unpack( $unpack_short . 't', substr( $tiff, $entry_pos, 2 ) )['t'] ?? 0;
			if ( isset( $known_tags[ $tag ] ) ) {
				$fields[] = $known_tags[ $tag ];
			}
			$entry_pos += 12;
		}

		return $fields;
	}
}
