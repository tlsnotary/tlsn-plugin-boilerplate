use std::collections::HashMap;

use config::get;
use extism_pdk::*;

pub fn get_cookies_by_host(hostname: &str) -> Result<HashMap<String, String>, String> {
    let cookies_result = get("cookies");

    // Check if the cookies were retrieved successfully
    let cookies_json = match cookies_result {
        Ok(Some(json_str)) => json_str,
        Ok(None) => return Err("No cookies found in the configuration.".to_string()),
        Err(e) => return Err(format!("Error retrieving cookies: {}", e)),
    };

    // Parse the JSON string directly into a HashMap
    let cookies: HashMap<String, HashMap<String, String>> =
        serde_json::from_str(&cookies_json).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // Attempt to find the hostname in the map
    if let Some(host_cookies) = cookies.get(hostname) {
        Ok(host_cookies.clone())
    } else {
        Err(format!("Cannot find cookies for {}", hostname))
    }
}
