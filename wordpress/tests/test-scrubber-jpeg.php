<?php
/**
 * Tests for MetaScrub_Scrubber_JPEG.
 *
 * Builds synthetic JPEG data in memory, calls the scrubber, and
 * asserts segment presence/absence.
 *
 * Run: php tests/test-scrubber-jpeg.php
 *
 * @package MetaScrub
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

echo "=== MetaScrub_Scrubber_JPEG tests ===\n";

// ---------------------------------------------------------------------------
// Helpers: build synthetic JPEG segments
// ---------------------------------------------------------------------------

/**
 * Builds a raw JPEG marker + length + data segment.
 *
 * @param int    $marker  1-byte marker value (e.g. 0xE1 for APP1).
 * @param string $data    Segment payload (NOT including length field).
 * @return string Raw bytes.
 */
function make_jpeg_segment( int $marker, string $data ): string {
	$length = strlen( $data ) + 2; // Length field includes itself.
	return "\xFF" . chr( $marker ) . pack( 'n', $length ) . $data;
}

/**
 * Builds a minimal valid JPEG with the given extra segments inserted after
 * the SOI (start of image).
 *
 * Structure: SOI | APP0(JFIF) | [extra segments] | SOS | EOI
 *
 * @param list<string> $extra_segments Already-encoded segment bytes.
 * @return string Raw JPEG bytes.
 */
function make_jpeg( array $extra_segments = array() ): string {
	$soi = "\xFF\xD8"; // SOI — no length field.

	// Minimal JFIF APP0 segment.
	$app0_data = "JFIF\x00"     // Identifier.
		. "\x01\x01"           // Version 1.1.
		. "\x00"               // Pixel aspect ratio (no units).
		. "\x00\x01\x00\x01"  // X/Y pixel density.
		. "\x00\x00";         // Thumbnail dimensions.
	$app0 = make_jpeg_segment( 0xE0, $app0_data );

	// Minimal SOS (start of scan) with dummy entropy data.
	// SOS header: Ns=1 component, 1 component spec (2 bytes), 3 tail bytes = 6 bytes.
	$sos_header = "\x01"        // Ns = 1.
		. "\x01\x00"            // Component 1: selector=1, DC/AC table 0/0.
		. "\x00\x3F\x00";      // Ss=0, Se=63, Ah/Al=0.
	$sos = "\xFF\xDA" . pack( 'n', strlen( $sos_header ) + 2 ) . $sos_header;
	$entropy = "\x7F\xAB\xCD"; // Dummy entropy-coded data.

	$eoi = "\xFF\xD9"; // EOI — no length field.

	return $soi . $app0 . implode( '', $extra_segments ) . $sos . $entropy . $eoi;
}

/**
 * Counts occurrences of a byte sequence in a binary string.
 *
 * @param string $needle   Byte sequence to search for.
 * @param string $haystack Binary string.
 * @return int
 */
function count_occurrences( string $needle, string $haystack ): int {
	$count  = 0;
	$offset = 0;
	while ( ( $pos = strpos( $haystack, $needle, $offset ) ) !== false ) {
		$count++;
		$offset = $pos + 1;
	}
	return $count;
}

// ---------------------------------------------------------------------------
// Test 1: Minimal JPEG with no metadata passes through unchanged.
// ---------------------------------------------------------------------------
echo "\nTest 1: No-metadata JPEG passes through\n";
{
	$jpeg = make_jpeg();

	$src  = sys_get_temp_dir() . '/metascrub_test_t1_src.jpg';
	$dest = sys_get_temp_dir() . '/metascrub_test_t1_dst.jpg';
	file_put_contents( $src, $jpeg );

	$scrubber = new MetaScrub_Scrubber_JPEG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_non_negative_int( $removed, 'scrub returns non-negative int' );
	assert_eq( 0, $removed, 'zero segments removed from clean JPEG' );

	$out = file_get_contents( $dest );
	assert_true( str_starts_with( $out, "\xFF\xD8" ), 'output starts with SOI' );
	assert_contains( "\xFF\xD9", $out, 'output contains EOI' );
	assert_contains( "\xFF\xE0", $out, 'output contains APP0' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 2: JPEG with APP1 (EXIF) — scrub 'all' removes it.
// ---------------------------------------------------------------------------
echo "\nTest 2: APP1 EXIF removed with preset=all\n";
{
	$exif_data = "Exif\x00\x00MM\x00\x2A\x00\x00\x00\x08"; // Minimal EXIF header.
	$app1_seg  = make_jpeg_segment( 0xE1, $exif_data );
	$jpeg      = make_jpeg( array( $app1_seg ) );

	$src  = sys_get_temp_dir() . '/metascrub_test_t2_src.jpg';
	$dest = sys_get_temp_dir() . '/metascrub_test_t2_dst.jpg';
	file_put_contents( $src, $jpeg );

	$scrubber = new MetaScrub_Scrubber_JPEG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_eq( 1, $removed, 'one segment removed' );

	$out = file_get_contents( $dest );
	// APP1 marker 0xFFE1 should not appear in the output.
	assert_eq( 0, count_occurrences( "\xFF\xE1", $out ), 'APP1 absent from output' );
	assert_contains( "\xFF\xE0", $out, 'APP0 preserved' );
	assert_true( str_starts_with( $out, "\xFF\xD8" ), 'SOI preserved' );
	assert_contains( "\xFF\xD9", $out, 'EOI preserved' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 3: JPEG with APP1 — preset=keep-technical preserves it.
// ---------------------------------------------------------------------------
echo "\nTest 3: APP1 preserved with preset=keep-technical\n";
{
	$exif_data = "Exif\x00\x00MM\x00\x2A\x00\x00\x00\x08";
	$app1_seg  = make_jpeg_segment( 0xE1, $exif_data );
	$jpeg      = make_jpeg( array( $app1_seg ) );

	$src  = sys_get_temp_dir() . '/metascrub_test_t3_src.jpg';
	$dest = sys_get_temp_dir() . '/metascrub_test_t3_dst.jpg';
	file_put_contents( $src, $jpeg );

	$scrubber = new MetaScrub_Scrubber_JPEG();
	$removed  = $scrubber->scrub( $src, $dest, 'keep-technical' );

	assert_eq( 0, $removed, 'zero segments removed with keep-technical' );

	$out = file_get_contents( $dest );
	assert_true( count_occurrences( "\xFF\xE1", $out ) >= 1, 'APP1 present in output' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 4: JPEG with APP13 (IPTC) — removed with preset=all.
// ---------------------------------------------------------------------------
echo "\nTest 4: APP13 (IPTC) removed with preset=all\n";
{
	$iptc_data = "Photoshop 3.0\x00\x38\x42\x49\x4D"; // Minimal Photoshop IRB header.
	$app13_seg = make_jpeg_segment( 0xED, $iptc_data );
	$jpeg      = make_jpeg( array( $app13_seg ) );

	$src  = sys_get_temp_dir() . '/metascrub_test_t4_src.jpg';
	$dest = sys_get_temp_dir() . '/metascrub_test_t4_dst.jpg';
	file_put_contents( $src, $jpeg );

	$scrubber = new MetaScrub_Scrubber_JPEG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_eq( 1, $removed, 'one segment removed' );

	$out = file_get_contents( $dest );
	assert_eq( 0, count_occurrences( "\xFF\xED", $out ), 'APP13 absent from output' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 5: APP2 ICC profile — always preserved.
// ---------------------------------------------------------------------------
echo "\nTest 5: APP2 ICC profile always preserved\n";
{
	$icc_data = "ICC_PROFILE\x00\x01\x01" . str_repeat( "\x00", 100 );
	$app2_icc = make_jpeg_segment( 0xE2, $icc_data );
	$jpeg     = make_jpeg( array( $app2_icc ) );

	$src  = sys_get_temp_dir() . '/metascrub_test_t5_src.jpg';
	$dest = sys_get_temp_dir() . '/metascrub_test_t5_dst.jpg';
	file_put_contents( $src, $jpeg );

	$scrubber = new MetaScrub_Scrubber_JPEG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_eq( 0, $removed, 'zero segments removed (ICC preserved)' );

	$out = file_get_contents( $dest );
	assert_true( count_occurrences( "\xFF\xE2", $out ) >= 1, 'APP2 ICC present in output' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 6: Comment segment — removed unless keep-technical.
// ---------------------------------------------------------------------------
echo "\nTest 6: COM segment removed by default, kept with keep-technical\n";
{
	$comment_data = 'Created by Adobe Photoshop';
	$com_seg      = make_jpeg_segment( 0xFE, $comment_data );
	$jpeg         = make_jpeg( array( $com_seg ) );

	$src  = sys_get_temp_dir() . '/metascrub_test_t6a_src.jpg';
	$dest = sys_get_temp_dir() . '/metascrub_test_t6a_dst.jpg';
	file_put_contents( $src, $jpeg );

	$scrubber = new MetaScrub_Scrubber_JPEG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );
	assert_eq( 1, $removed, 'COM removed with preset=all' );
	$out = file_get_contents( $dest );
	assert_eq( 0, count_occurrences( "\xFF\xFE", $out ), 'COM absent after all scrub' );

	unlink( $src );
	unlink( $dest );

	// Keep-technical — COM preserved.
	$src2  = sys_get_temp_dir() . '/metascrub_test_t6b_src.jpg';
	$dest2 = sys_get_temp_dir() . '/metascrub_test_t6b_dst.jpg';
	file_put_contents( $src2, $jpeg );

	$removed2 = $scrubber->scrub( $src2, $dest2, 'keep-technical' );
	assert_eq( 0, $removed2, 'COM preserved with keep-technical' );
	$out2 = file_get_contents( $dest2 );
	assert_true( count_occurrences( "\xFF\xFE", $out2 ) >= 1, 'COM present after keep-technical scrub' );

	unlink( $src2 );
	unlink( $dest2 );
}

// ---------------------------------------------------------------------------
// Test 7: parse_fields lists EXIF and IPTC.
// ---------------------------------------------------------------------------
echo "\nTest 7: parse_fields returns metadata labels\n";
{
	$exif_data = "Exif\x00\x00MM\x00\x2A\x00\x00\x00\x08";
	$iptc_data = "Photoshop 3.0\x00\x38\x42\x49\x4D";
	$jpeg      = make_jpeg( array(
		make_jpeg_segment( 0xE1, $exif_data ),
		make_jpeg_segment( 0xED, $iptc_data ),
	) );

	$src = sys_get_temp_dir() . '/metascrub_test_t7_src.jpg';
	file_put_contents( $src, $jpeg );

	$scrubber = new MetaScrub_Scrubber_JPEG();
	$fields   = $scrubber->parse_fields( $src );

	assert_true( count( $fields ) >= 2, 'at least 2 metadata labels returned' );
	$found_exif = false;
	$found_iptc = false;
	foreach ( $fields as $f ) {
		if ( str_contains( strtolower( $f ), 'exif' ) ) {
			$found_exif = true;
		}
		if ( str_contains( strtolower( $f ), 'iptc' ) || str_contains( strtolower( $f ), 'photoshop' ) ) {
			$found_iptc = true;
		}
	}
	assert_true( $found_exif, 'EXIF label present in parse_fields output' );
	assert_true( $found_iptc, 'IPTC label present in parse_fields output' );

	unlink( $src );
}

// ---------------------------------------------------------------------------
// Test 8: Invalid file returns false.
// ---------------------------------------------------------------------------
echo "\nTest 8: Invalid file returns false\n";
{
	$src  = sys_get_temp_dir() . '/metascrub_test_t8_src.jpg';
	$dest = sys_get_temp_dir() . '/metascrub_test_t8_dst.jpg';
	file_put_contents( $src, 'not a jpeg at all' );

	$scrubber = new MetaScrub_Scrubber_JPEG();
	$result   = $scrubber->scrub( $src, $dest, 'all' );

	assert_false( $result, 'invalid JPEG returns false' );

	unlink( $src );
	if ( file_exists( $dest ) ) {
		unlink( $dest );
	}
}

// ---------------------------------------------------------------------------
// Test 9: preset=off returns 0 without modifying anything.
// ---------------------------------------------------------------------------
echo "\nTest 9: preset=off is a no-op\n";
{
	$exif_data = "Exif\x00\x00MM\x00\x2A\x00\x00\x00\x08";
	$jpeg      = make_jpeg( array( make_jpeg_segment( 0xE1, $exif_data ) ) );

	$src  = sys_get_temp_dir() . '/metascrub_test_t9_src.jpg';
	$dest = sys_get_temp_dir() . '/metascrub_test_t9_dst.jpg';
	file_put_contents( $src, $jpeg );

	$scrubber = new MetaScrub_Scrubber_JPEG();
	$removed  = $scrubber->scrub( $src, $dest, 'off' );

	assert_eq( 0, $removed, 'preset=off returns 0' );
	// Dest file should NOT be written.
	assert_false( file_exists( $dest ), 'no output file created with preset=off' );

	unlink( $src );
}

test_summary();
