import icon from '../assets/icon.png';
import config_json from '../config.json';
import { redirect, notarize, outputJSON, getCookiesByHost, getHeadersByHost } from './utils/hf.js';


/**
 * Plugin configuration
 * This configurations defines the plugin, most importantly:
 *  * the different steps
 *  * the user data (headers, cookies) it will access
 *  * the web requests it will query (or notarize)
 */
export function config() {
    outputJSON({
        ...config_json,
        icon: icon
    });
}


// customer ID : xxxxx
// password : xxxxx

function isValidHost(urlString: string) {
    const url = new URL(urlString);
    return url.hostname === 'axisbank.com' || url.hostname === 'omni.axisbank.co.in';
}

/**
 * Implementation of the first (start) plugin step
  */
export function start() {
    if (!isValidHost(Config.get('tabUrl'))) {
        redirect('https://omni.axisbank.co.in/axisretailbanking/');
        outputJSON(false);
        return;
    }
    outputJSON(true);
}

/**
 * Implementation of step "two".
 * This step collects and validates authentication cookies and headers for 'api.x.com'.
 * If all required information, it creates the request object.
 * Note that the url needs to be specified in the `config` too, otherwise the request will be refused.
 */
export function two() {
    const cookies = getCookiesByHost('omni.axisbank.co.in');
    const headers = getHeadersByHost('omni.axisbank.co.in');

    console.log("cookies bruhhh");
    console.log(cookies["XSRF-TOKEN"]);
    console.log(JSON.stringify(cookies));
    let cookie_value = cookies["mbox"];
    let session_id = cookie_value.match(/(?<=session#)[^#]+(?=#)/);
    console.log(session_id);
    console.log("headers");

    if (
        !cookies["XSRF-TOKEN"] ||
        !cookies["mbox"]
    ) {
        outputJSON(false);
        return;
    }

    outputJSON({
        url: `https://axisbank.tt.omtrdc.net/rest/v1/delivery?client=axisbank&sessionId=${session_id}&version=2.9.0`,
        method: 'POST',
        body: {
            "requestId": "tlsnotary-request",
            "context": {
                "timeOffsetInMinutes": 540,
                "channel": "web",
                "address": {
                    "url": "https://omni.axisbank.co.in/axisretailbanking/",
                    "referringUrl": "https://www.axisbank.com/"
                }
            },
            "property": { "token": "9ce88a12-5059-0b74-f70e-asd242" },// find the token from the axisbank website
            "execute": { "pageLoad": { "parameters": { "viewName": "omni_postlogin_dashboard_undefined" } } }
        },
        headers: {
            "Accept-Language": "en-GB,en;q=0.5",
            "Origin": "https://omni.axisbank.co.in",
            "Referer": "https://omni.axisbank.co.in/",
            "Content-Type": "application/json",
            Cookie: Object.entries(cookies)
                .map(([k, v]) => `${k}=${v}`).join('; '),
            'Accept-Encoding': 'identity',
            Connection: 'close',
        },
    });
}

/**
 * This method is used to parse the Twitter response and specify what information is revealed (i.e. **not** redacted)
 * This method is optional in the notarization request. When it is not specified nothing is redacted.
 *
 * In this example it locates the `screen_name` and excludes that range from the revealed response.
 */
export function parseAxisResp() {
    console.log("parseAxisResp: Starting function");
    const bodyString = Host.inputString();
    let params;

    try {
        params = JSON.parse(bodyString);
        console.log("Successfully parsed JSON");
    } catch (e) {
        console.error("Error parsing JSON:", e);
        outputJSON(false);
        return;
    }

    if (params.status !== 200) {
        console.error("Received non-200 status:", params.status);
        outputJSON(false);
        return;
    }

    console.log("Status 200 received, proceeding to redact sensitive information");

    // Function to find the CUST_NAME key
    const findCustomerNameKey = (obj: any): string | null => {
        if (typeof obj !== 'object' || obj === null) return null;
        for (const key in obj) {
            if (key.startsWith('crs.') && key.endsWith('.CUST_NAME')) {
                return key;
            }
        }
        return null;
    };

    const responseTokens = params.execute?.pageLoad?.options?.[0]?.responseTokens || {};
    const customerNameKey = findCustomerNameKey(responseTokens);
    const customerName = customerNameKey ? responseTokens[customerNameKey] : 'Not Found';

    // Create an array of strings to redact
    const redactStrings = [
        `"${customerNameKey}":"${customerName}"`,
        `"tntId":"${params.id?.tntId || ''}"`,
        // Add more strings to redact as needed
    ];

    // Filter out any undefined or empty strings
    const validRedactStrings = redactStrings.filter(s => s && s.includes(':'));

    console.log("Strings to redact:", validRedactStrings);

    // Create the secretResps array with the original body string and the strings to redact
    const secretResps = [bodyString, ...validRedactStrings];

    console.log("parseAxisResp: Finished processing");

    outputJSON(secretResps);
}

/**
 * Step 3: calls the `notarize` host function
 */
export function three() {
    const params = JSON.parse(Host.inputString());
    console.log("three params");
    console.log(JSON.stringify(params));

    if (!params) {
        outputJSON(false);
    } else {
        const id = notarize({
            ...params,
            //getSecretResponse: 'parseAxisResp',
        });
        console.log("three fx id : ", id);
        outputJSON(id);
    }
}
