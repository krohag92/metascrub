<?php
/**
 * Settings page — WP Settings API integration.
 *
 * Registers the settings page under Settings → MetaScrub.
 * Uses register_setting / add_settings_field throughout (no hand-rolled forms).
 *
 * @package MetaScrub
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles the plugin settings page and option registration.
 */
class MetaScrub_Settings {

	/** Option key used in wp_options. */
	const OPTION_KEY = 'metascrub_settings';

	/** Available presets. */
	const PRESETS = array(
		'all'            => 'All metadata (full strip)',
		'gps-only'       => 'GPS only',
		'personal-only'  => 'Personal only (author, copyright, GPS)',
		'keep-technical' => 'Keep technical (strip personal only)',
		'off'            => 'Off (do not scrub)',
	);

	/**
	 * Constructor — registers WP hooks.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	/**
	 * Returns a single setting value with a fallback default.
	 *
	 * @param string $key     Setting key.
	 * @param mixed  $default Default value.
	 * @return mixed
	 */
	public function get( string $key, mixed $default = null ): mixed {
		$options = get_option( self::OPTION_KEY, array() );
		return $options[ $key ] ?? $default;
	}

	/**
	 * Returns all settings with defaults applied.
	 *
	 * @return array<string, mixed>
	 */
	public function all(): array {
		$defaults = array(
			'preset'          => 'all',
			'scrub_on_upload' => true,
			'warn_authors'    => false,
		);
		$saved = get_option( self::OPTION_KEY, array() );
		return array_merge( $defaults, is_array( $saved ) ? $saved : array() );
	}

	// -------------------------------------------------------------------------
	// Admin menu
	// -------------------------------------------------------------------------

	/**
	 * Registers the Settings → MetaScrub submenu.
	 */
	public function add_settings_page(): void {
		add_options_page(
			__( 'MetaScrub Settings', 'metascrub' ),
			__( 'MetaScrub', 'metascrub' ),
			'manage_options',
			'metascrub-settings',
			array( $this, 'render_settings_page' )
		);
	}

	// -------------------------------------------------------------------------
	// Settings API
	// -------------------------------------------------------------------------

	/**
	 * Registers the option and its fields via the WP Settings API.
	 */
	public function register_settings(): void {
		register_setting(
			'metascrub_settings_group',
			self::OPTION_KEY,
			array(
				'sanitize_callback' => array( $this, 'sanitize_settings' ),
				'default'           => array(
					'preset'          => 'all',
					'scrub_on_upload' => true,
					'warn_authors'    => false,
				),
			)
		);

		// Section: Scrubbing behaviour.
		add_settings_section(
			'metascrub_section_behaviour',
			__( 'Scrubbing Behaviour', 'metascrub' ),
			array( $this, 'render_section_behaviour' ),
			'metascrub-settings'
		);

		add_settings_field(
			'metascrub_preset',
			__( 'Metadata preset', 'metascrub' ),
			array( $this, 'render_field_preset' ),
			'metascrub-settings',
			'metascrub_section_behaviour'
		);

		add_settings_field(
			'metascrub_scrub_on_upload',
			__( 'Scrub on upload', 'metascrub' ),
			array( $this, 'render_field_scrub_on_upload' ),
			'metascrub-settings',
			'metascrub_section_behaviour'
		);

		add_settings_field(
			'metascrub_warn_authors',
			__( 'Show warnings to authors', 'metascrub' ),
			array( $this, 'render_field_warn_authors' ),
			'metascrub-settings',
			'metascrub_section_behaviour'
		);
	}

	/**
	 * Sanitizes the settings array before saving.
	 *
	 * @param mixed $input Raw POST input.
	 * @return array<string, mixed>
	 */
	public function sanitize_settings( mixed $input ): array {
		$output = array();

		if ( ! is_array( $input ) ) {
			return $this->all();
		}

		// Preset.
		$preset = isset( $input['preset'] ) ? sanitize_key( $input['preset'] ) : 'all';
		$output['preset'] = array_key_exists( $preset, self::PRESETS ) ? $preset : 'all';

		// Scrub on upload toggle.
		$output['scrub_on_upload'] = ! empty( $input['scrub_on_upload'] );

		// Warn authors toggle.
		$output['warn_authors'] = ! empty( $input['warn_authors'] );

		return $output;
	}

	// -------------------------------------------------------------------------
	// Render helpers
	// -------------------------------------------------------------------------

	/**
	 * Section description.
	 */
	public function render_section_behaviour(): void {
		echo '<p>' . esc_html__( 'Configure how MetaScrub handles metadata in your media library.', 'metascrub' ) . '</p>';
	}

	/**
	 * Preset radio buttons.
	 */
	public function render_field_preset(): void {
		$current = $this->get( 'preset', 'all' );
		foreach ( self::PRESETS as $value => $label ) {
			printf(
				'<label style="display:block;margin-bottom:6px;"><input type="radio" name="%s[preset]" value="%s"%s> %s</label>',
				esc_attr( self::OPTION_KEY ),
				esc_attr( $value ),
				checked( $current, $value, false ),
				esc_html( $label )
			);
		}
		echo '<p class="description">' . esc_html__( 'Choose which metadata fields are removed during scrubbing.', 'metascrub' ) . '</p>';
	}

	/**
	 * "Scrub on upload" checkbox.
	 */
	public function render_field_scrub_on_upload(): void {
		$value = $this->get( 'scrub_on_upload', true );
		printf(
			'<label><input type="checkbox" name="%s[scrub_on_upload]" value="1"%s> %s</label>',
			esc_attr( self::OPTION_KEY ),
			checked( $value, true, false ),
			esc_html__( 'Automatically scrub metadata when files are uploaded to the media library.', 'metascrub' )
		);
	}

	/**
	 * "Warn authors" checkbox.
	 */
	public function render_field_warn_authors(): void {
		$value = $this->get( 'warn_authors', false );
		printf(
			'<label><input type="checkbox" name="%s[warn_authors]" value="1"%s> %s</label>',
			esc_attr( self::OPTION_KEY ),
			checked( $value, true, false ),
			esc_html__( 'Show a warning to editors and authors when their upload contains sensitive metadata.', 'metascrub' )
		);
	}

	// -------------------------------------------------------------------------
	// Full page render
	// -------------------------------------------------------------------------

	/**
	 * Renders the full settings page inside WP admin.
	 */
	public function render_settings_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'metascrub' ) );
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

			<div style="display:flex;gap:40px;align-items:flex-start;">
				<div style="flex:1;">
					<form method="post" action="options.php">
						<?php
						settings_fields( 'metascrub_settings_group' );
						do_settings_sections( 'metascrub-settings' );
						submit_button();
						?>
					</form>
				</div>

				<div style="width:260px;background:#fff;border:1px solid #ddd;border-radius:4px;padding:20px;">
					<h3 style="margin-top:0;"><?php esc_html_e( 'Powered by', 'metascrub' ); ?></h3>
					<p>
						<a href="https://metadatafinder.com" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'metadatafinder.com', 'metascrub' ); ?>
						</a>
					</p>
					<p class="description">
						<?php esc_html_e( 'Free online metadata viewer — view EXIF, GPS, XMP, IPTC and more directly in your browser.', 'metascrub' ); ?>
					</p>
					<hr>
					<p class="description">
						<strong><?php esc_html_e( 'MetaScrub', 'metascrub' ); ?></strong>
						<?php echo esc_html( 'v' . METASCRUB_VERSION ); ?>
					</p>
					<p class="description">
						<a href="https://metadatafinder.com" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'See and strip metadata from any file', 'metascrub' ); ?>
						</a>
					</p>
				</div>
			</div>
		</div>
		<?php
	}
}
