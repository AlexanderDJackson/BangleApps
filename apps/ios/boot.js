bleServiceOptions.ancs = true;
Bangle.ancsMessageQueue = [];

/* Handle ANCS events coming in, and fire off 'notify' events
when we actually have all the information we need */
E.on('ANCS',msg=>{
  /* eg:
  {
    event:"add",
    uid:42,
    category:4,
    categoryCnt:42,
    silent:true,
    important:false,
    preExisting:true,
    positive:false,
    negative:true
    } */

  //console.log("ANCS",msg.event,msg.id);
  // don't need info for remove events - pass these on
  if (msg.event=="remove")
    return E.emit("notify", msg);

  // not a remove - we need to get the message info first
  function ancsHandler() {
    var msg = Bangle.ancsMessageQueue[0];
    NRF.ancsGetNotificationInfo( msg.uid ).then( info => {
      E.emit("notify", Object.assign(msg, info));
      Bangle.ancsMessageQueue.shift();
      if (Bangle.ancsMessageQueue.length)
        ancsHandler();
    });
  }
  Bangle.ancsMessageQueue.push(msg);
  // if this is the first item in the queue, kick off ancsHandler,
  // otherwise ancsHandler will handle the rest
  if (Bangle.ancsMessageQueue.length==1)
    ancsHandler();
});

// Handle ANCS events with all the data
E.on('notify',msg=>{
/* Info from ANCS event plus
  "uid" : int,
  "appId" : string,
  "title" : string,
  "subtitle" : string,
  "message" : string,
  "messageSize" : string,
  "date" : string,
  "posAction" : string,
  "negAction" : string,
  "name" : string,
*/
  var appNames = {
    "nl.ah.Appie": "Albert Heijn",
    "com.apple.mobilecal": "Calendar",
    "com.apple.mobilemail": "Mail",
    "com.apple.reminders": "Reminders",
    "com.apple.shortcuts": "Shortcuts",
    "com.atebits.Tweetie2": "Twitter",
    "com.burbn.instagram" : "Instagram",
    "com.facebook.Facebook": "Facebook",
    "com.facebook.Messenger": "FB Messenger",
    "com.google.Gmail" : "GMail",
    "com.google.hangouts" : "Hangouts",
    "com.google.ios.youtube" : "YouTube",
    "com.jumbo.app" : "Jumbo",
    "com.netflix.Netflix" : "Netflix",
    "com.skype.skype": "Skype",
    "com.skype.SkypeForiPad": "Skype",
    "com.spotify.client": "Spotify",
    "net.whatsapp.WhatsApp": "WhatsApp",
    "com.wordfeud.free": "WordFeud",

    // could also use NRF.ancsGetAppInfo(msg.appId) here
  };
  var unicodeRemap = {
    '2019':"'"
  };
  var replacer = ""; //(n)=>print('Unknown unicode '+n.toString(16));
  if (appNames[msg.appId]) msg.a
  require("messages").pushMessage({
    t : msg.event,
    id : msg.uid,
    src : appNames[msg.appId] || msg.appId,
    title : msg.title&&E.decodeUTF8(msg.title, unicodeRemap, replacer),
    subject : msg.subtitle&&E.decodeUTF8(msg.subtitle, unicodeRemap, replacer),
    body : msg.message&&E.decodeUTF8(msg.message, unicodeRemap, replacer)
  });
  // TODO: posaction/negaction?
});

// Apple media service
E.on('AMS',a=>{
  function push(m) {
    var msg = { t : "modify", id : "music", title:"Music" };
    if (a.id=="artist")  msg.artist = m;
    else if (a.id=="album")  msg.artist = m;
    else if (a.id=="title")  msg.tracl = m;
    else return; // duration? need to reformat
    require("messages").pushMessage(msg);
  }
  if (a.truncated) NRF.amsGetMusicInfo(a.id).then(push)
  else push(a.value);
});

// Music control
Bangle.musicControl = cmd => {
  // play, pause, playpause, next, prev, volup, voldown, repeat, shuffle, skipforward, skipback, like, dislike, bookmark
  NRF.amsCommand(cmd);
};
// Message response
Bangle.messageResponse = (msg,response) => {
  if (isFinite(msg.id)) return NRF.sendANCSAction(msg.id, response);//true/false
  // error/warn here?
};
// remove all messages on disconnect
NRF.on("disconnect", () => require("messages").clearAll());

/*
// For testing...

NRF.ancsGetNotificationInfo = function(uid) {
  print("ancsGetNotificationInfo",uid);
  return Promise.resolve({
    "uid" : uid,
    "appId" : "Hangouts",
    "title" : "Hello",
    "subtitle" : "There",
    "message" : "Lots and lots of text",
    "messageSize" : 100,
    "date" : "...",
    "posAction" : "ok",
    "negAction" : "cancel",
    "name" : "Fred",
  });
};

E.emit("ANCS", {
    event:"add",
    uid:42,
    category:4,
    categoryCnt:42,
    silent:true,
    important:false,
    preExisting:true,
    positive:false,
    negative:true
});

*/
