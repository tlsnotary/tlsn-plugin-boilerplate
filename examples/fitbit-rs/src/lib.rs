use std::{collections::HashMap, vec};

use base64::{engine::general_purpose, Engine as _};
use config::get;
use extism_pdk::*;
use serde::{Deserialize, Serialize};

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
struct PluginConfig<'a> {
    title: &'a str,
    description: &'a str,
    icon: String,
    steps: Vec<StepConfig<'a>>,
    host_functions: Vec<&'a str>,
    cookies: Vec<&'a str>,
    headers: Vec<&'a str>,
    requests: Vec<RequestObject<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    notary_urls: Option<Vec<&'a str>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    proxy_urls: Option<Vec<&'a str>>,
}

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
struct StepConfig<'a> {
    title: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<&'a str>,
    cta: &'a str,
    action: &'a str,
    prover: bool,
}

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
struct RequestObject<'a> {
    url: &'a str,
    method: &'a str,
}

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

#[host_fn]
extern "ExtismHost" {
    fn redirect(url: &str);
}

#[host_fn]
extern "ExtismHost" {
    fn notarize(params: &str) -> String;
}

#[plugin_fn]
pub fn start() -> FnResult<Json<bool>> {
    let dashboard_url = "https://www.fitbit.com/dashboard";
    let tab_url = get("tabUrl");

    if let Ok(Some(url)) = tab_url {
        if url != dashboard_url {
            unsafe {
                let _ = redirect(dashboard_url);
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
struct RequestConfig<'a> {
    url: &'a str,
    method: &'a str,
    headers: HashMap<&'a str, &'a str>,
    secret_headers: Vec<&'a str>,
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

                    let y = serde_json::to_string(&request)?;
                    log!(LogLevel::Info, "request: {:?}", &y);
                    let id = unsafe {
                        let id = notarize(&y);
                        log!(LogLevel::Info, "Notarization result: {:?}", id);
                        id?
                    };

                    return Ok(Json(Some(id)));
                }
                _ => log!(LogLevel::Error, "TODO"),
            }
        }
        Err(err) => println!("Error: {}", err),
    }
    Ok(Json(None))
}

// #[plugin_fn]
// pub fn parseResp() -> FnResult<Json<Option<String>>> {}

// export function parseResp() {
//     const bodyString = Host.inputString();
//     const params = JSON.parse(bodyString);
//     // console.log("params")
//     // console.log(JSON.stringify(params))
//     // console.log(JSON.stringify(params.user))
//     // console.log(JSON.stringify(params.user.fullName))

//     if (params?.user?.fullName) {
//       const revealed = `"fullName":"${params.user.fullName}"`;
//       const selectionStart = bodyString.indexOf(revealed);
//       const selectionEnd =
//         selectionStart + revealed.length;
//       const secretResps = [
//         bodyString.substring(0, selectionStart),
//         bodyString.substring(selectionEnd, bodyString.length),
//       ];
//       outputJSON(secretResps);
//     } else {
//       outputJSON(false);
//     }
//   }
