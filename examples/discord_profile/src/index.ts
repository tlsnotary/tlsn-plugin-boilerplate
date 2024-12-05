import { redirect, notarize, outputJSON, getLocalStorageByHost, getHeadersByHost } from '../../../src/utils/hf';

function isValidHost(urlString: string) {
  const url = new URL(urlString);
  return url.hostname === 'discord.com' || url.hostname === 'discord.gg'
}

export function start() {
  if (!isValidHost(Config.get('tabUrl'))) {
    redirect('https://discord.com/channels/@me')
    outputJSON(false);
    return;
  }
  outputJSON(true);
}


export function two() {
  const localStorage = getLocalStorageByHost('discord.com');
  let userId = localStorage.user_id_cache;
  userId = userId.replace(/"/g, "");
  const headers = getHeadersByHost(`discord.com`)
  console.log(JSON.stringify(headers));
  console.log(localStorage.user_id_cache);
  if (
    !localStorage.user_id_cache ||
    !headers['Authorization']
  ) {
    outputJSON(false);
    return;
  }
  console.log('here');
  outputJSON({
    url: `https://discord.com/api/v9/users/${userId}/profile`,
    method: 'GET',
    headers: {
      Host: 'discord.com',
      Accept: '*/*',
      'Accept-Encoding': 'identity',
      'User-Agent': headers['User-Agent'],
      Authorization: headers['Authorization'],
      Connection: 'close'
    },
    secretHeaders: [
      `Authorization: ${headers['Authorization']}`
    ]
  });
}

export function parseDiscordProfile() {
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);

  if (params.user?.username) {
    const revealed = JSON.stringify({
      username: params.user.username,
      global_name: params.user.global_name,
    }).slice(1, -1);

    const selectionStart = bodyString.indexOf(revealed);
    if (selectionStart === -1) {
      outputJSON([bodyString]);
      return;
    }

    const selectionEnd = selectionStart + revealed.length;
    const secretResps = [
      bodyString.substring(0, selectionStart),
      bodyString.substring(selectionEnd),
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
      getSecretResponse: 'parseDiscordProfile'
    })
    outputJSON(id);
  }
}



export function config() {
 outputJSON({
  title: 'Discord Profile',
      description: 'Notarize your Discord Profile',

      steps: [
        {
          title: "Goto Discord",
          description: "Log in to your discord if you haven't already",
          cta: "Go to discord.com",
          action: 'start'
        },
        {
          title: 'Collect credentials',
          description: "Check Local Storage for User ID",
          cta: 'Check localstorage',
          action: 'two',
        },
        {
          title: 'Notarize Discord Profile',
          cta: 'Notarize',
          action: 'three',
          prover: true,
        }
      ],
      hostFunctions: ['redirect', 'notarize'],
      headers: [
        "discord.com",
        ],
      localStorage: ['discord.com'],
      requests: [
        {
          url: `https://discord.com/api/v9/users/*/profile`,
          method: 'GET',
        },
      ],
 })
}
