<?php
/**
 * Tests for MetaScrub_Scrubber_PNG.
 *
 * Builds synthetic PNG data in memory, calls the scrubber, and
 * asserts chunk presence/absence.
 *
 * Run: php tests/test-scrubber-png.php
 *
 * @package MetaScrub
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

echo "=== MetaScrub_Scrubber_PNG tests ===\n";

// ---------------------------------------------------------------------------
// Helpers: build synthetic PNG chunks
// ---------------------------------------------------------------------------

/** PNG signature. */
const PNG_SIG = "\x89PNG\r\n\x1a\n";

/**
 * Computes a CRC32 checksum for a PNG chunk (type + data).
 *
 * PHP's crc32() returns a signed integer; we need the unsigned 4-byte big-endian.
 *
 * @param string $type 4-byte chunk type.
 * @param string $data Chunk payload.
 * @return string 4-byte big-endian CRC.
 */
function png_crc( string $type, string $data ): string {
	$crc = crc32( $type . $data );
	// crc32() result is a signed 32-bit int; pack as unsigned via bit masking.
	return pack( 'N', $crc & 0xFFFFFFFF );
}

/**
 * Encodes a PNG chunk.
 *
 * @param string $type 4-byte type.
 * @param string $data Payload.
 * @return string Raw bytes.
 */
function make_png_chunk( string $type, string $data ): string {
	return pack( 'N', strlen( $data ) ) . $type . $data . png_crc( $type, $data );
}

/**
 * Builds a minimal valid 1x1 PNG with the given extra chunks inserted after IHDR.
 *
 * @param list<string> $extra_chunks Already-encoded chunk bytes.
 * @return string Raw PNG bytes.
 */
function make_png( array $extra_chunks = array() ): string {
	// IHDR: width=1, height=1, bit depth=8, colour type=2 (RGB), compression=0, filter=0, interlace=0.
	$ihdr_data = pack( 'NNCCCCC', 1, 1, 8, 2, 0, 0, 0 );
	$ihdr      = make_png_chunk( 'IHDR', $ihdr_data );

	// Minimal IDAT: 1x1 RGB pixel, row filter byte=0, pixel=0,0,0 (black).
	// Compressed with zlib deflate.
	$raw_row   = "\x00\x00\x00\x00"; // Filter=0, R=0, G=0, B=0.
	$compressed = gzcompress( $raw_row, 6 );
	$idat       = make_png_chunk( 'IDAT', $compressed );

	$iend = make_png_chunk( 'IEND', '' );

	return PNG_SIG . $ihdr . implode( '', $extra_chunks ) . $idat . $iend;
}

/**
 * Counts occurrences of a chunk type in raw PNG bytes.
 *
 * @param string $type     4-byte chunk type.
 * @param string $png_data Raw PNG bytes.
 * @return int
 */
function count_png_chunk( string $type, string $png_data ): int {
	$count  = 0;
	$offset = 8; // Skip PNG signature.
	$len    = strlen( $png_data );

	while ( $offset + 12 <= $len ) {
		$data_len = unpack( 'N', substr( $png_data, $offset, 4 ) )[1];
		$offset  += 4;
		$chunk_type = substr( $png_data, $offset, 4 );
		$offset += 4 + $data_len + 4;
		if ( $chunk_type === $type ) {
			$count++;
		}
	}
	return $count;
}

// ---------------------------------------------------------------------------
// Test 1: Minimal PNG with no metadata passes through unchanged.
// ---------------------------------------------------------------------------
echo "\nTest 1: No-metadata PNG passes through\n";
{
	$png  = make_png();
	$src  = sys_get_temp_dir() . '/metascrub_png_t1_src.png';
	$dest = sys_get_temp_dir() . '/metascrub_png_t1_dst.png';
	file_put_contents( $src, $png );

	$scrubber = new MetaScrub_Scrubber_PNG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_eq( 0, $removed, 'zero chunks removed from clean PNG' );

	$out = file_get_contents( $dest );
	assert_true( str_starts_with( $out, PNG_SIG ), 'output has PNG signature' );
	assert_eq( 1, count_png_chunk( 'IHDR', $out ), 'IHDR present' );
	assert_eq( 1, count_png_chunk( 'IDAT', $out ), 'IDAT present' );
	assert_eq( 1, count_png_chunk( 'IEND', $out ), 'IEND present' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 2: tEXt chunk removed with preset=all.
// ---------------------------------------------------------------------------
echo "\nTest 2: tEXt chunk removed with preset=all\n";
{
	$text_chunk = make_png_chunk( 'tEXt', "Author\x00Jane Smith" );
	$png        = make_png( array( $text_chunk ) );

	$src  = sys_get_temp_dir() . '/metascrub_png_t2_src.png';
	$dest = sys_get_temp_dir() . '/metascrub_png_t2_dst.png';
	file_put_contents( $src, $png );

	$scrubber = new MetaScrub_Scrubber_PNG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_eq( 1, $removed, 'one chunk removed' );

	$out = file_get_contents( $dest );
	assert_eq( 0, count_png_chunk( 'tEXt', $out ), 'tEXt absent from output' );
	assert_eq( 1, count_png_chunk( 'IHDR', $out ), 'IHDR preserved' );
	assert_eq( 1, count_png_chunk( 'IDAT', $out ), 'IDAT preserved' );
	assert_eq( 1, count_png_chunk( 'IEND', $out ), 'IEND preserved' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 3: zTXt chunk removed with preset=personal-only.
// ---------------------------------------------------------------------------
echo "\nTest 3: zTXt chunk removed with preset=personal-only\n";
{
	$ztxt_data  = "Comment\x00\x00" . gzcompress( 'camera info here', 6 );
	$ztxt_chunk = make_png_chunk( 'zTXt', $ztxt_data );
	$png        = make_png( array( $ztxt_chunk ) );

	$src  = sys_get_temp_dir() . '/metascrub_png_t3_src.png';
	$dest = sys_get_temp_dir() . '/metascrub_png_t3_dst.png';
	file_put_contents( $src, $png );

	$scrubber = new MetaScrub_Scrubber_PNG();
	$removed  = $scrubber->scrub( $src, $dest, 'personal-only' );

	assert_eq( 1, $removed, 'one chunk removed' );

	$out = file_get_contents( $dest );
	assert_eq( 0, count_png_chunk( 'zTXt', $out ), 'zTXt absent from output' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 4: iTXt chunk with XMP removed.
// ---------------------------------------------------------------------------
echo "\nTest 4: iTXt XMP chunk removed with preset=all\n";
{
	$xmp_body     = '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"></x:xmpmeta><?xpacket end="w"?>';
	$itxt_data    = "XML:com.adobe.xmp\x00\x00\x00\x00\x00" . $xmp_body;
	$itxt_chunk   = make_png_chunk( 'iTXt', $itxt_data );
	$png          = make_png( array( $itxt_chunk ) );

	$src  = sys_get_temp_dir() . '/metascrub_png_t4_src.png';
	$dest = sys_get_temp_dir() . '/metascrub_png_t4_dst.png';
	file_put_contents( $src, $png );

	$scrubber = new MetaScrub_Scrubber_PNG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_eq( 1, $removed, 'one chunk removed' );

	$out = file_get_contents( $dest );
	assert_eq( 0, count_png_chunk( 'iTXt', $out ), 'iTXt absent from output' );
	assert_eq( 1, count_png_chunk( 'IHDR', $out ), 'IHDR preserved' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 5: eXIf chunk removed with preset=all.
// ---------------------------------------------------------------------------
echo "\nTest 5: eXIf chunk removed with preset=all\n";
{
	$exif_data  = "Exif\x00\x00MM\x00\x2A\x00\x00\x00\x08";
	$exif_chunk = make_png_chunk( 'eXIf', $exif_data );
	$png        = make_png( array( $exif_chunk ) );

	$src  = sys_get_temp_dir() . '/metascrub_png_t5_src.png';
	$dest = sys_get_temp_dir() . '/metascrub_png_t5_dst.png';
	file_put_contents( $src, $png );

	$scrubber = new MetaScrub_Scrubber_PNG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_eq( 1, $removed, 'eXIf chunk removed' );

	$out = file_get_contents( $dest );
	assert_eq( 0, count_png_chunk( 'eXIf', $out ), 'eXIf absent from output' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 6: tIME chunk — removed unless keep-technical.
// ---------------------------------------------------------------------------
echo "\nTest 6: tIME removed by default, preserved with keep-technical\n";
{
	// tIME: year(2) month(1) day(1) hour(1) min(1) sec(1) = 7 bytes.
	$time_data  = pack( 'nCCCCC', 2024, 5, 15, 10, 30, 0 );
	$time_chunk = make_png_chunk( 'tIME', $time_data );
	$png        = make_png( array( $time_chunk ) );

	// preset=all — remove.
	$src  = sys_get_temp_dir() . '/metascrub_png_t6a_src.png';
	$dest = sys_get_temp_dir() . '/metascrub_png_t6a_dst.png';
	file_put_contents( $src, $png );

	$scrubber = new MetaScrub_Scrubber_PNG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );
	assert_eq( 1, $removed, 'tIME removed with preset=all' );
	$out = file_get_contents( $dest );
	assert_eq( 0, count_png_chunk( 'tIME', $out ), 'tIME absent after all scrub' );
	unlink( $src );
	unlink( $dest );

	// preset=keep-technical — preserve.
	$src2  = sys_get_temp_dir() . '/metascrub_png_t6b_src.png';
	$dest2 = sys_get_temp_dir() . '/metascrub_png_t6b_dst.png';
	file_put_contents( $src2, $png );

	$removed2 = $scrubber->scrub( $src2, $dest2, 'keep-technical' );
	assert_eq( 0, $removed2, 'tIME preserved with keep-technical' );
	$out2 = file_get_contents( $dest2 );
	assert_eq( 1, count_png_chunk( 'tIME', $out2 ), 'tIME present after keep-technical' );
	unlink( $src2 );
	unlink( $dest2 );
}

// ---------------------------------------------------------------------------
// Test 7: parse_fields returns metadata labels.
// ---------------------------------------------------------------------------
echo "\nTest 7: parse_fields returns metadata labels\n";
{
	$text_chunk = make_png_chunk( 'tEXt', "Author\x00Jane Smith" );
	$time_data  = pack( 'nCCCCC', 2024, 5, 15, 10, 30, 0 );
	$time_chunk = make_png_chunk( 'tIME', $time_data );
	$png        = make_png( array( $text_chunk, $time_chunk ) );

	$src = sys_get_temp_dir() . '/metascrub_png_t7_src.png';
	file_put_contents( $src, $png );

	$scrubber = new MetaScrub_Scrubber_PNG();
	$fields   = $scrubber->parse_fields( $src );

	assert_true( count( $fields ) >= 2, 'at least 2 metadata labels returned' );

	$found_author = false;
	$found_time   = false;
	foreach ( $fields as $f ) {
		if ( str_contains( strtolower( $f ), 'author' ) ) {
			$found_author = true;
		}
		if ( str_contains( strtolower( $f ), 'modified' ) || str_contains( strtolower( $f ), 'time' ) ) {
			$found_time = true;
		}
	}
	assert_true( $found_author, 'Author label in parse_fields output' );
	assert_true( $found_time, 'timestamp label in parse_fields output' );

	unlink( $src );
}

// ---------------------------------------------------------------------------
// Test 8: Invalid file returns false.
// ---------------------------------------------------------------------------
echo "\nTest 8: Invalid file returns false\n";
{
	$src  = sys_get_temp_dir() . '/metascrub_png_t8_src.png';
	$dest = sys_get_temp_dir() . '/metascrub_png_t8_dst.png';
	file_put_contents( $src, 'not a png at all' );

	$scrubber = new MetaScrub_Scrubber_PNG();
	$result   = $scrubber->scrub( $src, $dest, 'all' );

	assert_false( $result, 'invalid PNG returns false' );

	unlink( $src );
	if ( file_exists( $dest ) ) {
		unlink( $dest );
	}
}

// ---------------------------------------------------------------------------
// Test 9: Multiple metadata chunks, all removed in one pass.
// ---------------------------------------------------------------------------
echo "\nTest 9: Multiple metadata chunks removed in one pass\n";
{
	$text_chunk = make_png_chunk( 'tEXt', "Author\x00Jane Smith" );
	$time_data  = pack( 'nCCCCC', 2024, 5, 15, 10, 30, 0 );
	$time_chunk = make_png_chunk( 'tIME', $time_data );
	$exif_chunk = make_png_chunk( 'eXIf', "Exif\x00\x00MM\x00\x2A\x00\x00\x00\x08" );
	$png        = make_png( array( $text_chunk, $time_chunk, $exif_chunk ) );

	$src  = sys_get_temp_dir() . '/metascrub_png_t9_src.png';
	$dest = sys_get_temp_dir() . '/metascrub_png_t9_dst.png';
	file_put_contents( $src, $png );

	$scrubber = new MetaScrub_Scrubber_PNG();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_eq( 3, $removed, 'three chunks removed' );

	$out = file_get_contents( $dest );
	assert_eq( 0, count_png_chunk( 'tEXt', $out ), 'tEXt absent' );
	assert_eq( 0, count_png_chunk( 'tIME', $out ), 'tIME absent' );
	assert_eq( 0, count_png_chunk( 'eXIf', $out ), 'eXIf absent' );
	assert_eq( 1, count_png_chunk( 'IHDR', $out ), 'IHDR preserved' );
	assert_eq( 1, count_png_chunk( 'IDAT', $out ), 'IDAT preserved' );
	assert_eq( 1, count_png_chunk( 'IEND', $out ), 'IEND preserved' );

	unlink( $src );
	unlink( $dest );
}

test_summary();
