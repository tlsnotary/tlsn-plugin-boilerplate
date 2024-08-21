use std::collections::HashMap;

use anyhow::Context;
use config::get;
use extism_pdk::*;

pub fn get_cookies_by_host(hostname: &str) -> Result<HashMap<String, String>, Error> {
    get_by_host("cookies", hostname)
}

pub fn get_headers_by_host(hostname: &str) -> Result<HashMap<String, String>, Error> {
    get_by_host("headers", hostname)
}

fn get_by_host(key: &str, hostname: &str) -> Result<HashMap<String, String>, Error> {
    // Get key via Extism
    let cookies_json: String =
        get(key)?.context(format!("No {}s found in the configuration.", key))?;

    // Parse the JSON string directly into a HashMap
    let map: HashMap<String, HashMap<String, String>> = serde_json::from_str(&cookies_json)?;

    // Attempt to find the hostname in the map
    map.get(hostname)
        .cloned()
        .context(format!("Cannot find {}s for {}", key, hostname))
}
