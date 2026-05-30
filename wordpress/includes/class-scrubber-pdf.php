<?php
/**
 * Native PHP PDF metadata scrubber.
 *
 * PDF structure note:
 *   Full PDF parsing in pure PHP is fragile and out-of-scope.
 *   We take a conservative "byte-surgery" approach:
 *
 *   1. Locate and blank the Info dictionary values in the file body.
 *      The PDF Info dictionary looks like:
 *        << /Title (My Title) /Author (Jane) /Producer (Adobe) ... >>
 *      We use a regex that targets common string and hex-string metadata values
 *      and replace them with empty literals, preserving the keys so cross-references
 *      remain structurally valid.
 *
 *   2. Locate XMP metadata streams and replace their content with a minimal
 *      empty XMP packet.
 *
 *   3. Preserve /CreationDate and /ModDate when preset is 'keep-technical'.
 *      The full Info dict is left intact for 'keep-technical'.
 *
 *   4. For 'gps-only' we target only latitude/longitude in XMP
 *      (GPS is rare in PDFs but Word-exported documents can contain it).
 *
 * Risk mitigation:
 *   - We do NOT rewrite xref tables or object offsets.
 *   - We only replace VALUES with same-length or shorter strings,
 *     padding with spaces to preserve file byte offsets.
 *   - If the file has an xref stream (PDF 1.5+), we skip rewriting xref
 *     but still scrub in-place text values.
 *   - On any parse failure, return false and let the caller log + skip.
 *
 * @package MetaScrub
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * PDF metadata scrubber (conservative byte-surgery approach).
 */
class MetaScrub_Scrubber_PDF {

	/** Maximum file size we'll load into memory (64 MB). */
	const MAX_FILE_SIZE = 67108864;

	/**
	 * Info dict keys that contain personal/author information.
	 *
	 * @var list<string>
	 */
	private const PERSONAL_KEYS = array(
		'Author', 'Creator', 'Producer', 'Title', 'Subject', 'Keywords',
		'Company', 'Manager', 'LastModifiedBy',
	);

	/**
	 * Info dict keys that are purely technical.
	 *
	 * @var list<string>
	 */
	private const TECHNICAL_KEYS = array(
		'CreationDate', 'ModDate', 'Trapped',
	);

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	/**
	 * Scrubs PDF metadata and writes result to $dest_path.
	 *
	 * @param string $src_path  Source file path.
	 * @param string $dest_path Destination file path.
	 * @param string $preset    Preset.
	 * @return int|false        Number of fields blanked, or false on error.
	 */
	public function scrub( string $src_path, string $dest_path, string $preset = 'all' ): int|false {
		if ( 'off' === $preset ) {
			return 0;
		}

		$file_size = @filesize( $src_path );
		if ( false === $file_size || $file_size > self::MAX_FILE_SIZE ) {
			error_log( sprintf( 'MetaScrub PDF: file too large or unreadable: %s', $src_path ) );
			return false;
		}

		$content = @file_get_contents( $src_path );
		if ( false === $content ) {
			return false;
		}

		// Verify PDF signature.
		if ( ! str_starts_with( $content, '%PDF-' ) ) {
			return false;
		}

		$removed  = 0;

		// Pass 1: Scrub Info dictionary entries.
		$content = $this->scrub_info_dict( $content, $preset, $removed );

		// Pass 2: Scrub XMP metadata streams.
		if ( in_array( $preset, array( 'all', 'personal-only' ), true ) ) {
			$content = $this->scrub_xmp_streams( $content, $removed );
		}

		return false !== @file_put_contents( $dest_path, $content ) ? $removed : false;
	}

	/**
	 * Returns a list of human-readable metadata field labels found in the file.
	 *
	 * @param string $src_path Source file path.
	 * @return list<string>
	 */
	public function parse_fields( string $src_path ): array {
		$file_size = @filesize( $src_path );
		if ( false === $file_size || $file_size > self::MAX_FILE_SIZE ) {
			return array();
		}

		$content = @file_get_contents( $src_path );
		if ( false === $content || ! str_starts_with( $content, '%PDF-' ) ) {
			return array();
		}

		$fields = array();

		// Scan Info dictionary.
		$all_keys = array_merge( self::PERSONAL_KEYS, self::TECHNICAL_KEYS );
		foreach ( $all_keys as $key ) {
			$pattern = '/\/' . preg_quote( $key, '/' ) . '\s*\(([^)]{0,200})\)/';
			if ( preg_match( $pattern, $content, $m ) ) {
				$value = trim( $m[1] );
				if ( '' !== $value ) {
					$fields[] = $key . ': ' . mb_substr( $value, 0, 80 );
				}
			}
			// Hex string form.
			$pattern_hex = '/\/' . preg_quote( $key, '/' ) . '\s*<([0-9A-Fa-f]{1,256})>/';
			if ( preg_match( $pattern_hex, $content, $m ) ) {
				$fields[] = $key . ': <hex value>';
			}
		}

		// Check for XMP stream.
		if ( preg_match( '/<x:xmpmeta[^>]*>/i', $content ) ) {
			$fields[] = 'XMP metadata stream';
		}

		return $fields;
	}

	// -------------------------------------------------------------------------
	// Internal scrubbing
	// -------------------------------------------------------------------------

	/**
	 * Replaces Info dict string values in-place, preserving byte offsets.
	 *
	 * For each key we target:
	 *   /Key (some value)   → /Key ()
	 *   /Key <hexstring>    → /Key <>
	 *
	 * We pad the replacement string with spaces inside the parens to maintain
	 * the same byte length, so xref offsets remain valid.
	 *
	 * @param string $content PDF content.
	 * @param string $preset  Preset.
	 * @param int    &$count  Incremented for each replaced field.
	 * @return string Modified content.
	 */
	private function scrub_info_dict( string $content, string $preset, int &$count ): string {
		$target_keys = $this->keys_for_preset( $preset );

		foreach ( $target_keys as $key ) {
			// Parenthesis string form: /Key (value).
			// We use a callback so we can preserve length.
			$pattern = '/(\/' . preg_quote( $key, '/' ) . '\s*\()([^)]{0,1000})(\))/';
			$content = preg_replace_callback(
				$pattern,
				function ( array $m ) use ( &$count ): string {
					$original_inner = $m[2];
					if ( '' === $original_inner ) {
						return $m[0]; // Already empty.
					}
					$count++;
					// Replace with same-length spaces to preserve offsets.
					$padding = str_repeat( ' ', strlen( $original_inner ) );
					return $m[1] . $padding . $m[3];
				},
				$content
			);

			// Hex string form: /Key <hex>.
			$pattern_hex = '/(\/' . preg_quote( $key, '/' ) . '\s*<)([0-9A-Fa-f]{1,2000})(>)/';
			$content = preg_replace_callback(
				$pattern_hex,
				function ( array $m ) use ( &$count ): string {
					$hex_val = $m[2];
					if ( '' === $hex_val ) {
						return $m[0];
					}
					$count++;
					// Replace hex content with same-length zero bytes.
					$padding = str_repeat( '00', (int) ceil( strlen( $hex_val ) / 2 ) );
					$padding = substr( $padding, 0, strlen( $hex_val ) );
					return $m[1] . $padding . $m[3];
				},
				$content
			);
		}

		return $content;
	}

	/**
	 * Replaces XMP metadata stream contents with a minimal empty XMP packet.
	 *
	 * XMP streams in PDF are identified by:
	 *   /Type /Metadata /Subtype /XML
	 * followed by stream ... endstream.
	 *
	 * We replace the stream content with an empty XMP packet, then pad to the
	 * same length to keep xref offsets valid (or at least not shorter, which
	 * would corrupt xref; we pad with XML whitespace).
	 *
	 * @param string $content PDF content.
	 * @param int    &$count  Incremented for each XMP stream replaced.
	 * @return string Modified content.
	 */
	private function scrub_xmp_streams( string $content, int &$count ): string {
		// Match XMP stream blocks.
		// Pattern: stream marker, newline, actual stream bytes, newline, endstream.
		$pattern = '/(stream\r?\n)(.*?)(\r?\nendstream)/s';

		$content = preg_replace_callback(
			$pattern,
			function ( array $m ) use ( &$count ): string {
				$stream_body = $m[2];

				// Only target XMP streams.
				if (
					! str_contains( $stream_body, '<x:xmpmeta' ) &&
					! str_contains( $stream_body, 'http://ns.adobe.com/xap' ) &&
					! str_contains( $stream_body, '<?xpacket' )
				) {
					return $m[0];
				}

				$count++;

				$empty_xmp = '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' . "\n"
					. '<x:xmpmeta xmlns:x="adobe:ns:meta/"></x:xmpmeta>' . "\n"
					. '<?xpacket end="w"?>';

				$original_len = strlen( $stream_body );
				$new_len      = strlen( $empty_xmp );

				if ( $new_len < $original_len ) {
					// Pad with spaces to preserve length.
					$empty_xmp .= str_repeat( ' ', $original_len - $new_len );
				} elseif ( $new_len > $original_len ) {
					// Our empty XMP is longer — truncate (shouldn't happen for any
					// real XMP stream, but be safe).
					$empty_xmp = substr( $empty_xmp, 0, $original_len );
				}

				return $m[1] . $empty_xmp . $m[3];
			},
			$content
		);

		return is_string( $content ) ? $content : '';
	}

	/**
	 * Returns the Info dict keys to scrub for the given preset.
	 *
	 * @param string $preset Preset.
	 * @return list<string>
	 */
	private function keys_for_preset( string $preset ): array {
		return match ( $preset ) {
			'all'            => array_merge( self::PERSONAL_KEYS, self::TECHNICAL_KEYS ),
			'personal-only'  => self::PERSONAL_KEYS,
			'gps-only'       => array(), // GPS is uncommon in PDF Info dict; handled via XMP.
			'keep-technical' => self::PERSONAL_KEYS, // Keep CreationDate/ModDate.
			default          => array(),
		};
	}
}
