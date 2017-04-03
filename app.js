var restify = require('restify');
var builder = require('botbuilder');


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
    appId: '76f2f054-8cab-4a46-9d05-20fae3bbf84d',
    appPassword: 'wfEdmpuCEWYqtXPXSU4QSwm'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());
var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/f685cfa9-87d4-4ba0-9c96-a7e02ac8b7d9?subscription-key=1880aee1ec4d4cb1919e61f7547081a0&verbose=true&timezoneOffset=0.0&q=');
var intents = new builder.IntentDialog({ recognizers: [recognizer] });


//=========================================================
// Bots Dialogs
//=========================================================


bot.dialog('/', intents);





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
    session.send('I am Noty v0');
});