<?php
/**
 * Upload hook — hooks into wp_handle_upload to scrub metadata on upload.
 *
 * @package MetaScrub
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Hooks the scrubber into WordPress's media upload pipeline.
 */
class MetaScrub_Uploader_Hook {

	/** @var MetaScrub_Settings */
	private MetaScrub_Settings $settings;

	/**
	 * Constructor.
	 *
	 * @param MetaScrub_Settings $settings Plugin settings instance.
	 */
	public function __construct( MetaScrub_Settings $settings ) {
		$this->settings = $settings;
		add_filter( 'wp_handle_upload', array( $this, 'handle_upload' ) );
	}

	/**
	 * Fires after a file is uploaded and moved to its final location.
	 *
	 * wp_handle_upload filter passes an array:
	 *   [ 'file' => '/path/to/file', 'url' => '...', 'type' => 'image/jpeg' ]
	 *
	 * We scrub in-place. On error we log and return the unmodified array so WP
	 * continues normally — privacy is opt-in, not at the expense of breakage.
	 *
	 * @param array<string, string> $upload Upload data passed by WP.
	 * @return array<string, string>
	 */
	public function handle_upload( array $upload ): array {
		if ( ! $this->settings->get( 'scrub_on_upload', true ) ) {
			return $upload;
		}

		$preset = $this->settings->get( 'preset', 'all' );
		if ( 'off' === $preset ) {
			return $upload;
		}

		if ( empty( $upload['file'] ) || ! is_string( $upload['file'] ) ) {
			return $upload;
		}

		$file_path = $upload['file'];
		$mime_type = $upload['type'] ?? '';

		if ( empty( $mime_type ) && file_exists( $file_path ) ) {
			$mime_type = mime_content_type( $file_path ) ?: '';
		}

		try {
			$scrubbed = $this->scrub_file( $file_path, $mime_type, $preset );
			if ( $scrubbed && $scrubbed !== $file_path ) {
				// Replace original with scrubbed version.
				if ( ! rename( $scrubbed, $file_path ) ) {
					@unlink( $scrubbed );
					error_log( sprintf( 'MetaScrub: failed to replace %s with scrubbed version', $file_path ) );
				}
			}
		} catch ( Throwable $e ) {
			error_log( sprintf( 'MetaScrub: scrub error on %s — %s', $file_path, $e->getMessage() ) );
		}

		return $upload;
	}

	/**
	 * Dispatches to the correct scrubber based on MIME type.
	 * Returns path to the scrubbed temp file, or null if unsupported.
	 *
	 * @param string $file_path Absolute path to the uploaded file.
	 * @param string $mime_type MIME type.
	 * @param string $preset    Scrub preset.
	 * @return string|null      Path to scrubbed file, or null on skip/error.
	 */
	private function scrub_file( string $file_path, string $mime_type, string $preset ): ?string {
		$tmp = $file_path . '.metascrub_tmp';

		switch ( true ) {
			case in_array( $mime_type, array( 'image/jpeg', 'image/jpg' ), true ):
				$scrubber = new MetaScrub_Scrubber_JPEG();
				return $scrubber->scrub( $file_path, $tmp, $preset ) ? $tmp : null;

			case 'image/png' === $mime_type:
				$scrubber = new MetaScrub_Scrubber_PNG();
				return $scrubber->scrub( $file_path, $tmp, $preset ) ? $tmp : null;

			case 'application/pdf' === $mime_type:
				$scrubber = new MetaScrub_Scrubber_PDF();
				return $scrubber->scrub( $file_path, $tmp, $preset ) ? $tmp : null;

			default:
				// Unsupported format — leave file as-is.
				return null;
		}
	}
}
