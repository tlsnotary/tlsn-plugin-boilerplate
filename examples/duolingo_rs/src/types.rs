use std::collections::HashMap;

use extism_pdk::*;
use serde::{Deserialize, Serialize};

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
pub struct PluginConfig<'a> {
    pub title: &'a str,
    pub description: &'a str,
    pub icon: String,
    pub steps: Vec<StepConfig<'a>>,
    pub host_functions: Vec<&'a str>,
    pub cookies: Vec<&'a str>,
    pub headers: Vec<&'a str>,
    pub requests: Vec<RequestObject<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notary_urls: Option<Vec<&'a str>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy_urls: Option<Vec<&'a str>>,
}

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
pub struct StepConfig<'a> {
    pub title: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<&'a str>,
    pub cta: &'a str,
    pub action: &'a str,
    pub prover: bool,
}

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
pub struct RequestObject<'a> {
    pub url: &'a str,
    pub method: &'a str,
}

#[derive(FromBytes, Deserialize, PartialEq, Debug, Serialize, ToBytes, Clone)]
#[serde(rename_all = "camelCase")]
#[encoding(Json)]
pub struct RequestConfig {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub secret_headers: Vec<String>,
    pub get_secret_response: Option<String>,
}
