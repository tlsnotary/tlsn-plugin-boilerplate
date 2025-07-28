import icon from '../assets/icon.png';
import config_json from '../config.json';
import { redirect, notarize, outputJSON, getCookiesByHost, getHeadersByHost } from './utils/hf.js';

/**
 * Plugin configuration with added input field step
 * This configurations defines the plugin, most importantly:
 *  * the different steps (now including a user input step)
 *  * the user data (headers, cookies) it will access
 *  * the web requests it will query (or notarize)
 */
export function config() {
  outputJSON({
    ...config_json,
    icon: icon,
  });
}

function isValidHost(urlString: string) {
  const url = new URL(urlString);
  return url.hostname === 'twitter.com' || url.hostname === 'x.com';
}


export function collectUserNote() {
  const inputString = Host.inputString();

  var inputData;

  try {
    if (inputString && inputString.trim() !== '') {
      inputData = JSON.parse(inputString);
    } else {
      inputData = {};
    }
  } catch (e) {
    inputData = {};
  }

  // Store the user's input to pass to subsequent steps
  outputJSON({
    userNote: inputData.userNote || 'No note provided',
    notarizeReason: inputData.notarizeReason || 'identity_verification',
    timestamp: new Date().toISOString()
  });
}

/**
 * Step 2: Implementation of the original start step
 * Now receives the user input data from the previous step
 */
export function start() {
  const inputString = Host.inputString();
  var previousData = {};
  // Handle case where input might be empty or invalid JSON
  try {
    if (inputString && inputString.trim() !== '') {
      previousData = JSON.parse(inputString);
    }
  } catch (e) {
    previousData = {};
  }

  console.log('Start step - parsed data:', previousData);

  if (!isValidHost(Config.get('tabUrl'))) {
    redirect('https://x.com');
    outputJSON(false);
    return;
  }

  // Pass along the user data to the next step
  outputJSON({
    ...previousData,
    pageValidated: true
  });
}

/**
 * Step 3: Implementation of the original "two" step
 * This step collects and validates authentication cookies and headers for 'api.x.com'.
 * If all required information is present, it creates the request object.
 */
export function two() {
  const inputString = Host.inputString();

  var previousData = {};

  // Handle case where input might be empty or invalid JSON
  try {
    if (inputString && inputString.trim() !== '') {
      previousData = JSON.parse(inputString);
    }
  } catch (e) {
    console.log('Two step - failed to parse input, using empty object:', e);
    previousData = {};
  }

  console.log('Two step - parsed data:', previousData);

  const cookies = getCookiesByHost('https://api.x.com/1.1/account/settings.json');
  const headers = getHeadersByHost('https://api.x.com/1.1/account/settings.json');

  if (
    !cookies.auth_token ||
    !cookies.ct0 ||
    !headers['x-csrf-token'] ||
    !headers['authorization'] ||
    !headers['x-client-transaction-id']
  ) {
    outputJSON(false);
    return;
  }

  const cookieString = Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; ')

  outputJSON({
    ...previousData,  // Include user input data
    requestData: {
      url: 'https://api.x.com/1.1/account/settings.json',
      method: 'GET',
      headers: {
        Cookie: cookieString,
        'x-csrf-token': headers['x-csrf-token'],
        'x-client-transaction-id': headers['x-client-transaction-id'],
        Host: 'api.x.com',
        authorization: headers.authorization,
        notarizationReason: previousData.notarizeReason,
        'Accept-Encoding': 'identity',
        Connection: 'close',
      },
      secretHeaders: [
        `x-csrf-token: ${headers['x-csrf-token']}`,
        `x-client-transaction-id: ${headers['x-client-transaction-id']}`,
        `cookie: ${cookieString}`,
        `authorization: ${headers.authorization}`,
      ],
    }
  });
}

/**
 * This method is used to parse the Twitter response and specify what information is revealed (i.e. **not** redacted)
 * This method is optional in the notarization request. When it is not specified nothing is redacted.
 *
 * In this example it locates the `screen_name` and excludes that range from the revealed response.
 */
export function parseTwitterResp() {
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);

  if (params.screen_name) {
    const revealed = `"screen_name":"${params.screen_name}"`;
    const selectionStart = bodyString.indexOf(revealed);
    const selectionEnd =
      selectionStart + revealed.length;
    const secretResps = [
      bodyString.substring(0, selectionStart),
      bodyString.substring(selectionEnd, bodyString.length),
    ];
    outputJSON(secretResps);
  } else {
    outputJSON(false);
  }
}

/**
 * Step 4: calls the `notarize` host function (original "three" step)
 * Now includes the user's custom note and reason in the metadata
 */
export function three() {
  const inputString = Host.inputString();
  console.log('Three step - raw input string:', inputString);

  var allData = {};

  // Handle case where input might be empty or invalid JSON
  try {
    if (inputString && inputString.trim() !== '') {
      allData = JSON.parse(inputString);
    }
  } catch (e) {
    allData = {};
  }

  console.log('Three step - parsed data:', allData);

  if (!allData.requestData) {
    outputJSON(false);
    return;
  }

  // Include user input in the notarization metadata
  const notarizationRequest = {
    ...allData.requestData,
    getSecretResponse: 'parseTwitterResp'
  };

  // Add metadata directly to the request
  notarizationRequest.metadata = {
    userNote: allData.userNote,
    notarizeReason: allData.notarizeReason,
  };

  const id = notarize(notarizationRequest);
  outputJSON(id);
}
