# Testing

1. start notary server (**TLS off** for local testing, check version!)
2. Start proxy server:
```
websocat --binary -v ws-l:0.0.0.0:55688 tcp:web-api.fitbit.com:443
```
3. `cargo build --release`
4. Load plugin in browser extension
