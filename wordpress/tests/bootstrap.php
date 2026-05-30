<?php
/**
 * MetaScrub test bootstrap.
 *
 * Provides a minimal test harness (no PHPUnit required).
 * Run individual test files directly: php tests/test-scrubber-jpeg.php
 * Or run the suite: php -f tests/test-scrubber-jpeg.php && \
 *                   php -f tests/test-scrubber-png.php  && \
 *                   php -f tests/test-scrubber-pdf.php
 *
 * Exit code: 0 = all pass, 1 = at least one failure.
 *
 * @package MetaScrub
 */

declare(strict_types=1);

/** Prevent WP-context checks inside plugin classes from firing. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/../' );
}

// Load the scrubber classes directly.
require_once __DIR__ . '/../includes/class-scrubber-jpeg.php';
require_once __DIR__ . '/../includes/class-scrubber-png.php';
require_once __DIR__ . '/../includes/class-scrubber-pdf.php';

// ---------------------------------------------------------------------------
// Minimal assertion helpers
// ---------------------------------------------------------------------------

/** @var int $GLOBALS['metascrub_tests_run'] */
$GLOBALS['metascrub_tests_run']    = 0;
$GLOBALS['metascrub_tests_failed'] = 0;
$GLOBALS['metascrub_test_name']    = 'unknown';

/**
 * Asserts that two values are equal.
 *
 * @param mixed  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @param string $message  Description of what is being tested.
 */
function assert_eq( mixed $expected, mixed $actual, string $message = '' ): void {
	$GLOBALS['metascrub_tests_run']++;
	if ( $expected !== $actual ) {
		$GLOBALS['metascrub_tests_failed']++;
		$exp_str = is_string( $expected ) ? bin2hex( $expected ) : var_export( $expected, true );
		$act_str = is_string( $actual ) ? bin2hex( $actual ) : var_export( $actual, true );
		$label   = $message ?: 'assertion';
		echo sprintf( "  FAIL [%s] — expected %s, got %s\n", $label, $exp_str, $act_str );
	} else {
		$label = $message ?: 'assertion';
		echo sprintf( "  PASS [%s]\n", $label );
	}
}

/**
 * Asserts that a value is strictly true.
 *
 * @param mixed  $actual  Value to test.
 * @param string $message Description.
 */
function assert_true( mixed $actual, string $message = '' ): void {
	assert_eq( true, $actual, $message );
}

/**
 * Asserts that a value is strictly false.
 *
 * @param mixed  $actual  Value to test.
 * @param string $message Description.
 */
function assert_false( mixed $actual, string $message = '' ): void {
	assert_eq( false, $actual, $message );
}

/**
 * Asserts that a string contains a substring.
 *
 * @param string $needle   Substring to look for.
 * @param string $haystack String to search in.
 * @param string $message  Description.
 */
function assert_contains( string $needle, string $haystack, string $message = '' ): void {
	$GLOBALS['metascrub_tests_run']++;
	if ( ! str_contains( $haystack, $needle ) ) {
		$GLOBALS['metascrub_tests_failed']++;
		$label = $message ?: 'assert_contains';
		echo sprintf( "  FAIL [%s] — needle not found in haystack\n", $label );
	} else {
		$label = $message ?: 'assert_contains';
		echo sprintf( "  PASS [%s]\n", $label );
	}
}

/**
 * Asserts that a string does NOT contain a substring.
 *
 * @param string $needle   Substring that must be absent.
 * @param string $haystack String to search in.
 * @param string $message  Description.
 */
function assert_not_contains( string $needle, string $haystack, string $message = '' ): void {
	$GLOBALS['metascrub_tests_run']++;
	if ( str_contains( $haystack, $needle ) ) {
		$GLOBALS['metascrub_tests_failed']++;
		$label = $message ?: 'assert_not_contains';
		echo sprintf( "  FAIL [%s] — needle found in haystack (should be absent)\n", $label );
	} else {
		$label = $message ?: 'assert_not_contains';
		echo sprintf( "  PASS [%s]\n", $label );
	}
}

/**
 * Asserts that a value is a non-negative integer (including zero).
 *
 * @param mixed  $actual  Value.
 * @param string $message Description.
 */
function assert_non_negative_int( mixed $actual, string $message = '' ): void {
	$GLOBALS['metascrub_tests_run']++;
	$ok = is_int( $actual ) && $actual >= 0;
	if ( ! $ok ) {
		$GLOBALS['metascrub_tests_failed']++;
		$label = $message ?: 'assert_non_negative_int';
		echo sprintf( "  FAIL [%s] — expected non-negative int, got %s\n", $label, var_export( $actual, true ) );
	} else {
		$label = $message ?: 'assert_non_negative_int';
		echo sprintf( "  PASS [%s]\n", $label );
	}
}

/**
 * Prints a summary and exits with code 1 if any test failed.
 * Call this at the end of each test file.
 */
function test_summary(): void {
	$run    = $GLOBALS['metascrub_tests_run'];
	$failed = $GLOBALS['metascrub_tests_failed'];
	$passed = $run - $failed;
	echo sprintf( "\nResults: %d passed, %d failed (of %d)\n", $passed, $failed, $run );
	if ( $failed > 0 ) {
		exit( 1 );
	}
	exit( 0 );
}
