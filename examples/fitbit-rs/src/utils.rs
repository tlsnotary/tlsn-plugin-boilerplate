use std::collections::HashMap;

use anyhow::Context;
use config::get;
use extism_pdk::*;

pub fn get_cookies_by_host(hostname: &str) -> Result<HashMap<String, String>, Error> {
    // Get Cookies via Extism
    let cookies_json: String = get("cookies")?.context("No cookies found in the configuration.")?;

    // Parse the JSON string directly into a HashMap
    let cookies: HashMap<String, HashMap<String, String>> = serde_json::from_str(&cookies_json)?;

    // Attempt to find the hostname in the map
    cookies
        .get(hostname)
        .cloned()
        .context(format!("Cannot find cookies for {}", hostname))
}
