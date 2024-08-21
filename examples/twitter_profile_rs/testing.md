# Testing

1. start notary server (**TLS off** for local testing, check version!)
2. Start proxy server:
```
wstcp --bind-addr 127.0.0.1:55688 api.x.com:443
```
3. `cargo build --release`
4. Load plugin in browser extension
