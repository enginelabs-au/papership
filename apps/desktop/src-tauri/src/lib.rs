use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use keyring::Entry;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

const SERVICE: &str = "au.enginelabs.desktop";
const USER: &str = "session";

#[tauri::command]
fn keychain_set(value: String) -> Result<(), String> {
    Entry::new(SERVICE, USER)
        .map_err(|e| e.to_string())?
        .set_password(&value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn keychain_get() -> Result<Option<String>, String> {
    match Entry::new(SERVICE, USER).map_err(|e| e.to_string())?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn keychain_clear() -> Result<(), String> {
    let entry = Entry::new(SERVICE, USER).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[derive(Serialize)]
struct LocalPick {
    title: String,
    digest: String,
    byte_size: u64,
}

#[derive(Serialize, Deserialize, Default)]
struct LocalMap {
    pending: BTreeMap<String, String>,
    bound: BTreeMap<String, String>,
}

pub fn digest_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

pub fn file_title(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or("Local file")
        .to_string()
}

fn read_map(path: &Path) -> Result<LocalMap, String> {
    if !path.exists() {
        return Ok(LocalMap::default());
    }
    let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
    serde_json::from_str(&raw).map_err(|err| err.to_string())
}

fn write_map(path: &Path, map: &LocalMap) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let raw = serde_json::to_string(map).map_err(|err| err.to_string())?;
    fs::write(path, raw).map_err(|err| err.to_string())
}

pub fn remember_pending(map_path: &Path, digest: &str, file_path: &Path) -> Result<(), String> {
    let mut map = read_map(map_path)?;
    map.pending
        .insert(digest.to_string(), file_path.to_string_lossy().to_string());
    write_map(map_path, &map)
}

pub fn bind_object(map_path: &Path, object_id: &str, digest: &str) -> Result<(), String> {
    let mut map = read_map(map_path)?;
    let file_path = map
        .pending
        .remove(digest)
        .ok_or_else(|| "file is not on this machine".to_string())?;
    map.bound.insert(object_id.to_string(), file_path);
    write_map(map_path, &map)
}

#[tauri::command]
fn bridge_pick_local_file(app: tauri::AppHandle) -> Result<Option<LocalPick>, String> {
    let picked = app.dialog().file().blocking_pick_file();
    let Some(file) = picked else {
        return Ok(None);
    };
    let path = file.into_path().map_err(|err| err.to_string())?;
    let bytes = fs::read(&path).map_err(|err| err.to_string())?;
    let digest = digest_bytes(&bytes);
    let map_path = local_map_path(&app)?;
    remember_pending(&map_path, &digest, &path)?;
    Ok(Some(LocalPick {
        title: file_title(&path),
        digest,
        byte_size: bytes.len() as u64,
    }))
}

#[tauri::command]
fn bridge_bind_local_file(app: tauri::AppHandle, object_id: String, digest: String) -> Result<(), String> {
    bind_object(&local_map_path(&app)?, &object_id, &digest)
}

fn local_map_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    Ok(dir.join("local-files.json"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            keychain_set,
            keychain_get,
            keychain_clear,
            bridge_pick_local_file,
            bridge_bind_local_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Papership desktop");
}

#[cfg(test)]
mod tests {
    use super::{bind_object, digest_bytes, file_title, remember_pending};

    #[test]
    fn digest_is_stable_and_title_is_the_file_name() {
        assert_eq!(
            digest_bytes(b"note"),
            "edb465624291e4053c6c5ea4b7eb320dec773e10a57d26b95dcf0564f8e310f8"
        );
        assert_eq!(file_title(std::path::Path::new("/tmp/notes.txt")), "notes.txt");
    }

    #[test]
    fn path_stays_in_the_local_map() {
        let dir = std::env::temp_dir().join(format!("papership-bridge-{}", std::process::id()));
        let map = dir.join("local-files.json");
        let _ = std::fs::remove_dir_all(&dir);
        remember_pending(&map, "abc", std::path::Path::new("/Users/me/notes.txt")).unwrap();
        bind_object(&map, "object-1", "abc").unwrap();
        let raw = std::fs::read_to_string(&map).unwrap();
        assert!(raw.contains("object-1"));
        assert!(raw.contains("/Users/me/notes.txt"));
        assert!(!raw.contains("http"));
        let commands = include_str!("lib.rs").split("#[cfg(test)]").next().unwrap();
        assert!(!commands.contains("http://"));
        assert!(!commands.contains("https://"));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
