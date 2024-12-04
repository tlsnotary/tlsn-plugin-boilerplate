function isValidHost(urlString) {
  const url = new URL(urlString);
  return url.hostname === 'discord.com' || url.hostname === 'discord.gg'
}


function gotoDiscord() {
  const { redirect } = Host.getFunctions();
  const mem = Memory.fromString('https://discord.com/channels/@me');
  redirect(mem.offset);
}

function extractConversationId(urlString) {
  const url = new URL(urlString);
  if (url.hostname === 'discord.com' && /\/channels\/@me\/[0-9]+$/.test(url.pathname)) {
    return url.pathname.split('/@me/')[1]
  } else {
    return url.pathname.split('/channels/')[1]
  }
}

function start() {
  if (!isValidHost(Config.get('tabUrl'))) {
    gotoDiscord();
    Host.outputString(JSON.stringify(false));
    return;
  }
  Host.outputString(JSON.stringify(true));
}


function two() {
  const conversationId = extractConversationId(Config.get('tabUrl'));
  // const cookies = JSON.parse(Config.get('cookies'))['discord.com'];
  const headers = JSON.parse(Config.get('headers'))['discord.com'];

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

  Host.outputString(
    JSON.stringify({
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
  )
}

function parseDiscordDm() {
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);
  console.log('PARAMS', JSON.stringify(params[0].content));
  if (params[0].content) {
    const revealed = `"content":"${params[0].content}"`;
    const selectionStart = bodyString.indexOf(revealed);
    const selectionEnd = selectionStart + revealed.length;
    const secretResps = [
      bodyString.substring(0, selectionStart),
      bodyString.substring(selectionEnd, bodyString.length),
    ];
    Host.outputString(JSON.stringify(secretResps));
  } else {
    Host.outputString(JSON.stringify(false));
  }
}


function three() {
  const params = JSON.parse(Host.inputString());
  const { notarize } = Host.getFunctions();
  console.log(JSON.stringify('THREE PARAMS', params));
  if (!params) {
    Host.outputString(JSON.stringify(false));
  } else {
    const mem = Memory.fromString(JSON.stringify({
        ...params,
       getSecretResponse: 'parseDiscordDm'
    }));
    const idOffset = notarize(mem.offset);
    const id = Memory.find(idOffset).readString();
    Host.outputString(JSON.stringify(id));
  }
}

function config() {
  Host.outputString(
    JSON.stringify({
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
      headers: ['discord.com'],
      requests: [
        {
          url: `https://discord.com/api/v9/channels/*/messages?limit=2`,
          method: 'GET',
        },
      ],
    }),
  );
}


module.exports = { config, start, two, three, parseDiscordDm };
