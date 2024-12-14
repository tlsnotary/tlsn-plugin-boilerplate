use extism_pdk::*;

#[host_fn]
extern "ExtismHost" {
    pub fn redirect(url: &str);
}

#[host_fn]
extern "ExtismHost" {
    pub fn notarize(params: &str) -> String;
}
