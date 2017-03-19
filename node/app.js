/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const 
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request'),
  googleplaces = require('googleplaces'),
  jsonfile = require('jsonfile'),
  quickRepliesPath = __dirname + '/data/quick_replies.json'


var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ? 
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }  
});


/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;
  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;
      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                      .digest('hex');
    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  //  console.log("Received message for user %d and page %d at %d with message:", 
  //   senderID, recipientID, timeOfMessage);
  // console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;
 
  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s", 
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);

    //Checking if quickReply exists 
  jsonfile.readFile(quickRepliesPath, function(err, obj) {
    if(err) {
      return callback&&callback(err);
    }
    
    if((quickReplyPayload in obj)) 
    {
     sendQuickReply(senderID, quickReplyPayload);
    }
    
  });
    return;
  }

  if (messageText) {
    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (messageText) {
      case 'I was abused':
      conole.log("In I was abused");  
        sendQuickReply(senderID, 'askAbusedTime');
        break;
      case 'button':
        sendButtonMessage(senderID);
      default:
      {
        sendQuickReply(senderID, 'defaultMessage');
      }
    }
  } else if (messageAttachments) {
    /**
    * Currently assume only one attachment exists
    **/
    var attachment = messageAttachments[0];
    var attachmentType = attachment.type;

    switch (attachmentType) {
      case 'location':
        console.log(attachment.payload.coordinates);
        var lat = attachment.payload.coordinates.lat;
        var lon = attachment.payload.coordinates.long;
        console.log(lat, lon);
        var NearBySearch = require("googleplaces/lib/NearBySearch");
        var nearBySearch = new NearBySearch(config.get('googlePlacesApiKey'), config.get('googlePlacesApiKeyOutputFormat'));
        var parameters = {
            location: [lat, lon],
            radius : 1000,
            type : ['hospital']
        };

        nearBySearch(parameters, function (error, response) {
            if(error) {
              console.log(error);
              return false;
            }
            sendTextMessage(senderID, "This is the nearest hospital to you. You're going to be alright" );
            sendTextMessage(senderID, "https://www.google.com/maps/dir/" + lat + "," + lon + "/" + response['results'][1]['name'].split(' ').join('+'));
        });
        break;
      default: 
        sendTextMessage(senderID, "Message with attachment received");
    }
  }
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;
  var payload = event.postback.payload;

  if(payload == 'getStarted' || payload == 'getStartedTalk' || payload == 'getStartedHelp' || payload == 'getStartedAct') {
    sendQuickReply(senderID, payload);
  }
}

function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

function sendButtonMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "This is test text",
          buttons:[{
            type: "web_url",
            url: "https://www.oculus.com/en-us/rift/",
            title: "Open Web URL"
          }, {
            type: "postback",
            title: "Trigger Postback",
            payload: "DEVELOPER_DEFINED_PAYLOAD"
          }, {
            type: "phone_number",
            title: "Call Phone Number",
            payload: "+16505551234"
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

function getUserDetails(userId, callback) {
  request({
    uri: 'https://graph.facebook.com/v2.6/'+userId,
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'GET',
    json: {}

  }, function (error, response, body) {
    if(error) {
      return callback&&callback(error);
    }

    if(response.statusCode != 200) {
      return callback&&callback('Invalid request');
    }

    var userData = {
      firstName: body.first_name
    }

    return callback&&callback(null, userData);
  });
}

function getQuickReplyOptions(useCase, callback) {
  jsonfile.readFile(quickRepliesPath, function(err, obj) {
    if(err) {
      return callback&&callback(err);
    }

    var replyOptions = obj[useCase];
    return callback&&callback(null, replyOptions);
  });
}

function sendQuickReply(recipientId, useCase) {
  var replyOptionsFetched = function(err, replyOptions) {
    if(err) {
      console.log(err);
      return false;
    }

    var messageData = {
      recipient: {
        id: recipientId
      }
    };

    var quickReplyMessage = {};

    switch(useCase) {

      case 'getStarted':
        var userDetailsFetched = function(err, userDetails) {
          quickReplyMessage = {
            text: "Hi "+  userDetails.firstName + ", What would you like to do?",
            quick_replies: replyOptions
          };
          messageData.message = quickReplyMessage;
          callSendAPI(messageData);
        }
        getUserDetails(recipientId, userDetailsFetched); 
        return;
        break;

      case 'getStartedTalk':
        quickReplyMessage = {
          text: "Tell me, I am here for you. What can I do?",
          quick_replies: replyOptions
        };
        break;

      case 'initialLocation':
        quickReplyMessage = { 
          text : "Hi " + '' + ", I am here to help you. Send us your location to help you out better.", 
          quick_replies: replyOptions
        };
        break;

      case 'askAbusedTime':
        quickReplyMessage = {
          text: "I understand this is a tough time for you. I'm going to help you. Tell me, when did this happen?",
          quick_replies: replyOptions
        };
        break;

      case 'today':
        quickReplyMessage = {
          text: "Okay, send me your location, so that I can find the nearest help",
          quick_replies: replyOptions
        };
        break;

      case 'defaultMessage':
        quickReplyMessage = {
          text: "If you feel I'm not really helping, I feel you should contact this expert, they can help! Also, please email me to tell me how I can improve ",
        }
        break;

      default: return;
        break;
    }
    messageData.message = quickReplyMessage;
    callSendAPI(messageData);
  }

  getQuickReplyOptions(useCase, replyOptionsFetched);
};

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

