/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    request = require('request-promise-native');

var cfenv = require('cfenv');

var chatbot = require('./config/bot.js');


var app = express();

var fileToUpload;

var dbCredentials = {
    dbName: 'my_sample_db'
};

var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var errorHandler = require('errorhandler');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

app.get('/', routes.chat);

app.post('/api/watson', function (req, res) {
    processChatMessage(req, res);
});

app.post('/api/google', function (req, res) {
    if (req.body.conversation.type === 'NEW')
        req.body.inputs[0].rawInputs[0].query = '';

    req.body.context = JSON.parse(req.body.conversation.conversationToken || '{}');
    req.body.text = req.body.inputs[0].rawInputs[0].query


    chatbot.sendMessage(req, async function (err, response) {
        if (err) {
            console.log("Error in sending message: ", err);
            res.status(err.code || 500).json(err);
        } else {
            const googleIntent = req.body.inputs[0].intent;
            const resp = {
                expectUserResponse: googleIntent !== 'actions.intent.CANCEL',
            };
            const richResponse = {
                items: response.output.text.map(x => ({
                    simpleResponse: {
                        ssml: x,
                        displayText: x,
                    }
                })),
            };
            const inputs = [{
                inputPrompt: { richInitialPrompt: richResponse },
                possibleIntents: [{ intent: 'actions.intent.TEXT' }],
            }];

            if (resp.expectUserResponse) {
                resp.expectedInputs = inputs;
            } else {
                resp.finalResponse = { richResponse };
            }
            resp.conversationToken = JSON.stringify(response.context);

            res.json(resp);
        }
    })
});

function processChatMessage(req, res) {
    chatbot.sendMessage(req, async function (err, response) {
        if (err) {
            console.log("Error in sending message: ", err);
            res.status(err.code || 500).json(err);
        } else {
            // tratamentos de output
            if ('busca_hotel' in response.output) {
                const hoteis = await buscaHotel();
                let listaHoteis = JSON.parse(hoteis).filter(x => x.cidade === resfponse.context.destino);
                let nome_hoteis = listaHoteis.map(x => x.nome);

                if (listaHoteis.length > 0) {
                    response.context.lista_hoteis = listaHoteis;
                    response.context.nome_hoteis = nome_hoteis;
                }
                else {
                    response.context.sem_hoteis = true;
                }
            }

            if ('busca_voo' in response.output) {
                const voos = await buscaVoos();
                let listaVoos = JSON.parse(voos).filter(x =>
                    x.partida === response.context.partida &&
                    x.destino === response.context.destino &&
                    x.classe === response.context.classe &&
                    x.data === response.context.data
                );
                let num_voos = listaVoos.map(x => x.numero);

                if (listaVoos.length > 0) {
                    response.context.lista_voos = listaVoos;
                    response.context.num_voos = num_voos;
                }
                else {
                    response.context.sem_voos = true;
                }
            }

            res.status(200).json(response);
        }
    });
}

http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    console.log('Express server listening on port ' + app.get('port'));
});

function buscaHotel() {
    return new Promise((resolve, reject) => {
        let options = {
            url: 'https://my-json-server.typicode.com/vverzellesi/watson-training/hoteis',
            method: 'GET'
        };
        request(options, (err, httpResponse, body) => {
            if (!err && httpResponse.statusCode == 200) {
                resolve(body);
            } else {
                reject(err);
                console.error('Erro na chamada de API de hoteis', httpResponse.body);
            }
        });
    })
}

function buscaVoos() {
    return new Promise((resolve, reject) => {
        let options = {
            url: 'https://my-json-server.typicode.com/vverzellesi/watson-training/voos',
            method: 'GET'
        };
        request(options, (err, httpResponse, body) => {
            if (!err && httpResponse.statusCode == 200) {
                resolve(body);
            } else {
                reject(err);
                console.error('Erro na chamada de API de voos', httpResponse.body);
            }
        });
    })
}