use std::{collections::HashMap, vec};

use config::get;
use extism_pdk::*;
use serde::{Deserialize, Serialize};

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
struct PluginConfig {
    title: String,
    description: String,
    icon: Option<String>,
    steps: Vec<StepConfig>,
    host_functions: Vec<String>,
    cookies: Vec<String>,
    headers: Vec<String>,
    requests: Vec<RequestObject>,
    notary_urls: Option<Vec<String>>,
    proxy_urls: Option<Vec<String>>,
}

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
struct StepConfig {
    title: String,
    description: Option<String>,
    cta: String,
    action: String,
    prover: bool,
}

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
struct RequestObject {
    url: String,
    method: String,
}

#[plugin_fn]
pub fn config() -> FnResult<Json<PluginConfig>> {
    let config = PluginConfig {
        title: String::from("Fitbit Profile"),
        description: String::from("Notarize ownership of a fitbit profile"),
        steps: vec![
            StepConfig {
                title: String::from("Open the Fitbit dashboard"),
                description: Some(String::from("Login to your account if you haven't already")),
                cta: String::from("Go to fitbit.com"),
                action: String::from("start"),
                prover: false,
            },
            StepConfig {
                title: String::from("Notarize fitbit profile"),
                cta: String::from("Notarize"),
                action: String::from("two"),
                prover: true,
                description: None,
            },
        ],
        host_functions: vec![String::from("redirect"), String::from("notarize")],
        cookies: vec![String::from("www.fitbit.com")],
        headers: vec![String::from("www.fitbit.com")],
        requests: vec![RequestObject {
            url: String::from("https://web-api.fitbit.com/1/user/*/profile.json"),
            method: String::from("GET"),
        }],
        notary_urls: None,
        proxy_urls: None,
        icon: None,
    };
    Ok(Json(config))
}

#[host_fn]
extern "ExtismHost" {
    fn redirect(url: String);
}

#[host_fn]
extern "ExtismHost" {
    fn notarize(params: String);
}

#[plugin_fn]
pub fn start() -> FnResult<Json<bool>> {
    let dashboard_url = "https://www.fitbit.com/dashboard";
    let tab_url = get("tabUrl");

    // log!(LogLevel::Info, "{tab_url:?}");

    if let Ok(Some(url)) = tab_url {
        if url != dashboard_url {
            unsafe {
                let _ = redirect(dashboard_url.to_string());
            };
            return Ok(Json(false));
        }
    } else {
        return Ok(Json(false));
    }

    Ok(Json(true))
}

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
struct RequestConfig {
    url: String,
    method: String,
    headers: HashMap<String, String>,
    secret_headers: Vec<String>,
}

fn get_cookies_by_host(hostname: &str) -> Result<HashMap<String, String>, String> {
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

#[plugin_fn]
pub fn two() -> FnResult<Json<bool>> {
    let a = String::from("oauth_access_token");
    match get_cookies_by_host("www.fitbit.com") {
        Ok(cookies) => {
            log!(LogLevel::Info, "cookies: {cookies:?}");
            match cookies.get(&a) {
                Some(token) => {
                    log!(LogLevel::Info, "found token: {token:?}");
                    let headers: HashMap<String, String> = [
                        ("authorization".to_string(), token.clone()),
                        ("Accept-Encoding".to_string(), "identity".to_string()),
                        ("Connection".to_string(), "close".to_string()),
                    ]
                    .into_iter()
                    .collect();
                    let secret_headers = vec![(format!("Bearer {}", token)).to_string()];
                    let request = RequestConfig {
                        url: "https://web-api.fitbit.com/1/user/4G7WVQ/profile.json".to_string(),
                        method: "GET".to_string(),
                        headers,
                        secret_headers,
                    };

                    let y = serde_json::to_string(&request)?;
                    log!(LogLevel::Info, "request: {:?}", &y);
                    unsafe {
                        let _ = notarize(y);
                    };
                    return Ok(Json(true));
                }
                _ => log!(LogLevel::Error, "TODO"), /* TODO */
            }
        }
        Err(err) => println!("Error: {}", err),
    }
    return Ok(Json(true));
}
