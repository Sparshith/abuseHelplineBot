# Things we learnt building this project

## Useful post calls to add features to a facebook bot.
*  To add a getting started button
```
curl -X POST "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=PAGE_ACCESS_TOKEN"
```
* To add a persistent menu
```
curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type" : "call_to_actions",
  "thread_state" : "existing_thread",
  "call_to_actions":[
    {
      "type":"postback",
      "title":"I want to talk",
      "payload":"getStartedTalk"
    },
    {
      "type":"postback",
      "title":"I want to act",
      "payload":"getStartedAct"
    },
    {
      "type":"postback",
      "title":"I want to help",
      "payload":"getStartedHelp"
    },

  ]
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=PAGE_ACCESS_TOKEN"
```


