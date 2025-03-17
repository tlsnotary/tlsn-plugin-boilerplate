import { redirect, notarize, outputJSON, getHeadersByHost, getCookiesByHost } from '../../../src/utils/hf';

/**
 * Plugin configuration
 * This configurations defines the plugin, most importantly:
 *  * the different steps
 *  * the user data (headers, cookies) it will access
 *  * the web requests it will query (or notarize)
 */
export function config() {
  outputJSON({
    title: 'ID.me Notarization',
    description: 'Notarize your ID.me credentials',
    steps: [
      {
        title: 'Goto ID.me',
        description: 'Log in to your ID.me account',
        cta: 'Go to ID.me',
        action: 'start',
      },
      {
        title: 'Get ID.me credentials',
        description: 'Get your ID.me credentials',
        cta: 'Get credentials',
        action: 'two',
      },
      {
        title: 'Notarize ID.me credentials',
        cta: 'Notarize',
        action: 'three',
        prover: true,
      }
    ],
    hostFunctions: ['redirect', 'notarize'],
    headers: ['account.id.me'],
    cookies: ['account.id.me'],
    requests: [
      {
        url: 'https://account.id.me/api/v3/credentials.json',
        method: 'GET',
      },
    ]
  })
}

function isValidHost(urlString: string) {
  const url = new URL(urlString);
  return url.hostname === 'account.id.me'
}

/**
 * Implementation of the first (start) plugin step
  */
export function start() {
  const tabUrl = Config.get('tabUrl');
  if (tabUrl && isValidHost(tabUrl)) {
    redirect('https://account.id.me/wallet/ids')
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
  const cookies = getCookiesByHost('account.id.me');
  const headers = getHeadersByHost('account.id.me');

  // console.log(JSON.stringify(cookies));
  // console.log(JSON.stringify(headers));

  if (
    !cookies["idme-session"] ||
    !headers['X-CSRF-TOKEN']
  ) {
    outputJSON(false);
    return;
  }

  outputJSON({
    url: 'https://account.id.me/api/v3/credentials.json',
    method: 'GET',
    headers: {
      'x-csrf-token': headers['x-csrf-token'],
      Cookie: `idme-session=${cookies['idme-session']}`,
      'Accept-Encoding': 'identity',
      Connection: 'close',
    },
    secretHeaders: [
      `x-csrf-token: ${headers['X-CSRF-TOKEN']}`,
      `cookie: idme-session=${cookies['idme-session']}`,
    ],
  })
}

/**
 * This method is used to parse the Twitter response and specify what information is revealed (i.e. **not** redacted)
 * This method is optional in the notarization request. When it is not specified nothing is redacted.
 *
 * In this example it locates the `screen_name` and excludes that range from the revealed response.
 */
export function parseIdentity() {
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);

  console.log("params");
  console.log(JSON.stringify(params));

  if (params.screen_name) {
    const revealed = `full_name: ${params[0].full_name}`;
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
 * Step 3: calls the `notarize` host function
 */
export function three() {
  const params = JSON.parse(Host.inputString());
  if (!params) {
    outputJSON(false);
  } else {
    const id = notarize({
      ...params,
      getSecretResponse: 'parseIdentity',
    })
    outputJSON(id);
  }
}
