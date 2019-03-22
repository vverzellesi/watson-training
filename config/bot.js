/**
 *
 * @summary
 *
 * @link      cloudco.mybluemix.net
 * @since     0.0.3
 * @requires  app.js
 *
 */
// assistant name goes here.

// load local VCAP configuration

const dotenv = require('dotenv').config();
const watson = require('watson-developer-cloud');
let workspace_id;

// =====================================
// CREATE THE SERVICE WRAPPER ==========
// =====================================
// Create the service wrapper - Assistant
// Com username e password
/*
var assistant = new watson.AssistantV1({
     username: "<username>"
    , password: "<password>"
  , version: '2018-09-20'
});
*/
// Com API Key

var assistant = new watson.AssistantV1({
    iam_apikey: process.env.IAM_API_KEY,
    version: '2018-07-10',
    url: 'https://gateway.watsonplatform.net/assistant/api'
});

// check if the workspace ID is specified in the environment
workspace_id = process.env.WORKSPACE_ID;
// if not, look it up by name or create one
// Allow clients to interact

var chatbot = {
    sendMessage: function (req, callback) {
        //        var owner = req.user.username;
        buildContextObject(req, function (err, params) {
            if (err) {
                console.log("Error in building the parameters object: ", err);
                return callback(err);
            }
            if (params.message) {
                var conv = req.body.context.conversation_id;
                var context = req.body.context;
                var res = {
                    intents: []
                    , entities: []
                    , input: req.body.text
                    , output: {
                        text: params.message
                    }
                    , context: context
                };
                callback(null, res);
            }
            else if (params) {
                // Send message to the watson assistant service with the current context
                assistant.message(params, function (err, data) {
                    if (err) {
                        console.log("Error in sending message: ", err);
                        return callback(err);
                    } else {

                        var conv = data.context.conversation_id;

                        return callback(null, data);
                    }
                });
            }
        });
    }
};

// ===============================================
// UTILITY FUNCTIONS FOR CHATBOT AND LOGS ========
// ===============================================
/**
 * @summary Form the parameter object to be sent to the service
 *
 * Update the context object based on the user state in the watson assistant and
 * the existence of variables.
 *
 * @function buildContextObject
 * @param {Object} req - Req by user sent in POST with session and user message
 */
function buildContextObject(req, callback) {
    var message = req.body.text;
    //    var userTime = req.body.user_time;
    var context;
    if (!message) {
        message = '';
    }
    // Null out the parameter object to start building
    var params = {
        workspace_id: workspace_id
        , input: {}
        , context: {}
    };


    if (req.body.context) {
        context = req.body.context;
        params.context = context;
    }
    else {
        context = '';
    }
    // Set parameters for payload to Watson Assistant
    params.input = {
        text: message // User defined text to be sent to service
    };
    return callback(null, params);
}
module.exports = chatbot;
