<?php
/**
 * Plugin Name:       MetaScrub
 * Plugin URI:        https://metadatafinder.com
 * Description:       View and strip EXIF, GPS, and document metadata from media uploads. Privacy-first. Powered by metadatafinder.com.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            metadatafinder.com
 * Author URI:        https://metadatafinder.com
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       metascrub
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'METASCRUB_VERSION', '0.1.0' );
define( 'METASCRUB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'METASCRUB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'METASCRUB_PLUGIN_FILE', __FILE__ );

require_once METASCRUB_PLUGIN_DIR . 'includes/class-scrubber-jpeg.php';
require_once METASCRUB_PLUGIN_DIR . 'includes/class-scrubber-png.php';
require_once METASCRUB_PLUGIN_DIR . 'includes/class-scrubber-pdf.php';
require_once METASCRUB_PLUGIN_DIR . 'includes/class-settings.php';
require_once METASCRUB_PLUGIN_DIR . 'includes/class-uploader-hook.php';
require_once METASCRUB_PLUGIN_DIR . 'includes/class-bulk-cleaner.php';
require_once METASCRUB_PLUGIN_DIR . 'includes/class-metascrub.php';

/**
 * Returns the singleton instance of the main plugin class.
 *
 * @return MetaScrub
 */
function metascrub(): MetaScrub {
	return MetaScrub::instance();
}

metascrub();
