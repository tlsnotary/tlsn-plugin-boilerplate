import icon from '../assets/icon.png';
import config_json from '../config.json';
import { redirect, notarize, outputJSON, getCookiesByHost, getHeadersByHost } from './utils/hf.js';

export function config() {
  outputJSON({
    ...config_json,
    icon: icon
  });
}


/**
 * Implementation of the first (start) plugin step
*/
export function start() {
  const dashboard_url = 'https://www.fitbit.com/dashboard';
  if (!(Config.get('tabUrl') == dashboard_url)) {
    redirect(dashboard_url);
    outputJSON(false);
    return;
  }
  outputJSON(true);
}

export function two() {
  const cookies = getCookiesByHost('www.fitbit.com');
  const headers = getHeadersByHost('www.fitbit.com');

  console.log(`Fitbit plugin coockies:`)
  console.log(JSON.stringify(cookies))
  // console.log(JSON.stringify(headers))

  if (
    !cookies.oauth_access_token
  ) {
    outputJSON(false);
    return;
  }

  outputJSON({
    url: 'https://web-api.fitbit.com/1/user/4G7WVQ/profile.json',
    method: 'GET',
    headers: {
      authorization: "Bearer " + cookies.oauth_access_token,
      'Accept-Encoding': 'identity',
      Connection: 'close',
    },
    secretHeaders: [
      `Bearer ${cookies.oauth_access_token}`,
    ],
  });
}

export function parseResp() {
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);
  // console.log("params")
  // console.log(JSON.stringify(params))
  // console.log(JSON.stringify(params.user))
  // console.log(JSON.stringify(params.user.fullName))

  if (params?.user?.fullName) {
    const revealed = `"fullName":"${params.user.fullName}"`;
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

export function three() {
  const params = JSON.parse(Host.inputString());

  if (!params) {
    outputJSON(false);
  } else {
    const id = notarize({
      ...params,
      getSecretResponse: 'parseResp',
    });
    outputJSON(id);
  }
}
