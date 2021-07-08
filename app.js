const config = require("../token/config3.json");
const sd = require("./shareData.js");
//const fn = require("./fn.js");
const q7 = require("./e-Tracking-711-lib.js");
const webCache = require('memory-cache');

async function qpkg711(messageObject ,props){
  let qStart = new Date();
  messageObject = await messageObject.delete();
  let mentionStr = '<@' + messageObject.author.id + '>';
  if (webCache.get('user_'+messageObject.author.id) != null) {
    let timePassed = qStart - webCache.get('user_'+messageObject.author.id);
    if(timePassed < config.coolDownTime) {
      let remainCDT = Math.ceil((config.coolDownTime - timePassed) / 60000);
      return messageObject.channel.send(mentionStr + " 您的冷卻時間還有"+remainCDT+"分鐘");
    }
  }
  //let res = await query711Package(messageObject.pkgid);
  if (webCache.get('711_'+props.pkgid+'_data') != null) {
    let embedResult = sd.embedResult;
    //console.log("Read from cache");
    embedResult.content = mentionStr + " "+ embedResult.content;
    embedResult.embed.description = webCache.get('711_'+props.pkgid+'_data');
    embedResult.embed.timestamp = webCache.get('711_'+props.pkgid+'_time');
    return messageObject.channel.send(embedResult);
  }
  //console.log("Preform web search");
  var info;
  for(var i=0;i<config.retryCount;i++) {
    console.log(i);
    info = await q7.query711Package(props.pkgid);
    if(info.code == 200 || info.code == 404 || info.code == 417) break;
    await q7.sleep(config.retryDelay);
  }
  if(info.code == 417)
    return messageObject.channel.send(info.data);
  //console.log(info);
  webCache.put('user_'+messageObject.author.id, new Date(), config.cacheTimeout);
  webCache.put('711_'+props.pkgid+'_data', info.data, config.cacheTimeout);
  webCache.put('711_'+props.pkgid+'_time', qStart, config.cacheTimeout);
  let embedResult = sd.embedResult;
  embedResult.content = mentionStr + " "+ embedResult.content;
  embedResult.embed.description = info.data;
  embedResult.embed.timestamp = qStart;
  return messageObject.channel.send(embedResult);

}

module.exports = {
  qpkg711
};
