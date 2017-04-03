require('dotenv-extended').load();
var restify = require('restify');
var builder = require('botbuilder');
var apiHandler = require('./api-handler-service');
var util = require('util');
var zummerStrings = require('./zummer-strings.js');
var bingSearchService = require('./bing-search-service.js');
var bingSummarizerService = require('./bing-summarizer-service.js');
var urlObj = require('url');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());
var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/f685cfa9-87d4-4ba0-9c96-a7e02ac8b7d9?subscription-key=1880aee1ec4d4cb1919e61f7547081a0&verbose=true&timezoneOffset=0.0&q=');
var intents = new builder.IntentDialog({ recognizers: [recognizer] });









//=========================================================
// Bots Dialogs
//=========================================================


bot.dialog('/', intents);




//wiki search

intents.matches('Greeting', [
        (session) => {
            session.send(zummerStrings.GreetOnDemand).endDialog();
        }
    ])
    .matches('Search', [
        (session, args) => {
            var entityRecognized;
            var query;

            if ((entityRecognized = builder.EntityRecognizer.findEntity(args.entities, 'ArticleTopic'))) {
                query = entityRecognized.entity;
            } else {
                query = session.message.text;
            }

            bingSearchService.findArticles(query).then((bingSearch) => {

                session.send(zummerStrings.SearchTopicTypeMessage);

                var zummerResult = prepareZummerResult(query, bingSearch.webPages.value[0]);

                bingSummarizerService.getSummary(zummerResult.url).then((bingSummary) => {
                    if (bingSummary && bingSummary.Data && bingSummary.Data.lenght != 0) {

                        var summaryText = util.format("### [%s](%s)\n**%s**\n\n", zummerResult.title, zummerResult.url, zummerStrings.SummaryString);

                        bingSummary.Data.forEach((datum) => {
                            summaryText += datum.Text + "\n\n";
                        });

                        summaryText += util.format("*%s*", util.format(zummerStrings.PoweredBy, util.format("[Bing™](https://www.bing.com/search/?q=%s site:wikipedia.org)", zummerResult.query)));

                        session.send(summaryText).endDialog();
                    } else {
                        session.send(zummerStrings.SummaryErrorMessage).endDialog();
                    }
                }).catch(() => { session.send(zummerStrings.SummaryErrorMessage).endDialog(); });
            }).catch(() => {
                session.endDialog();
            });
        }
    ])
    .onDefault((session) => {
        session.send(zummerStrings.FallbackIntentMessage).endDialog();
    }); 




function prepareZummerResult(query, bingSearchResult) {
    var myUrl = urlObj.parse(bingSearchResult.url, true);
    var zummerResult = {};

    if (myUrl.host == "www.bing.com" && myUrl.pathname == "/cr") {
        zummerResult.url = myUrl.query["r"];
    } else {
        zummerResult.url = bingSearchResult.url;
    }

    zummerResult.title = bingSearchResult.name;
    zummerResult.query = query;
    zummerResult.snippet = bingSearchResult.snippet;

    return zummerResult;
}

//end wiki


intents.matches('SayTest', [
    function (session, args, next) {
        var say = builder.EntityRecognizer.findEntity(args.entities, 'entityTest');
        if (!say) {
            builder.Prompts.text(session, "What would you like me to say ?");
        } else {
            next({ response: say.entity });
        }
    },
    function (session, results) {
        if (results.response) {
            // ... save task
            session.send("Ok... '%s' ", results.response);
        } else {
            session.send("Ok");
        }
    }
]);



intents.matches('GetTempFromApi', [
    function (session, args, results) {
        var ServerRoom = builder.EntityRecognizer.findEntity(args.entities, 'ServerRoom');
        if (ServerRoom) {
            session.send("Ok treff på GetServerRoomTemp", results.response);
        } else {
            session.send("GetServerRoomTemp ikke treff men fikk arg '%s'", results.response);
        }
    },
]);



intents.matches('GetLastTickHackerWars', [
    function (session) {
    var http = require("http");

    var options = {
        host: 'hacker-wars.com',
        path: '/lasttick'
    };

    http.get(options, function (http_res) {
        // initialize the container for our data
        var data = "";

        // this event fires many times, each time collecting another piece of the response
        http_res.on("data", function (chunk) {
            // append this chunk to our growing `data` var
            data += chunk;
        });

        // this event fires *one* time, after all the `data` events/chunks have been gathered
        http_res.on("end", function () {
            // you can use res.send instead of console.log to output via express
            session.send("The last tick was %s seconds ago", data);
        });
    });

}]);






intents.onDefault(builder.DialogAction.send("I'm sorry. I didn't understand."));





//=========================================================
// Bots simple shit
//=========================================================


intents.matches(/^echo/i, [
    function (session) {
        builder.Prompts.text(session, "What would you like me to say?");
    },
    function (session, results) {
        session.send("Ok... %s", results.response);
    }
]);



intents.matches(/^last tick/i, function (session) {
    var http = require("http");

    var options = {
        host: 'hacker-wars.com',
        path: '/lasttick' 
    };

    http.get(options, function (http_res) {
        // initialize the container for our data
        var data = "";

        // this event fires many times, each time collecting another piece of the response
        http_res.on("data", function (chunk) {
            // append this chunk to our growing `data` var
            data += chunk;
        });

        // this event fires *one* time, after all the `data` events/chunks have been gathered
        http_res.on("end", function () {
            // you can use res.send instead of console.log to output via express
            session.send("The last tick was %s seconds ago", data);
        });
    });
    
});





intents.matches(/^version/i, function (session) {
    session.send('I am Noty v0.02');
});





