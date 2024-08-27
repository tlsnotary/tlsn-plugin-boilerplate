use std::{collections::HashMap, vec};

use base64::{engine::general_purpose, Engine as _};
use config::get;
use extism_pdk::*;

mod types;
use types::{PluginConfig, RequestConfig, RequestObject, StepConfig};
mod host_functions;
use host_functions::{notarize, redirect};
mod utils;
use utils::get_cookies_by_host;

#[plugin_fn]
pub fn config() -> FnResult<Json<PluginConfig<'static>>> {
    let icon: String = format!(
        "data:image/png;base64,{}",
        general_purpose::STANDARD.encode(include_bytes!("../assets/icon.png"))
    );

    let config = PluginConfig {
        title: "Fitbit Profile",
        description: "Notarize ownership of a fitbit profile",
        steps: vec![
            StepConfig {
                title: "Open the Fitbit dashboard",
                description: Some("Login to your account if you haven't already"),
                cta: "Go to fitbit.com",
                action: "start",
                prover: false,
            },
            StepConfig {
                title: "Notarize fitbit profile",
                cta: "Notarize",
                action: "two",
                prover: true,
                description: None,
            },
        ],
        host_functions: vec!["redirect", "notarize"],
        cookies: vec!["www.fitbit.com"],
        headers: vec!["www.fitbit.com"],
        requests: vec![RequestObject {
            url: "https://web-api.fitbit.com/1/user/*/profile.json",
            method: "GET",
        }],
        notary_urls: None,
        proxy_urls: None,
        icon,
    };
    Ok(Json(config))
}

#[plugin_fn]
pub fn start() -> FnResult<Json<bool>> {
    let dashboard_url = "https://www.fitbit.com/dashboard";
    let tab_url = get("tabUrl");

    let Ok(Some(url)) = tab_url else {
        return Ok(Json(false));
    };

    if url != dashboard_url {
        unsafe {
            let _ = redirect(dashboard_url);
        };
        return Ok(Json(false));
    }

    Ok(Json(true))
}

#[plugin_fn]
pub fn two() -> FnResult<Json<Option<String>>> {
    let a = "oauth_access_token";
    match get_cookies_by_host("www.fitbit.com") {
        Ok(cookies) => {
            log!(LogLevel::Info, "cookies: {cookies:?}");
            match cookies.get(a) {
                Some(token) => {
                    log!(LogLevel::Info, "found token: {token:?}");
                    let bearer_header = format!("Bearer {}", token);
                    let headers: HashMap<&str, &str> = [
                        ("authorization", bearer_header.as_str()),
                        ("Accept-Encoding", "identity"),
                        ("Connection", "close"),
                    ]
                    .into_iter()
                    .collect();
                    let secret_headers = vec![bearer_header.as_str()];
                    let request = RequestConfig {
                        url: "https://web-api.fitbit.com/1/user/4G7WVQ/profile.json",
                        method: "GET",
                        headers,
                        secret_headers,
                    };

                    let request_json = serde_json::to_string(&request)?;
                    log!(LogLevel::Info, "request: {:?}", &request_json);
                    let id = unsafe {
                        let id = notarize(&request_json);
                        log!(LogLevel::Info, "Notarization result: {:?}", id);
                        id?
                    };

                    return Ok(Json(Some(id)));
                }
                _ => log!(LogLevel::Error, "TODO"),
            }
        }
        Err(err) => log!(LogLevel::Error, "{:?}", err),
    }
    Ok(Json(None))
}
