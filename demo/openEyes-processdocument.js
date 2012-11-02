/*

This is where the business logic should be triggered:
	1. Store the message in the database
	2. Send an response
*/

var messageResponses = require('../messages/messageResponses');

// create a function with a callback where you perform the main process
 var doAction = function(req, callback) {
        /* Add your business logic here e.g.
			1. get msg
			2. save it to the database for audit purposes
			3. do some processing on it
			4. decode the base 64 document
			5. save it into the document store where the user can view it
		*/	
		
		// 	1. get msg
		var msg = req.app.body.raw;
		console.log("Received message from BlackPear");
		
		//2. save it to the database for audit purposes 
		//3. do some processing on it
		//4. decode the base 64 document
		//5. save it into the document store where the user can view it
		
        return callback(null);
    }

exports.process = function(req, res, callback) {
    var properties;
    var app = req.app;
    var soapHeader = app.getHeader();

    try {
        doAction(req, function(err) {
            console.log("ReplyTo " + soapHeader["wsa:ReplyTo"]["wsa:Address"])
            if(err == undefined) {
                // define how the business process should reply to receipt of a message in the case of success
                properties = {
                    "payload": "<document><id>"+soapHeader["wsa:MessageID"]+"</id><status>OK</status></document>",
                    "serviceProperties": {
                        "action": "urn:nhs-itk:services:201005:SendDocument-v1-0"
                    },
                    "handler": function(ctx) {
                            console.log("document processor async response http header: "+ctx.statusCode)
                    }
                }
            }
            else {
                // define how the business process should reply to receipt of a message in the case of failure
                properties = {
                    "payload": "<document><id>"+soapHeader["wsa:MessageID"]+"</id><status>ERROR</status></document>",
                    "serviceProperties": {
                        "action": "urn:nhs-itk:services:201005:SendDocument-v1-0"
                    },
                    "handler": function(ctx) {
                            console.log("document processor async response http header: "+ctx.statusCode)
                    }
                }
            }
            return callback(null, properties);
        })
    }
    catch(err) {
        console.log("asyncRequestResponseException Exception " + err)
        return callback(err);
    }
}