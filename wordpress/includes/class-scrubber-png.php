<?php
/**
 * Native PHP PNG chunk-level metadata scrubber.
 *
 * PNG structure (ISO/IEC 15948):
 *   - 8-byte signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
 *   - Chunks: 4-byte length (data only) | 4-byte type | N-byte data | 4-byte CRC32
 *
 * Chunks we drop per preset:
 *   tEXt — uncompressed text (key + NUL + value)
 *   zTXt — compressed text
 *   iTXt — international text (UTF-8, may contain XMP)
 *   eXIf — EXIF metadata (PNG 1.6+)
 *   tIME — last-modified timestamp
 *
 * Chunks always preserved:
 *   IHDR — image header (must be first)
 *   PLTE — palette
 *   IDAT — image data
 *   IEND — end marker (must be last)
 *   bKGD, cHRM, gAMA, hIST, pHYs, sBIT, sRGB, sPLT, tRNS — display/rendering
 *   iCCP — ICC colour profile
 *
 * CRC32 for untouched chunks is preserved from source. We do NOT recompute CRC32
 * on kept chunks (they are byte-for-byte identical to source). The 4-byte CRC in
 * each kept chunk is passed through unchanged.
 *
 * @package MetaScrub
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * PNG metadata scrubber.
 */
class MetaScrub_Scrubber_PNG {

	/** PNG file signature. */
	const SIGNATURE = "\x89PNG\r\n\x1a\n";

	/** Metadata chunk types to consider removing. */
	const META_CHUNKS = array( 'tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME' );

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	/**
	 * Scrubs PNG metadata and writes the result to $dest_path.
	 *
	 * @param string $src_path  Source file path.
	 * @param string $dest_path Destination file path.
	 * @param string $preset    Preset: all | gps-only | personal-only | keep-technical | off.
	 * @return int|false        Number of chunks removed, or false on error.
	 */
	public function scrub( string $src_path, string $dest_path, string $preset = 'all' ): int|false {
		if ( 'off' === $preset ) {
			return 0;
		}

		$chunks = $this->parse_chunks( $src_path );
		if ( false === $chunks ) {
			return false;
		}

		$removed     = 0;
		$out_chunks  = array();

		foreach ( $chunks as $chunk ) {
			if ( $this->should_drop( $chunk, $preset ) ) {
				$removed++;
			} else {
				$out_chunks[] = $chunk;
			}
		}

		return $this->write_chunks( $out_chunks, $dest_path ) ? $removed : false;
	}

	/**
	 * Returns a list of human-readable metadata field labels found in the file.
	 *
	 * @param string $src_path Source file path.
	 * @return list<string>
	 */
	public function parse_fields( string $src_path ): array {
		$chunks = $this->parse_chunks( $src_path );
		if ( false === $chunks ) {
			return array();
		}

		$fields = array();
		foreach ( $chunks as $chunk ) {
			$type = $chunk['type'];

			if ( 'tEXt' === $type ) {
				$nul_pos = strpos( $chunk['data'], "\x00" );
				$keyword = $nul_pos !== false ? substr( $chunk['data'], 0, $nul_pos ) : $type;
				$fields[] = 'Text: ' . $keyword;
			} elseif ( 'zTXt' === $type ) {
				$nul_pos = strpos( $chunk['data'], "\x00" );
				$keyword = $nul_pos !== false ? substr( $chunk['data'], 0, $nul_pos ) : $type;
				$fields[] = 'Compressed text: ' . $keyword;
			} elseif ( 'iTXt' === $type ) {
				$nul_pos = strpos( $chunk['data'], "\x00" );
				$keyword = $nul_pos !== false ? substr( $chunk['data'], 0, $nul_pos ) : $type;
				if ( str_contains( strtolower( $keyword ), 'xmp' ) ) {
					$fields[] = 'XMP metadata (iTXt)';
				} else {
					$fields[] = 'International text: ' . $keyword;
				}
			} elseif ( 'eXIf' === $type ) {
				$fields[] = 'EXIF data (eXIf chunk)';
			} elseif ( 'tIME' === $type ) {
				if ( strlen( $chunk['data'] ) >= 7 ) {
					$year   = unpack( 'n', substr( $chunk['data'], 0, 2 ) )[1];
					$month  = ord( $chunk['data'][2] );
					$day    = ord( $chunk['data'][3] );
					$fields[] = sprintf( 'Last modified: %04d-%02d-%02d', $year, $month, $day );
				} else {
					$fields[] = 'Last modified timestamp (tIME)';
				}
			}
		}

		return $fields;
	}

	// -------------------------------------------------------------------------
	// Chunk parsing
	// -------------------------------------------------------------------------

	/**
	 * Parses a PNG file into a list of chunks.
	 *
	 * Each chunk: [ 'type' => string(4), 'data' => string, 'crc' => string(4) ]
	 * The CRC field holds the raw 4 bytes from the source file.
	 *
	 * @param string $path File path.
	 * @return list<array{type: string, data: string, crc: string}>|false
	 */
	private function parse_chunks( string $path ): array|false {
		$raw = @file_get_contents( $path );
		if ( false === $raw || strlen( $raw ) < 8 ) {
			return false;
		}

		// Verify PNG signature.
		if ( substr( $raw, 0, 8 ) !== self::SIGNATURE ) {
			return false;
		}

		$chunks = array();
		$pos    = 8;
		$len    = strlen( $raw );

		while ( $pos + 12 <= $len ) {
			$data_len = unpack( 'N', substr( $raw, $pos, 4 ) )[1];
			$pos += 4;

			if ( $pos + 4 + $data_len + 4 > $len ) {
				// Truncated chunk.
				break;
			}

			$type = substr( $raw, $pos, 4 );
			$pos += 4;

			$data = substr( $raw, $pos, $data_len );
			$pos += $data_len;

			$crc = substr( $raw, $pos, 4 );
			$pos += 4;

			$chunks[] = array(
				'type' => $type,
				'data' => $data,
				'crc'  => $crc,
			);

			if ( 'IEND' === $type ) {
				break;
			}
		}

		return $chunks;
	}

	/**
	 * Determines whether a chunk should be dropped.
	 *
	 * @param array{type: string, data: string, crc: string} $chunk  Chunk.
	 * @param string                                          $preset Preset.
	 * @return bool
	 */
	private function should_drop( array $chunk, string $preset ): bool {
		$type = $chunk['type'];

		if ( ! in_array( $type, self::META_CHUNKS, true ) ) {
			return false;
		}

		// eXIf — EXIF data embedded in PNG.
		if ( 'eXIf' === $type ) {
			return in_array( $preset, array( 'all', 'gps-only', 'personal-only' ), true );
		}

		// tIME — last-modified timestamp (technical metadata).
		if ( 'tIME' === $type ) {
			return 'keep-technical' !== $preset;
		}

		// Text chunks: tEXt, zTXt, iTXt.
		// These often contain author info, copyright, software, XMP.
		if ( in_array( $type, array( 'tEXt', 'zTXt', 'iTXt' ), true ) ) {
			// Read the keyword.
			$nul_pos = strpos( $chunk['data'], "\x00" );
			$keyword = $nul_pos !== false ? strtolower( substr( $chunk['data'], 0, $nul_pos ) ) : '';

			// Technical-only keywords we might keep.
			$technical_keywords = array( 'icc profile', 'gamma', 'gamma correction' );

			if ( 'keep-technical' === $preset && in_array( $keyword, $technical_keywords, true ) ) {
				return false;
			}

			return match ( $preset ) {
				'all'            => true,
				'gps-only'       => str_contains( $keyword, 'gps' ) || str_contains( $keyword, 'location' ),
				'personal-only'  => true,   // author, copyright, comment all personal.
				'keep-technical' => true,   // anything not in $technical_keywords.
				default          => false,
			};
		}

		return false;
	}

	/**
	 * Writes chunks to a PNG file.
	 *
	 * @param list<array{type: string, data: string, crc: string}> $chunks Chunks.
	 * @param string                                                $path   Output path.
	 * @return bool
	 */
	private function write_chunks( array $chunks, string $path ): bool {
		$out = self::SIGNATURE;

		foreach ( $chunks as $chunk ) {
			$data_len = strlen( $chunk['data'] );
			$out .= pack( 'N', $data_len );
			$out .= $chunk['type'];
			$out .= $chunk['data'];
			// Write the original CRC (chunk data unchanged, CRC is still valid).
			$out .= $chunk['crc'];
		}

		return false !== @file_put_contents( $path, $out );
	}
}
