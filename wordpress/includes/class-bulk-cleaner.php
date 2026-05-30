<?php
/**
 * Bulk Cleaner admin page — Tools → MetaScrub Bulk Cleaner.
 *
 * @package MetaScrub
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Provides the bulk-cleaner admin submenu and handles scrub actions.
 */
class MetaScrub_Bulk_Cleaner {

	/** Number of attachments shown per page. */
	const PER_PAGE = 20;

	/** @var MetaScrub_Settings */
	private MetaScrub_Settings $settings;

	/**
	 * Constructor.
	 *
	 * @param MetaScrub_Settings $settings Plugin settings.
	 */
	public function __construct( MetaScrub_Settings $settings ) {
		$this->settings = $settings;
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_post_metascrub_bulk_scrub', array( $this, 'handle_bulk_scrub' ) );
	}

	// -------------------------------------------------------------------------
	// Menu registration
	// -------------------------------------------------------------------------

	/**
	 * Registers Tools → MetaScrub Bulk Cleaner.
	 */
	public function add_menu(): void {
		add_management_page(
			__( 'MetaScrub Bulk Cleaner', 'metascrub' ),
			__( 'MetaScrub Bulk Cleaner', 'metascrub' ),
			'manage_options',
			'metascrub-bulk-cleaner',
			array( $this, 'render_page' )
		);
	}

	// -------------------------------------------------------------------------
	// POST handler
	// -------------------------------------------------------------------------

	/**
	 * Handles the bulk-scrub form submission.
	 * Redirects back to the same page with a results notice.
	 */
	public function handle_bulk_scrub(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Insufficient permissions.', 'metascrub' ) );
		}

		check_admin_referer( 'metascrub_bulk_scrub', 'metascrub_nonce' );

		$ids = isset( $_POST['metascrub_ids'] ) && is_array( $_POST['metascrub_ids'] )
			? array_map( 'absint', $_POST['metascrub_ids'] )
			: array();

		$preset = $this->settings->get( 'preset', 'all' );

		$results   = array();
		$succeeded = 0;
		$failed    = 0;

		foreach ( $ids as $id ) {
			$post = get_post( $id );
			if ( ! $post || 'attachment' !== $post->post_type ) {
				continue;
			}

			$file_path = get_attached_file( $id );
			if ( ! $file_path || ! file_exists( $file_path ) ) {
				$results[] = array(
					'id'      => $id,
					'name'    => basename( $file_path ?: '' ),
					'removed' => 0,
					'status'  => 'error',
					'message' => __( 'File not found.', 'metascrub' ),
				);
				$failed++;
				continue;
			}

			$mime_type = get_post_mime_type( $post );
			$result    = $this->scrub_attachment( $file_path, $mime_type, $preset );

			$results[] = array(
				'id'      => $id,
				'name'    => basename( $file_path ),
				'removed' => $result['removed'],
				'status'  => $result['success'] ? 'ok' : 'error',
				'message' => $result['message'],
			);

			if ( $result['success'] ) {
				$succeeded++;
			} else {
				$failed++;
			}
		}

		// Store results in a transient so we can show them after redirect.
		set_transient( 'metascrub_bulk_results', $results, 60 );

		$message = sprintf(
			/* translators: 1: succeeded count, 2: failed count */
			__( 'MetaScrub: %1$d file(s) scrubbed successfully, %2$d failed.', 'metascrub' ),
			$succeeded,
			$failed
		);

		set_transient( 'metascrub_admin_notice', array(
			'type'    => $failed > 0 ? 'warning' : 'success',
			'message' => $message,
		), 60 );

		wp_safe_redirect( admin_url( 'tools.php?page=metascrub-bulk-cleaner&metascrub_done=1' ) );
		exit;
	}

	// -------------------------------------------------------------------------
	// Page render
	// -------------------------------------------------------------------------

	/**
	 * Renders the full bulk-cleaner admin page.
	 */
	public function render_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Insufficient permissions.', 'metascrub' ) );
		}

		$paged        = max( 1, absint( $_GET['paged'] ?? 1 ) );
		$offset       = ( $paged - 1 ) * self::PER_PAGE;
		$mime_filter  = isset( $_GET['mime_type'] ) ? sanitize_text_field( wp_unslash( $_GET['mime_type'] ) ) : '';

		// Query attachments.
		$query_args = array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => self::PER_PAGE,
			'offset'         => $offset,
			'orderby'        => 'date',
			'order'          => 'DESC',
		);

		$supported_mimes = array( 'image/jpeg', 'image/png', 'application/pdf' );

		if ( $mime_filter && in_array( $mime_filter, $supported_mimes, true ) ) {
			$query_args['post_mime_type'] = $mime_filter;
		} else {
			$query_args['post_mime_type'] = $supported_mimes;
		}

		$query       = new WP_Query( $query_args );
		$attachments = $query->posts;
		$total       = $query->found_posts;
		$total_pages = max( 1, (int) ceil( $total / self::PER_PAGE ) );

		$bulk_results = get_transient( 'metascrub_bulk_results' );
		if ( $bulk_results ) {
			delete_transient( 'metascrub_bulk_results' );
		}

		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'MetaScrub Bulk Cleaner', 'metascrub' ); ?></h1>
			<p>
				<?php esc_html_e( 'Select files from your media library to scrub their metadata. Only JPEG, PNG, and PDF files are supported.', 'metascrub' ); ?>
				<?php esc_html_e( 'Current preset:', 'metascrub' ); ?>
				<strong><?php echo esc_html( MetaScrub_Settings::PRESETS[ $this->settings->get( 'preset', 'all' ) ] ?? 'all' ); ?></strong>
				&mdash;
				<a href="<?php echo esc_url( admin_url( 'options-general.php?page=metascrub-settings' ) ); ?>">
					<?php esc_html_e( 'Change settings', 'metascrub' ); ?>
				</a>
			</p>

			<?php if ( ! empty( $bulk_results ) ) : ?>
				<h2><?php esc_html_e( 'Scrub Results', 'metascrub' ); ?></h2>
				<table class="widefat striped">
					<thead>
						<tr>
							<th><?php esc_html_e( 'File', 'metascrub' ); ?></th>
							<th><?php esc_html_e( 'Fields Removed', 'metascrub' ); ?></th>
							<th><?php esc_html_e( 'Status', 'metascrub' ); ?></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $bulk_results as $row ) : ?>
							<tr>
								<td><?php echo esc_html( $row['name'] ); ?></td>
								<td><?php echo absint( $row['removed'] ); ?></td>
								<td>
									<?php if ( 'ok' === $row['status'] ) : ?>
										<span style="color:green;">&#10003; <?php esc_html_e( 'OK', 'metascrub' ); ?></span>
									<?php else : ?>
										<span style="color:red;">&#10007; <?php echo esc_html( $row['message'] ); ?></span>
									<?php endif; ?>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
				<br>
			<?php endif; ?>

			<?php if ( empty( $attachments ) ) : ?>
				<p><?php esc_html_e( 'No supported media files found.', 'metascrub' ); ?></p>
			<?php else : ?>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<?php wp_nonce_field( 'metascrub_bulk_scrub', 'metascrub_nonce' ); ?>
					<input type="hidden" name="action" value="metascrub_bulk_scrub">

					<?php $this->render_pagination( $paged, $total_pages, $total ); ?>

					<table class="widefat striped" style="margin-top:10px;">
						<thead>
							<tr>
								<th style="width:30px;">
									<input type="checkbox" id="metascrub-select-all">
								</th>
								<th><?php esc_html_e( 'File', 'metascrub' ); ?></th>
								<th><?php esc_html_e( 'Type', 'metascrub' ); ?></th>
								<th><?php esc_html_e( 'Date', 'metascrub' ); ?></th>
								<th><?php esc_html_e( 'Metadata Preview', 'metascrub' ); ?></th>
							</tr>
						</thead>
						<tbody>
							<?php foreach ( $attachments as $attachment ) : ?>
								<?php
								$file_path = get_attached_file( $attachment->ID );
								$mime_type = $attachment->post_mime_type;
								$preview   = $file_path ? $this->get_metadata_preview( $file_path, $mime_type ) : array();
								?>
								<tr>
									<td>
										<input type="checkbox" name="metascrub_ids[]" value="<?php echo absint( $attachment->ID ); ?>">
									</td>
									<td>
										<strong><?php echo esc_html( basename( $file_path ?: '' ) ); ?></strong>
										<?php if ( $attachment->post_title ) : ?>
											<br><span class="description"><?php echo esc_html( $attachment->post_title ); ?></span>
										<?php endif; ?>
									</td>
									<td><?php echo esc_html( $mime_type ); ?></td>
									<td><?php echo esc_html( gmdate( 'Y-m-d', strtotime( $attachment->post_date ) ) ); ?></td>
									<td>
										<?php if ( empty( $preview ) ) : ?>
											<em style="color:#888;"><?php esc_html_e( 'No metadata found', 'metascrub' ); ?></em>
										<?php else : ?>
											<ul style="margin:0;padding-left:18px;font-size:12px;">
												<?php foreach ( array_slice( $preview, 0, 5 ) as $field ) : ?>
													<li><?php echo esc_html( $field ); ?></li>
												<?php endforeach; ?>
												<?php if ( count( $preview ) > 5 ) : ?>
													<li><em><?php printf( esc_html__( '…and %d more', 'metascrub' ), count( $preview ) - 5 ); ?></em></li>
												<?php endif; ?>
											</ul>
										<?php endif; ?>
									</td>
								</tr>
							<?php endforeach; ?>
						</tbody>
					</table>

					<?php $this->render_pagination( $paged, $total_pages, $total ); ?>

					<p style="margin-top:16px;">
						<?php
						submit_button(
							__( 'Scrub selected', 'metascrub' ),
							'primary',
							'submit',
							false
						);
						?>
					</p>
				</form>

				<script>
				document.addEventListener('DOMContentLoaded', function () {
					var selectAll = document.getElementById('metascrub-select-all');
					if (selectAll) {
						selectAll.addEventListener('change', function () {
							var checkboxes = document.querySelectorAll('input[name="metascrub_ids[]"]');
							checkboxes.forEach(function (cb) { cb.checked = selectAll.checked; });
						});
					}
				});
				</script>
			<?php endif; ?>

			<hr>
			<p class="description">
				<?php esc_html_e( 'Powered by', 'metascrub' ); ?>
				<a href="https://metadatafinder.com" target="_blank" rel="noopener noreferrer">metadatafinder.com</a>
				&mdash; <?php esc_html_e( 'See and strip metadata from any file.', 'metascrub' ); ?>
			</p>
		</div>
		<?php
	}

	// -------------------------------------------------------------------------
	// Internal helpers
	// -------------------------------------------------------------------------

	/**
	 * Returns a list of metadata field labels found in a file (preview only — no scrub).
	 *
	 * @param string $file_path Absolute path.
	 * @param string $mime_type MIME type.
	 * @return list<string>
	 */
	private function get_metadata_preview( string $file_path, string $mime_type ): array {
		if ( ! file_exists( $file_path ) ) {
			return array();
		}

		try {
			switch ( true ) {
				case in_array( $mime_type, array( 'image/jpeg', 'image/jpg' ), true ):
					$scrubber = new MetaScrub_Scrubber_JPEG();
					return $scrubber->parse_fields( $file_path );

				case 'image/png' === $mime_type:
					$scrubber = new MetaScrub_Scrubber_PNG();
					return $scrubber->parse_fields( $file_path );

				case 'application/pdf' === $mime_type:
					$scrubber = new MetaScrub_Scrubber_PDF();
					return $scrubber->parse_fields( $file_path );

				default:
					return array();
			}
		} catch ( Throwable $e ) {
			error_log( sprintf( 'MetaScrub: preview error on %s — %s', $file_path, $e->getMessage() ) );
			return array();
		}
	}

	/**
	 * Scrubs a single attachment file in-place.
	 *
	 * @param string $file_path Absolute path.
	 * @param string $mime_type MIME type.
	 * @param string $preset    Scrub preset.
	 * @return array{success: bool, removed: int, message: string}
	 */
	private function scrub_attachment( string $file_path, string $mime_type, string $preset ): array {
		$tmp = $file_path . '.metascrub_tmp';

		try {
			switch ( true ) {
				case in_array( $mime_type, array( 'image/jpeg', 'image/jpg' ), true ):
					$scrubber = new MetaScrub_Scrubber_JPEG();
					break;
				case 'image/png' === $mime_type:
					$scrubber = new MetaScrub_Scrubber_PNG();
					break;
				case 'application/pdf' === $mime_type:
					$scrubber = new MetaScrub_Scrubber_PDF();
					break;
				default:
					return array( 'success' => false, 'removed' => 0, 'message' => __( 'Unsupported file type.', 'metascrub' ) );
			}

			$removed = $scrubber->scrub( $file_path, $tmp, $preset );

			if ( false === $removed ) {
				@unlink( $tmp );
				return array( 'success' => false, 'removed' => 0, 'message' => __( 'Scrub failed.', 'metascrub' ) );
			}

			if ( ! rename( $tmp, $file_path ) ) {
				@unlink( $tmp );
				return array( 'success' => false, 'removed' => 0, 'message' => __( 'Could not overwrite original file.', 'metascrub' ) );
			}

			return array( 'success' => true, 'removed' => (int) $removed, 'message' => '' );

		} catch ( Throwable $e ) {
			@unlink( $tmp );
			error_log( sprintf( 'MetaScrub: scrub error on %s — %s', $file_path, $e->getMessage() ) );
			return array( 'success' => false, 'removed' => 0, 'message' => $e->getMessage() );
		}
	}

	/**
	 * Renders simple pagination links.
	 *
	 * @param int $paged       Current page.
	 * @param int $total_pages Total pages.
	 * @param int $total       Total items.
	 */
	private function render_pagination( int $paged, int $total_pages, int $total ): void {
		printf(
			'<p>' . esc_html__( 'Showing page %1$d of %2$d (%3$d files total).', 'metascrub' ) . '</p>',
			$paged,
			$total_pages,
			$total
		);

		if ( $total_pages > 1 ) {
			echo '<div class="tablenav-pages">';
			for ( $p = 1; $p <= $total_pages; $p++ ) {
				$url = add_query_arg( 'paged', $p, admin_url( 'tools.php?page=metascrub-bulk-cleaner' ) );
				if ( $p === $paged ) {
					echo '<span class="current">' . absint( $p ) . '</span> ';
				} else {
					echo '<a href="' . esc_url( $url ) . '">' . absint( $p ) . '</a> ';
				}
			}
			echo '</div>';
		}
	}
}
