use std::{collections::HashMap, vec};

use anyhow::Context;
use base64::{engine::general_purpose, Engine as _};
use config::get;
use extism_pdk::*;

mod types;
use types::{PluginConfig, RequestConfig, RequestObject, StepConfig};
mod host_functions;
use host_functions::{notarize, redirect};
mod utils;
use url::Url;
use utils::get_cookies_by_host;

const REQUEST: RequestObject = RequestObject {
    url: "https://www.duolingo.com/2017-06-30/users/*?fields=streak,email,name,username",
    method: "GET",
};

#[plugin_fn]
pub fn config() -> FnResult<Json<PluginConfig<'static>>> {
    let icon: String = format!(
        "data:image/png;base64,{}",
        general_purpose::STANDARD.encode(include_bytes!("../assets/icon.png"))
    );

    let config = PluginConfig {
        title: "Duolingo (Rust)",
        description: "Notarize your email and current streak",
        steps: vec![
            StepConfig {
                title: "Visit Duolingo",
                description: None,
                cta: "Go",
                action: "start",
                prover: false,
            },
            StepConfig {
                title: "Collect credentials",
                cta: "Go",
                action: "two",
                prover: false,
                description: Some("Login to your account if you haven't already"),
            },
            StepConfig {
                title: "Notarize",
                cta: "Notarize",
                action: "three",
                prover: true,
                description: None,
            },
        ],
        host_functions: vec!["redirect", "notarize"],
        cookies: vec!["www.duolingo.com"],
        headers: vec![],
        requests: vec![REQUEST],
        notary_urls: None,
        proxy_urls: None,
        icon,
    };
    Ok(Json(config))
}

/// Implementation of the first (start) plugin step
#[plugin_fn]
pub fn start() -> FnResult<Json<bool>> {
    let duolingo_url = Url::parse("https://www.duolingo.com")?;
    let tab_url = get("tabUrl")?.context("Error getting tab url")?;
    let tab_url = Url::parse(&tab_url)?;

    if tab_url.host_str() != duolingo_url.host_str() {
        unsafe {
            let _ = redirect(duolingo_url.as_str());
        };
        return Ok(Json(false));
    }

    Ok(Json(true))
}

#[plugin_fn]
pub fn two() -> FnResult<Json<RequestConfig>> {
    let cookies = get_cookies_by_host("www.duolingo.com")?;

    log!(LogLevel::Info, "cookies: {cookies:?}");

    let uuid = cookies
        .get("logged_out_uuid")
        .ok_or_else(|| Error::msg("uuid not found"))?;

    let jwt_token = cookies
        .get("jwt_token")
        .ok_or_else(|| Error::msg("jwt_token not found"))?;

    let headers: HashMap<String, String> = [
        (
            String::from("Authorization"),
            format!("Bearer {}", jwt_token),
        ),
        (String::from("Accept-Encoding"), String::from("identity")),
        (String::from("Connection"), String::from("close")),
    ]
    .into_iter()
    .collect();
    let secret_headers = vec![jwt_token.clone()];
    let request = RequestConfig {
        url: format!(
            "https://www.duolingo.com/2017-06-30/users/{uuid}?fields=streak,email,name,username"
        )
        .to_string(),
        method: REQUEST.method.to_string(),
        headers,
        secret_headers,
        get_secret_response: None,
    };

    let request_json = serde_json::to_string(&request)?;
    log!(LogLevel::Info, "request: {:?}", &request_json);

    return Ok(Json(request));
}

#[plugin_fn]
pub fn three() -> FnResult<Json<String>> {
    let request_json: String = input()?;
    log!(LogLevel::Info, "Input: {request_json:?}");

    let id = unsafe {
        let id = notarize(&request_json);
        log!(LogLevel::Info, "Notarization result: {:?}", id);
        id?
    };

    return Ok(Json(id));
}
