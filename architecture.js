const config = require("../token/config3.json");
const a = require("./app.js");
//const sd = require("./shareData.js");
const dbCache = require('memory-cache');

let switchOrderList = [
  {
    patt: /p7! 7-11 (?<pkgid>[A-Z]\d{11})/i,
    action: a.qpkg711,
    varExt: { opCode: "qpkg711" }
  }
];

async function setEmbedMsgCache(client) {
  var cacheKey = 'cacheMsg_' + client.message.id + '_' + client.message.channel.id;
  if (!client.isDm) {
    cacheKey += '_' + client.message.channel.guild.id;
  }
  if (dbCache.get(cacheKey) != null) {
    client.cacheData = dbCache.get(cacheKey);
    return;
  }
  client.cacheData = await dbop.fetchCache(client.message);
}

function permissionCheckBot(client) {
  var messageObject = {};
  if (client.isMsgObj) messageObject = client;
  else messageObject = client.message;
  return [
    //sendMessage
    messageObject.channel.permissionsFor(messageObject.channel.guild.me).has(0x4800),
    //manageMessage
    messageObject.channel.permissionsFor(messageObject.channel.guild.me).has(0x2000)
  ]
}

function msgRouter(messageObj) {
  let message = messageObj.content;
  let route = [
    //...switchOrderList,
    ...switchOrderList
    /*
    {
      patt: new RegExp(`^${config.prefix} help`,'i'),
      action: a.dmHelpMessage,
      varExt: {
        opCode: "help",
        color: config.colors[1],
        thumbnail: config.thumbnail,
        description: config.commandDescription
      }
    }
    */
  ];
  //let matchRoute = route.find((route) => message.match(route.patt));
  for (var i=0;i<route.length;i++) {
    let currRoute = route[i];
    let regexResult = currRoute.patt.exec(message);
    if (!regexResult) continue;

    var props = {};
    if (regexResult.groups != null)
    for (var j=0;j<Object.keys(regexResult.groups).length;j++) {
      props[Object.keys(regexResult.groups)[j]] = Object.values(regexResult.groups)[j];
    }

    for (var j=0;j<Object.keys(route[i]['varExt']).length;j++) {
      props[Object.keys(route[i]['varExt'])[j]] = Object.values(route[i]['varExt'])[j];
    }
    /*
    let checkPermissionResult = permissionCheckUser(messageObj, currRoute.varExt.opCode);
    if (!checkPermissionResult) throw new Error("Permission denied");
    */
    checkPermissionResult = permissionCheckBot(messageObj);
    if (!checkPermissionResult[0]) throw new Error("Permission of bot denied, exit!");
    messageObj.isMessageManager = checkPermissionResult[1];

    /*
    if (match.middleware) {
      match.middleware(client);
    }
    */
    return currRoute.action(messageObj, props);
  }
}

module.exports = {
  setEmbedMsgCache,
  //setConfig,
  msgRouter
};
