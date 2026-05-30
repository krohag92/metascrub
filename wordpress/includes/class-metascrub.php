<?php
/**
 * Main plugin class — bootstrap, hooks, activation/deactivation.
 *
 * @package MetaScrub
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Core plugin class. Initialises all subsystems.
 */
final class MetaScrub {

	/** @var MetaScrub|null Singleton instance. */
	private static ?MetaScrub $instance = null;

	/** @var MetaScrub_Settings */
	public MetaScrub_Settings $settings;

	/** @var MetaScrub_Uploader_Hook */
	public MetaScrub_Uploader_Hook $uploader_hook;

	/** @var MetaScrub_Bulk_Cleaner */
	public MetaScrub_Bulk_Cleaner $bulk_cleaner;

	/**
	 * Returns or creates the singleton.
	 */
	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Private constructor — use instance().
	 */
	private function __construct() {
		$this->settings      = new MetaScrub_Settings();
		$this->uploader_hook = new MetaScrub_Uploader_Hook( $this->settings );
		$this->bulk_cleaner  = new MetaScrub_Bulk_Cleaner( $this->settings );

		add_action( 'init', array( $this, 'load_textdomain' ) );
		add_action( 'admin_notices', array( $this, 'admin_notices' ) );

		register_activation_hook( METASCRUB_PLUGIN_FILE, array( $this, 'activate' ) );
		register_deactivation_hook( METASCRUB_PLUGIN_FILE, array( $this, 'deactivate' ) );
	}

	/**
	 * Loads the plugin text domain for i18n.
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain(
			'metascrub',
			false,
			dirname( plugin_basename( METASCRUB_PLUGIN_FILE ) ) . '/languages'
		);
	}

	/**
	 * Displays admin notices (e.g. after bulk scrub).
	 */
	public function admin_notices(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$notice = get_transient( 'metascrub_admin_notice' );
		if ( $notice ) {
			delete_transient( 'metascrub_admin_notice' );
			$type    = isset( $notice['type'] ) ? sanitize_key( $notice['type'] ) : 'info';
			$message = isset( $notice['message'] ) ? $notice['message'] : '';
			printf(
				'<div class="notice notice-%s is-dismissible"><p>%s</p></div>',
				esc_attr( $type ),
				wp_kses( $message, array( 'strong' => array(), 'em' => array(), 'a' => array( 'href' => array(), 'target' => array() ) ) )
			);
		}
	}

	/**
	 * Plugin activation: set default options.
	 */
	public function activate(): void {
		if ( ! get_option( 'metascrub_settings' ) ) {
			update_option( 'metascrub_settings', array(
				'preset'           => 'all',
				'scrub_on_upload'  => true,
				'warn_authors'     => false,
			) );
		}
	}

	/**
	 * Plugin deactivation: nothing to clean up (we keep settings on deactivate,
	 * only remove on uninstall).
	 */
	public function deactivate(): void {
		// Intentionally empty — settings are preserved on deactivation.
	}

	/** Prevent cloning. */
	private function __clone() {}
}
