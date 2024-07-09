import { icon } from '../dist/assets/icon';
import config_json from '../config.json';
/**
 * Plugin configuration
 * This configurations defines the plugin, most importantly:
 *  * the different steps
 *  * the user data (headers, cookies) it will access
 *  * the web requests it will query (or notarize)
 */
export function config() {
  Host.outputString(
    JSON.stringify({
      ...config_json,
      icon: icon
    }),
  );
}

function isValidHost(urlString) {
  const url = new URL(urlString);
  return url.hostname === 'account.id.me'
}

/**
 * Redirect the browser window to x.com
 * This uses the `redirect` host function (see index.d.ts)
 */
function gotoIDME() {
  const { redirect } = Host.getFunctions();
  const mem = Memory.fromString('https://account.id.me/wallet/ids');
  redirect(mem.offset);
}

/**
 * Implementation of the first (start) plugin step
  */
export function start() {
  if (!isValidHost(Config.get('tabUrl'))) {
    gotoIDME();
    Host.outputString(JSON.stringify(false));
    return;
  }
  Host.outputString(JSON.stringify(true));
}

/**
 * Implementation of step "two".
 * This step collects and validates authentication cookies and headers for 'api.x.com'.
 * If all required information, it creates the request object.
 * Note that the url needs to be specified in the `config` too, otherwise the request will be refused.
 */
export function two() {
  const cookies = JSON.parse(Config.get('cookies'))['account.id.me'];
  const headers = JSON.parse(Config.get('headers'))['account.id.me'];

  // console.log(JSON.stringify(cookies));
  // console.log(JSON.stringify(headers));

  if (
    !cookies["idme-session"] ||
    !headers['X-CSRF-TOKEN']
  ) {
    Host.outputString(JSON.stringify(false));
    return;
  }

  Host.outputString(
    JSON.stringify({
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
    }),
  );
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
    Host.outputString(JSON.stringify(secretResps));
  } else {
    Host.outputString(JSON.stringify(false));
  }
}

/**
 * Step 3: calls the `notarize` host function
 */
export function three() {
  const params = JSON.parse(Host.inputString());
  const { notarize } = Host.getFunctions();

  if (!params) {
    Host.outputString(JSON.stringify(false));
  } else {
    const mem = Memory.fromString(JSON.stringify({
      ...params,
      getSecretResponse: 'parseTwitterResp',
    }));
    const idOffset = notarize(mem.offset);
    const id = Memory.find(idOffset).readString();
    Host.outputString(JSON.stringify(id));
  }
}
