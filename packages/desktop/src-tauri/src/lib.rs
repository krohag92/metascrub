use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager, Runtime};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct DirEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Serialize)]
pub struct FileBytes {
    pub path: String,
    pub bytes: Vec<u8>,
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// Read raw bytes from an arbitrary path on disk.
/// The tauri-plugin-fs scope in tauri.conf.json restricts which directories
/// are accessible.
#[command]
pub async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("read_file_bytes: {e}"))
}

/// Write raw bytes to a path on disk (used to save a scrubbed file).
#[command]
pub async fn write_file_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, &bytes).map_err(|e| format!("write_file_bytes: {e}"))
}

/// List the immediate children of a directory.
/// Returns an array of `DirEntry` objects.
#[command]
pub async fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let dir = PathBuf::from(&path);
    let mut entries: Vec<DirEntry> = Vec::new();

    let read_dir = std::fs::read_dir(&dir).map_err(|e| format!("list_dir: {e}"))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("list_dir entry: {e}"))?;
        let meta = entry.metadata().map_err(|e| format!("list_dir meta: {e}"))?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let full_path = entry.path().to_string_lossy().into_owned();

        entries.push(DirEntry {
            path: full_path,
            name,
            is_dir: meta.is_dir(),
            size: if meta.is_file() { meta.len() } else { 0 },
        });
    }

    // Sort: dirs first, then files, both alphabetically
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}

/// Open the native file-picker dialog (multi-select enabled) and return
/// the array of selected file paths.
#[command]
pub async fn pick_files<R: Runtime>(app: AppHandle<R>) -> Result<Vec<String>, String> {
    let paths = app
        .dialog()
        .file()
        .add_filter(
            "Supported files",
            &[
                "jpg", "jpeg", "png", "heic", "webp", "avif", "tiff", "tif", "cr2", "nef", "arw",
                "dng", "mp4", "mov", "mkv", "webm", "mp3", "flac", "m4a", "ogg", "wav", "pdf",
                "docx", "xlsx", "pptx", "epub", "svg",
            ],
        )
        .set_title("Select files to inspect")
        .blocking_pick_files();

    match paths {
        Some(selected) => Ok(selected
            .into_iter()
            .filter_map(|p| p.into_path().ok())
            .map(|p| p.to_string_lossy().into_owned())
            .collect()),
        None => Ok(vec![]),
    }
}

/// Open a URL in the default system browser (not inside the Tauri webview).
#[command]
pub async fn open_url<R: Runtime>(app: AppHandle<R>, url: String) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    app.shell()
        .open(&url, None)
        .map_err(|e| format!("open_url: {e}"))
}

// ---------------------------------------------------------------------------
// App entry point (called from main.rs)
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            read_file_bytes,
            write_file_bytes,
            list_dir,
            pick_files,
            open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MetaScrub");
}
