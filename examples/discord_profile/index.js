function isValidHost(urlString) {
  const url = new URL(urlString);
  return url.hostname === 'discord.com' || url.hostname === 'discord.gg'
}


function gotoDiscord() {
  const { redirect } = Host.getFunctions();
  const mem = Memory.fromString('https://discord.com/channels/@me');
  redirect(mem.offset);
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
  const localStorage = JSON.parse(Config.get('localStorage'))['discord.com'];
  let userId = localStorage.user_id_cache;
  userId = userId.replace(/"/g, "");
  console.log(JSON.stringify(localStorage));

  const headers = JSON.parse(Config.get('headers'))[`https://discord.com/api/v9/users/${userId}/profile`];
  console.log(JSON.stringify(headers));


  if (
    !localStorage.user_id_cache ||
    !headers['Authorization']
  ) {
    Host.outputString(JSON.stringify(false));
    return;
  }

  Host.outputString(
    JSON.stringify({
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
  }))
}

function parseDiscordProfile() {
  const bodyString = Host.inputString();
  const params = JSON.parse(bodyString);

  if (params.user?.username) {
    const revealed = JSON.stringify({
      username: params.user.username,
      global_name: params.user.global_name,
    }).slice(1, -1);

    const selectionStart = bodyString.indexOf(revealed);
    if (selectionStart === -1) {
      Host.outputString(JSON.stringify([bodyString]));
      return;
    }

    const selectionEnd = selectionStart + revealed.length;
    const secretResps = [
      bodyString.substring(0, selectionStart),
      bodyString.substring(selectionEnd),
    ];
    Host.outputString(JSON.stringify(secretResps));
  } else {
    Host.outputString(JSON.stringify(false));
  }
}



function three() {
  const params = JSON.parse(Host.inputString());
  const { notarize } = Host.getFunctions();

  if (!params) {
    Host.outputString(JSON.stringify(false))
  } else {
    const mem = Memory.fromString(JSON.stringify({
      ...params,
      getSecretResponse: 'parseDiscordProfile'
    }));
    const idOffset = notarize(mem.offset);
    const id = Memory.find(idOffset).readString();
    Host.outputString(JSON.stringify(id));
  }
}



function config() {
  Host.outputString(
    JSON.stringify({
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
        "https://discord.com/api/v9/users/*/profile"
        ],
      localStorage: ['discord.com'],
      requests: [
        {
          url: `https://discord.com/api/v9/users/*/profile`,
          method: 'GET',
        },
      ],
    }),
  );
}


module.exports = { start, two, config, three, parseDiscordProfile };
