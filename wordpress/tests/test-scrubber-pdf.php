<?php
/**
 * Tests for MetaScrub_Scrubber_PDF.
 *
 * Builds synthetic PDF strings in memory, calls the scrubber, and
 * asserts metadata presence/absence.
 *
 * Run: php tests/test-scrubber-pdf.php
 *
 * @package MetaScrub
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

echo "=== MetaScrub_Scrubber_PDF tests ===\n";

// ---------------------------------------------------------------------------
// Helpers: build synthetic PDF content
// ---------------------------------------------------------------------------

/**
 * Builds a minimal PDF-like string containing an Info dictionary and
 * optional XMP stream.
 *
 * This is intentionally not a structurally-valid PDF (no xref table, etc.)
 * but contains enough text for the regex-based scrubber to operate on.
 *
 * @param array<string, string> $info_fields Key => value pairs for the Info dict.
 * @param string|null           $xmp_body    Optional XMP body string.
 * @return string
 */
function make_pdf(
	array $info_fields = array(),
	?string $xmp_body = null
): string {
	$out = "%PDF-1.4\n";

	// Object 1: Info dictionary.
	$info_dict = "1 0 obj\n<<\n";
	foreach ( $info_fields as $key => $value ) {
		$info_dict .= '/' . $key . ' (' . $value . ")\n";
	}
	$info_dict .= ">>\nendobj\n\n";
	$out .= $info_dict;

	// Object 2: Optional XMP stream.
	if ( null !== $xmp_body ) {
		$out .= "2 0 obj\n";
		$out .= "<< /Type /Metadata /Subtype /XML /Length " . strlen( $xmp_body ) . " >>\n";
		$out .= "stream\n";
		$out .= $xmp_body;
		$out .= "\nendstream\nendobj\n\n";
	}

	// Minimal trailer.
	$out .= "xref\n0 3\n";
	$out .= "0000000000 65535 f \n";
	$out .= "0000000009 00000 n \n";
	$out .= "trailer\n<</Size 3 /Info 1 0 R>>\n";
	$out .= "%%EOF\n";

	return $out;
}

// ---------------------------------------------------------------------------
// Test 1: Info dict string values blanked with preset=all.
// ---------------------------------------------------------------------------
echo "\nTest 1: Info dict values blanked with preset=all\n";
{
	$pdf = make_pdf( array(
		'Title'  => 'My Secret Report',
		'Author' => 'Jane Smith',
	) );

	$src  = sys_get_temp_dir() . '/metascrub_pdf_t1_src.pdf';
	$dest = sys_get_temp_dir() . '/metascrub_pdf_t1_dst.pdf';
	file_put_contents( $src, $pdf );

	$scrubber = new MetaScrub_Scrubber_PDF();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_true( is_int( $removed ) && $removed >= 2, 'at least 2 fields blanked' );

	$out = file_get_contents( $dest );

	// Values should be replaced with spaces (same-length padding).
	assert_not_contains( 'My Secret Report', $out, 'Title value absent' );
	assert_not_contains( 'Jane Smith', $out, 'Author value absent' );

	// Keys should still be present.
	assert_contains( '/Title', $out, '/Title key present' );
	assert_contains( '/Author', $out, '/Author key present' );

	// File still starts with %PDF.
	assert_true( str_starts_with( $out, '%PDF-' ), 'output still starts with %PDF-' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 2: preset=keep-technical blanks personal keys, keeps dates.
// ---------------------------------------------------------------------------
echo "\nTest 2: personal keys blanked, dates kept with keep-technical\n";
{
	$pdf = make_pdf( array(
		'Author'       => 'Jane Smith',
		'Title'        => 'Budget Report',
		'CreationDate' => "D:20240115120000",
		'ModDate'      => "D:20240201093000",
	) );

	$src  = sys_get_temp_dir() . '/metascrub_pdf_t2_src.pdf';
	$dest = sys_get_temp_dir() . '/metascrub_pdf_t2_dst.pdf';
	file_put_contents( $src, $pdf );

	$scrubber = new MetaScrub_Scrubber_PDF();
	$removed  = $scrubber->scrub( $src, $dest, 'keep-technical' );

	assert_true( is_int( $removed ) && $removed >= 2, 'at least 2 fields blanked' );

	$out = file_get_contents( $dest );
	assert_not_contains( 'Jane Smith', $out, 'Author value absent' );
	assert_not_contains( 'Budget Report', $out, 'Title value absent' );
	assert_contains( 'D:20240115120000', $out, 'CreationDate preserved' );
	assert_contains( 'D:20240201093000', $out, 'ModDate preserved' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 3: XMP stream replaced with preset=all.
// ---------------------------------------------------------------------------
echo "\nTest 3: XMP stream replaced with preset=all\n";
{
	$xmp = '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>'
		. '<x:xmpmeta xmlns:x="adobe:ns:meta/">'
		. '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
		. '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">'
		. '<dc:creator>Jane Smith</dc:creator>'
		. '</rdf:Description></rdf:RDF></x:xmpmeta>'
		. '<?xpacket end="w"?>';

	$pdf = make_pdf( array( 'Author' => 'Jane Smith' ), $xmp );

	$src  = sys_get_temp_dir() . '/metascrub_pdf_t3_src.pdf';
	$dest = sys_get_temp_dir() . '/metascrub_pdf_t3_dst.pdf';
	file_put_contents( $src, $pdf );

	$scrubber = new MetaScrub_Scrubber_PDF();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_true( is_int( $removed ) && $removed >= 2, 'at least 2 items scrubbed (Info + XMP)' );

	$out = file_get_contents( $dest );
	assert_not_contains( 'Jane Smith', $out, 'Author value absent from Info and XMP' );
	assert_not_contains( 'dc:creator', $out, 'dc:creator absent from XMP' );

	// File length should be preserved (same-length substitution).
	assert_eq( strlen( $pdf ), strlen( $out ), 'file length preserved after scrub' );

	unlink( $src );
	unlink( $dest );
}

// ---------------------------------------------------------------------------
// Test 4: preset=off returns 0 without touching file.
// ---------------------------------------------------------------------------
echo "\nTest 4: preset=off is a no-op\n";
{
	$pdf = make_pdf( array( 'Author' => 'Jane Smith' ) );

	$src  = sys_get_temp_dir() . '/metascrub_pdf_t4_src.pdf';
	$dest = sys_get_temp_dir() . '/metascrub_pdf_t4_dst.pdf';
	file_put_contents( $src, $pdf );

	$scrubber = new MetaScrub_Scrubber_PDF();
	$removed  = $scrubber->scrub( $src, $dest, 'off' );

	assert_eq( 0, $removed, 'preset=off returns 0' );
	assert_false( file_exists( $dest ), 'no dest file created with preset=off' );

	unlink( $src );
}

// ---------------------------------------------------------------------------
// Test 5: Non-PDF file returns false.
// ---------------------------------------------------------------------------
echo "\nTest 5: Non-PDF file returns false\n";
{
	$src  = sys_get_temp_dir() . '/metascrub_pdf_t5_src.pdf';
	$dest = sys_get_temp_dir() . '/metascrub_pdf_t5_dst.pdf';
	file_put_contents( $src, 'this is not a pdf' );

	$scrubber = new MetaScrub_Scrubber_PDF();
	$result   = $scrubber->scrub( $src, $dest, 'all' );

	assert_false( $result, 'non-PDF returns false' );

	unlink( $src );
	if ( file_exists( $dest ) ) {
		unlink( $dest );
	}
}

// ---------------------------------------------------------------------------
// Test 6: parse_fields lists found metadata.
// ---------------------------------------------------------------------------
echo "\nTest 6: parse_fields returns metadata labels\n";
{
	$xmp = '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>'
		. '<x:xmpmeta xmlns:x="adobe:ns:meta/"></x:xmpmeta><?xpacket end="w"?>';

	$pdf = make_pdf( array(
		'Author'  => 'Jane Smith',
		'Title'   => 'My Report',
		'Creator' => 'Microsoft Word',
	), $xmp );

	$src = sys_get_temp_dir() . '/metascrub_pdf_t6_src.pdf';
	file_put_contents( $src, $pdf );

	$scrubber = new MetaScrub_Scrubber_PDF();
	$fields   = $scrubber->parse_fields( $src );

	assert_true( count( $fields ) >= 3, 'at least 3 metadata labels returned' );

	$found_author  = false;
	$found_title   = false;
	$found_xmp     = false;
	foreach ( $fields as $f ) {
		if ( str_starts_with( $f, 'Author:' ) ) {
			$found_author = true;
		}
		if ( str_starts_with( $f, 'Title:' ) ) {
			$found_title = true;
		}
		if ( str_contains( strtolower( $f ), 'xmp' ) ) {
			$found_xmp = true;
		}
	}
	assert_true( $found_author, 'Author in parse_fields' );
	assert_true( $found_title, 'Title in parse_fields' );
	assert_true( $found_xmp, 'XMP stream in parse_fields' );

	unlink( $src );
}

// ---------------------------------------------------------------------------
// Test 7: Empty Info dict — 0 fields removed.
// ---------------------------------------------------------------------------
echo "\nTest 7: Empty Info dict — 0 fields removed\n";
{
	$pdf = make_pdf(); // No Info dict values.

	$src  = sys_get_temp_dir() . '/metascrub_pdf_t7_src.pdf';
	$dest = sys_get_temp_dir() . '/metascrub_pdf_t7_dst.pdf';
	file_put_contents( $src, $pdf );

	$scrubber = new MetaScrub_Scrubber_PDF();
	$removed  = $scrubber->scrub( $src, $dest, 'all' );

	assert_eq( 0, $removed, 'zero fields removed from PDF with no Info values' );
	assert_true( str_starts_with( file_get_contents( $dest ), '%PDF-' ), 'output is still a PDF' );

	unlink( $src );
	unlink( $dest );
}

test_summary();
