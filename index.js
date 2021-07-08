const npath = require('path');
const Discord = require("discord.js");
const winston = require('winston');
const config = require("../token/config3.json");
const arch = require("./architecture.js");
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    //new winston.transports.Console(),
    new winston.transports.File({ filename: npath.join(__dirname, config.pathToLog) })
  ],
});
const client = new Discord.Client();
/*
function loggerArray(logArray) {
  if (logArray != null)
    for(var i=0;i<logArray.length;i++){
      logger.info(logArray[i]);
      //console.log(logArray[i]);
    }
}

function loggerError(client, e) {
  logInfo = {
    error: e.message,
    sourceId: client.id,
    sourceUserId: client.author.id,
    sourceTimestamp: client.createdTimestamp,
    sourceContent: client.content,
    sourceChannelId: client.channel.id,
    guildSwitch: client.guildSwitch,
    channelSwitch: client.channelSwitch,
    reaction: client.configReaction
  }
  if (!client.isDm)
    logInfo['sourceGuildId'] = client.guild.id;
  logger.error(logInfo);
}
*/
client.login(config.BOT_TOKEN);

client.on("message", function(srcMessage) {
  const start = new Date();
  srcMessage.isDm = (srcMessage.channel.type == 'dm');
  srcMessage.isText = (srcMessage.channel.type == 'text');
  srcMessage.isMsgObj = true;
  if (srcMessage.author.bot || !(srcMessage.isDm || srcMessage.isText)) return;
  if (srcMessage.attachments.array().length == 0) {
    /*// TODO:
    增加CD時間
    增加Logger
    */
    /*
    arch.setConfig(srcMessage).then(() => {
      return arch.msgRouter(srcMessage);
    */
    arch.msgRouter(srcMessage);
    /*
    arch.msgRouter(srcMessage).then(logArray => {
      //loggerArray(logArray);
      const time = new Date() - start;
      console.log(time);
    }).catch(e => {
      console.log(e);
      //loggerError(srcMessage, e);
    });
    */
  }
});
