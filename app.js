require('dotenv-extended').load();
var restify = require('restify');
var builder = require('botbuilder');
var apiHandler = require('./api-handler-service');
var util = require('util');
var zummerStrings = require('./zummer-strings.js');
var bingSearchService = require('./bing-search-service.js');
var bingSummarizerService = require('./bing-summarizer-service.js');
var ConversationStrings = require('./conversation-strings.js');
var urlObj = require('url');
var uniqueRandomArray = require('unique-random-array');
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
bot.dialog('/', intents);








//=========================================================
// Bots Dialogs
//=========================================================




intents.onDefault(builder.DialogAction.send(ConversationStrings.dontunderstand()));


//testdialog
intents.matches(/^test1/i, function (session) {
    session.send(ConversationStrings.dontunderstand());
});






//slugtest notes
intents.matches('FindSlugInDB', [
    function (session) {
        builder.Prompts.text(session, 'What do you want me to find ?');
    },
    function (session, results) {
        var http = require("http");

        var adr = "/index.php/test/";
        adr += results.response;
        var options = {
            host: 'noty.no',
            path: adr
        };
        console.log(util.inspect(adr, false, null));
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
                session.send("I found %s ", data);
            });
        });
    },
]);






















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
        session.endDialog(ConversationStrings.magicAnswers);
    }
]);



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






// Add root menu dialog
intents.matches(/^help/i, [
    function (session) {
        builder.Prompts.choice(session, "Here is what i know:", 'Last tick|play a game|what is a x? or who is x? ect|Flip A Coin|Roll Dice|Magic 8-Ball|Quit');
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













intents.matches(/^version/i, function (session) {
    session.send('I am Noty v0.04');
});

intents.matches(/^Who are you/i, function (session) {
    session.send('I am Noty built on Node.js with MS BotFramework using various APIs like luis.ai, bing, bing summary and more. By Håkon Yndestad');
});










intents.matches(/^herocard/i, [
    function (session) {
        builder.Prompts.choice(session, 'What card would like to test?', CardNames, {
            maxRetries: 3,
            retryPrompt: 'Ooops, what you wrote is not a valid option, please try again'
        });
    },
    function (session, results) {

        // create the card based on selection
        var selectedCardName = results.response.entity;
        var card = createCard(selectedCardName, session);

        // attach the card to the reply message
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
    }
]);

var HeroCardName = 'Hero card';
var ThumbnailCardName = 'Thumbnail card'; 
var ReceiptCardName = 'Receipt card';
var SigninCardName = 'Sign-in card';
var AnimationCardName = "Animation card";
var VideoCardName = "Video card";
var AudioCardName = "Audio card";
var CardNames = [HeroCardName, ThumbnailCardName, ReceiptCardName, SigninCardName, AnimationCardName, VideoCardName, AudioCardName];

function createCard(selectedCardName, session) {
    switch (selectedCardName) {
        case HeroCardName:
            return createHeroCard(session);
        case ThumbnailCardName:
            return createThumbnailCard(session);
        case ReceiptCardName:
            return createReceiptCard(session);
        case SigninCardName:
            return createSigninCard(session);
        case AnimationCardName:
            return createAnimationCard(session);
        case VideoCardName:
            return createVideoCard(session);
        case AudioCardName:
            return createAudioCard(session);
        default:
            return createHeroCard(session);
    }
}

function createHeroCard(session) {
    return new builder.HeroCard(session)
        .title('BotFramework Hero Card')
        .subtitle('Your bots — wherever your users are talking')
        .text('Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.')
        .images([
            builder.CardImage.create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://docs.botframework.com/en-us/', 'Get Started')
        ]);
}

function createThumbnailCard(session) {
    return new builder.ThumbnailCard(session)
        .title('BotFramework Thumbnail Card')
        .subtitle('Your bots — wherever your users are talking')
        .text('Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services.')
        .images([
            builder.CardImage.create(session, 'https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://docs.botframework.com/en-us/', 'Get Started')
        ]);
}

var order = 1234;
function createReceiptCard(session) {
    return new builder.ReceiptCard(session)
        .title('John Doe')
        .facts([
            builder.Fact.create(session, order++, 'Order Number'),
            builder.Fact.create(session, 'VISA 5555-****', 'Payment Method')
        ])
        .items([
            builder.ReceiptItem.create(session, '$ 38.45', 'Data Transfer')
                .quantity(368)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.png')),
            builder.ReceiptItem.create(session, '$ 45.00', 'App Service')
                .quantity(720)
                .image(builder.CardImage.create(session, 'https://github.com/amido/azure-vector-icons/raw/master/renders/cloud-service.png'))
        ])
        .tax('$ 7.50')
        .total('$ 90.95')
        .buttons([
            builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/pricing/', 'More Information')
                .image('https://raw.githubusercontent.com/amido/azure-vector-icons/master/renders/microsoft-azure.png')
        ]);
}

function createSigninCard(session) {
    return new builder.SigninCard(session)
        .text('BotFramework Sign-in Card')
        .button('Sign-in', 'https://login.microsoftonline.com');
}

function createAnimationCard(session) {
    return new builder.AnimationCard(session)
        .title('Microsoft Bot Framework')
        .subtitle('Animation Card')
        .image(builder.CardImage.create(session, 'https://docs.botframework.com/en-us/images/faq-overview/botframework_overview_july.png'))
        .media([
            { url: 'http://i.giphy.com/Ki55RUbOV5njy.gif' }
        ]);
}

function createVideoCard(session) {
    return new builder.VideoCard(session)
        .title('Big Buck Bunny')
        .subtitle('by the Blender Institute')
        .text('Big Buck Bunny (code-named Peach) is a short computer-animated comedy film by the Blender Institute, part of the Blender Foundation. Like the foundation\'s previous film Elephants Dream, the film was made using Blender, a free software application for animation made by the same foundation. It was released as an open-source film under Creative Commons License Attribution 3.0.')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg'))
        .media([
            { url: 'http://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4' }
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://peach.blender.org/', 'Learn More')
        ]);
}

function createAudioCard(session) {
    return new builder.AudioCard(session)
        .title('I am your father')
        .subtitle('Star Wars: Episode V - The Empire Strikes Back')
        .text('The Empire Strikes Back (also known as Star Wars: Episode V – The Empire Strikes Back) is a 1980 American epic space opera film directed by Irvin Kershner. Leigh Brackett and Lawrence Kasdan wrote the screenplay, with George Lucas writing the film\'s story and serving as executive producer. The second installment in the original Star Wars trilogy, it was produced by Gary Kurtz for Lucasfilm Ltd. and stars Mark Hamill, Harrison Ford, Carrie Fisher, Billy Dee Williams, Anthony Daniels, David Prowse, Kenny Baker, Peter Mayhew and Frank Oz.')
        .image(builder.CardImage.create(session, 'https://upload.wikimedia.org/wikipedia/en/3/3c/SW_-_Empire_Strikes_Back.jpg'))
        .media([
            { url: 'http://www.wavlist.com/movies/004/father.wav' }
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://en.wikipedia.org/wiki/The_Empire_Strikes_Back', 'Read More')
        ]);
}