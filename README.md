# Plugin Development for the TLSNotary Browser Extension

This repository contains the boilerplate code for developing a plugin for the TLSNotary browser extension. Currently, the template includes a TypeScript-based plugin example that proves ownership of a Twitter profile.

TLSNotary's plugin system uses [Extism](https://github.com/extism), which enables plugins in different programming languages. For more documentation, check [Extism's documentation](https://github.com/extism/js-pdk).

## Installation of Extism-js

1. **Download and Install Extism-js**: Begin by setting up `extism-js`, which enables you to compile and manage your plugins. Run these commands to download and install it:

    ```sh
    curl -O https://raw.githubusercontent.com/extism/js-pdk/main/install.sh
    bash install.sh
    ```

    This script installs the Extism JavaScript Plugin Development Kit from its GitHub repository, preparing your environment for plugin compilation.

## Building the Twitter Profile Plugin

To build the plugin, run:

```sh
npm i
npm run build
```

This will output the wasm binary in `dist/index.wasm`.

### Running the Twitter Plugin Example

1. Build the `twitter_profile` plugin as explained above.
2. Build and install the `tlsn-extension` as documented in the [main README.md](https://github.com/tlsnotary/tlsn/blob/main/README.md).
3. [Run a local notary server](https://github.com/tlsnotary/tlsn/blob/main/notary/server/README.md), ensuring `TLS` is disabled in the [config file](https://github.com/tlsnotary/tlsn/blob/main/notary/server/config/config.yaml#L18).
4. Install the plugin: Click the **Add a Plugin (+)** button and select the `index.wasm` file you built in step 1. A **Twitter Profile** button should then appear below the default buttons.
5. Click the **Twitter Profile** button. This action opens the Twitter webpage along with a TLSNotary sidebar.
6. Follow the steps in the TLSNotary sidebar.
7. Access the TLSNotary results by clicking the **History** button in the TLSNotary extension.

## Customize the Template

You are now ready to develop your own plugins.

Notarization requests take more time than regular requests, so we recommend testing the HTTPS request in Postman or Curl first. This allows you to figure out faster which cookies and headers are required.

When you add or rename steps, make sure to update the `index.d.ts` file.

### Custom Icon

To use a custom icon, replace `icon.png` in the `./assets` folder. Make sure it is 320x320 pixels. You can use the following command:

```sh
convert icon_source.png -resize 320x320! assets/icon.png
```

## More Examples

Check the `examples` folder for more examples.
