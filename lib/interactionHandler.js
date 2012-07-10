/*

* This is responsible for implementing the ITK Interaction patterns:
    "Request Exception" which returns a simple response or an exception
*   "Request Response Exception" which returns a response or an exception
*
*   Depending on the invocation style the interaction pattern will either operate synchronously or asynchronously
*
*   Asynchronous interactions will return a http response, without a soap packet and then use the replyTo attribute to send the response to
*/

var uuid = require('node-uuid');
var messageResponses = require('../client/messages/messageResponses');
var distributionEnvelope = require('../client/messages/distributionEnvelope');

// the async response needs to be pushed out to the replyTo address
var syncHttpResponse = function(req, res, err, callback) {
    var app = req.app;
    var logger = app.logger;
    var soapHeader = app.getHeader();

    var header = new Array(
            { "name": "Action", "namespace": "http://www.w3.org/2005/08/addressing", "data": soapHeader["wsa:Action"] },
            { "name": "MessageID", "namespace": "http://www.w3.org/2005/08/addressing", "data": uuid.v4() },
            { "name": "RelatesTo", "namespace": "http://www.w3.org/2005/08/addressing", "data": soapHeader["wsa:MessageID"] }
        );

    var msg = "";
    try {
        if(err != undefined) {
            //ITK 4.2.3 - Asynchronous Failure Scenario 2 
            msg = messageResponses.getEnvelope(header, messageResponses.itkError(err));
            res.writeHead(500);
            res.write(msg);
            res.end();
        }
        else {
            // ITK 4.2.1 Asynchronous Success Scenario - INCOMPLETED AT MOMENT
            res.writeHead(202, { 'Content-Type': 'text/xml' });
            res.end();
            // need to push out the response to the ReplyTo address
        }
    }
    catch (err) {
        return callback(err);
    }

    return callback(null);
};

// the async response needs to be pushed out to the replyTo address
var asyncResponse = function(req, res, msg, err) {

    // need to post to the ReplyTo the response
    var app = req.app;
    var client = app.getClient();
    var logger = app.logger;
    var soapHeader = app.getHeader();

    // set the default message properties
    msg.key = "../certs-server/server.pem";
    msg.url = soapHeader["wsa:ReplyTo"]['wsa:Address'];
    msg.references = new Array("Body", "Timestamp");

    client.send(msg);
};

var syncResponse = function(req, res, msg, err) {

    var app = req.app;
    var client = app.getClient();
    var logger = app.logger;
    var soapHeader = app.getHeader();

    var header = new Array(
            { "name": "Action", "namespace": "http://www.w3.org/2005/08/addressing", "data": soapHeader["wsa:Action"] },
            { "name": "MessageID", "namespace": "http://www.w3.org/2005/08/addressing", "data": uuid.v4() },
            { "name": "RelatesTo", "namespace": "http://www.w3.org/2005/08/addressing", "data": soapHeader["wsa:MessageID"] }
        );

    if(err != undefined) {
        logger.log("ITK 4.1.3 Synchronous Failure Scenario 2");
        msg = messageResponses.error(header, msg);
        res.writeHead(500);
        res.write(msg);
        res.end();
    }

    else {
        
        if(msg != undefined) {
            logger.log("ITK 4.1.1 Synchronous Success Scenario");
            console.log("what is my msg  "  + msg)
            msg = messageResponses.response(header, msg);
            console.log("responding sync "  + msg)
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.write(msg);
            res.end();
        }
        else {
            logger.log("ITK 4.2.1 Asynchronous Success Scenario - http response");
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end();    
        }
        
    }
};



var handler = function(interactionPattern, process) {

    this.handler = function(req, res) {
        var error;
        var result;
        try {
            // if an async call then need to return a http 202 before processing
            // the process should be called on the syncHttpResponse callback
            if(interactionPattern.async === true) {
                syncHttpResponse(req, res, error, function(err) {
                    // sync Http response completed - can do async processing now
                    if(err == undefined) {
                        process(req, res, function(err, result) {
                            interactionPattern.response(req, res, result, err);
                        });
                    }

                });
            }

            else {
                process(req, res, function(err, result) {
                    interactionPattern.response(req, res, result, err);
                });
            }


        }
        catch(err) {
            error = {
                "faultactor": req.headers['host'] + req.url,
                "id": uuid.v4(),
                "code": err.code,
                "text": err.message,
                "diagnostictext": err.diagnostictext
            }

            interactionPattern.response(req, res, result, error);
        }
    }

    return this.handler;
}

exports.create = function(route, pattern, custommiddleware, process) {
    var interactionPattern = getInteractionPattern(pattern);
    return {
        "route": route,
        "interactionPattern":  interactionPattern,
        "custommiddleware": custommiddleware,
        "process": handler(interactionPattern, process)
    }
}

var getInteractionPattern = function(pattern) {

    if (pattern == "sync") {
        return {
            "async": false,
            "response": syncResponse
        }
    }
    
    if (pattern == "async") {
        return {
            "async": true,
            "response": asyncResponse
        }
    }
    
}
