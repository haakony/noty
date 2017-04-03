require('dotenv-extended').load();
var restify = require('restify');
var builder = require('botbuilder');
var apiHandler = require('./api-handler-service');
var util = require('util');
var zummerStrings = require('./zummer-strings.js');
var bingSearchService = require('./bing-search-service.js');
var bingSummarizerService = require('./bing-summarizer-service.js');
var urlObj = require('url');
//require('./dicer.js');
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

intents.matches('Greeting', [
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
    }
]);

    

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);







//wiki search


intents.matches('Search', [
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




//dicer
intents.matches('StartDicer', [
    function (session) {
        session.send("Let me pick something 'random' for you.");
        session.beginDialog('rootMenu');
    },
    function (session, results) {
        session.endConversation("Whatever, just dont leave me.");
    }
]);

// Add root menu dialog
bot.dialog('rootMenu', [
    function (session) {
        builder.Prompts.choice(session, "Choose an option:", 'Flip A Coin|Roll Dice|Magic 8-Ball|Quit');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                session.beginDialog('flipCoinDialog');
                break;
            case 1:
                session.beginDialog('rollDiceDialog');
                break;
            case 2:
                session.beginDialog('magicBallDialog');
                break;
            default:
                session.endDialog();
                break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('rootMenu');
    }
]).reloadAction('showMenu', null, { matches: /^(menu|back)/i });

// Flip a coin

intents.matches('flipCoinDialog', [
    function (session) {
        session.beginDialog('flipCoinDialog');
    },
]);


bot.dialog('flipCoinDialog', [
    function (session, args) {
        builder.Prompts.choice(session, "Choose heads or tails.", "heads|tails", { listStyle: builder.ListStyle.none })
    },
    function (session, results) {
        var flip = Math.random() > 0.5 ? 'heads' : 'tails';
        if (flip == results.response.entity) {
            session.endDialog("It's %s. I bet you cheeted!", flip);
        } else {
            session.endDialog("I WIN! It was %s. you lost you looser! :(", flip);
        }
    }
]);

// Roll some dice
intents.matches('rollDiceDialog', [
    function (session) {
        session.beginDialog('rollDiceDialog');
    },
]);

bot.dialog('rollDiceDialog', [
    function (session, args) {
        builder.Prompts.number(session, "How many dice should I roll?");
    },
    function (session, results) {
        if (results.response > 0) {
            var msg = "I rolled:";
            for (var i = 0; i < results.response; i++) {
                var roll = Math.floor(Math.random() * 6) + 1;
                msg += ' ' + roll.toString();
            }
            session.endDialog(msg);
        } else {
            session.endDialog("Ummm... Ok... I rolled air with my nonexisting hands.");
        }
    }
]);

// Magic 8-Ball
intents.matches('magicBallDialog', [
    function (session) {
        session.beginDialog('magicBallDialog');
    },
]);

bot.dialog('magicBallDialog', [
    function (session, args) {
        builder.Prompts.text(session, "What is your question?");
    },
    function (session, results) {
        // Use the SDK's built-in ability to pick a response at random.
        session.endDialog(magicAnswers);
    }
]);

var magicAnswers = [
    "It is certain",
    "Who knows ?",
    "You are wierd",
    "It is decidedly so",
    "Without a doubt",
    "Yes, definitely",
    "You may rely on it",
    "As I see it, yes",
    "Most likely",
    "Outlook good",
    "Yes",
    "Signs point to yes",
    "Reply hazy try again",
    "Ask again later",
    "Better not tell you now",
    "Cannot predict now",
    "Concentrate and ask again",
    "Don't count on it",
    "My reply is no",
    "My sources say no",
    "Outlook not so good",
    "Very doubtful"
];

//end dicer












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





