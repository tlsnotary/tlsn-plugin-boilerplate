import { redirect, notarize, outputJSON, getHeadersByHost } from '../../../src/utils/hf';


function isValidHost(urlString: string) {
  const url = new URL(urlString);
  return url.hostname === 'discord.com' || url.hostname === 'discord.gg'
}

function extractConversationId(urlString: string) {
  const url = new URL(urlString);
  if (url.hostname === 'discord.com' && /\/channels\/@me\/[0-9]+$/.test(url.pathname)) {
    return url.pathname.split('/@me/')[1]
  } else {
    return url.pathname.split('/channels/')[1]
  }
}


export function start() {
  const tabUrl = Config.get('tabUrl');
  if (tabUrl && !isValidHost(tabUrl)) {
    redirect('https://discord.com/channels/@me')
    outputJSON(false);
    return;
  }
  outputJSON(true);
}


export function two() {
    const conversationId = extractConversationId(Config.get('tabUrl') ?? '');
    // const cookies = JSON.parse(Config.get('cookies'))['discord.com'];
    const headers = getHeadersByHost('https://discord.com/api/v9/channels/**/messages');

    // console.log("conversationId");
    // console.log(JSON.stringify(conversationId));
    // console.log(JSON.stringify(headers['Authorization']));

    if (
      !conversationId ||
      !headers['Authorization']
    ) {
      Host.outputString(JSON.stringify(false));
      return;
  }

  outputJSON({
      url: `https://discord.com/api/v9/channels/${conversationId}/messages?limit=2`,
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
        `authorization: ${headers['Authorization']}`
      ]

})
}

export function parseDiscordDm() {
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);

  if (params[0].content) {
    const revealed = `"content":"${params[0].content}"`;
    const selectionStart = bodyString.indexOf(revealed);
    const selectionEnd = selectionStart + revealed.length;
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
      getSecretResponse: 'parseDiscordDm'
    })
    outputJSON(id);
  }
}

export function config() {
  outputJSON({
    title: 'Discord DMs',
    description: 'Notarize your Discord DMs',

    steps: [
      {
        title: "Goto Discord DM's",
        description: "Log in to your discord if you haven't already",
        cta: "Go to discord.com",
        action: 'start'
      },
      {
        title: 'Open the DM you want to notarize',
        description: "Pick a short conversation (to meet the current size limits)",
        cta: 'Check',
        action: 'two'
      },
      {
        title: 'Notarize DM',
        cta: 'Notarize',
        action: 'three',
        prover: true
      }
    ],
    hostFunctions: ['redirect', 'notarize'],
    headers: ['discord.com',
      'https://discord.com/api/v9/channels/**/messages'
    ],
    requests: [
      {
        url: `https://discord.com/api/v9/channels/**/messages?limit=2`,
        method: 'GET',
      },
    ],
  })
}
