# TLSNotary TypeScript plugin demo: Prove Twitter DM

This is a demo demo plugin for the TLSNotary browser extension in plain Javascript.

## Building

Build the plugin:
```
extism-js index.js -i index.d.ts -o index.wasm
```
This command compiles the JavaScript code in index.js into a WebAssembly module, ready for integration with the TLSNotary extension.