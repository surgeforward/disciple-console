var util = require('util');
var repl = require("repl");
var _ = require('lodash');
var io = require('socket.io-client');
var jsonic = require('jsonic')

/**
 * Admin discipleConsole for interacting with running disciple-server instances
 *
 * @author      Surge Forward       <ncurtis@surgeforward.com>
 */
module.exports = function () {

    var discipleConsole = {
        host: null,
        callbackInit: false,
        config: { server: '127.0.0.1', port: 8181 },
        commands: ['disciples', 'disciples:flush',
            'models', 'model', 'model:drop',
            'datasets', 'dataset', 'dataset:drop'
        ]
    };

    /**
     * processes cmd line args and starts server connection
     */
    discipleConsole.init = function (host, port) {
        // defaults for server configuration
        discipleConsole.config.host = host || discipleConsole.config.host;
        discipleConsole.config.port = port || discipleConsole.config.port;

        discipleConsole.connect();
    };

    /**
     * connents to disciple-server admin port
     */
    discipleConsole.connect = function () {
        discipleConsole.server = io('http://'+discipleConsole.config.host+':'+discipleConsole.config.port);

        discipleConsole.server.on('connect', function () {
            discipleConsole.getInput();
        });

        discipleConsole.server.on('error', function (e) {
            console.log(e);
        });
    };

    /**
     * starts REPL event loop, each cmd is processed by discipleConsole.eval
     */
    discipleConsole.getInput = function () {
        var r = repl.start({
            prompt: "disciple-console> ",
            input: process.stdin,
            output: process.stdout,
            eval: discipleConsole.eval,
            terminal: true,
            useColors: true,
            ignoreUndefined: true
        });
    };

    /**
     * processes single command from REPL event loop
     */
    discipleConsole.eval = function (rawCmd, context, filename, callback) {
        
        // only need to bind these once, since callback is always same function
        if (!discipleConsole.callbackInit) {
            discipleConsole.callbackInit = true;
            discipleConsole.server.on('response:json', function (response) {
                callback(null, JSON.parse(response));
            });
            discipleConsole.server.on('response:text', function (response) {
                callback(null, response);
            });
            discipleConsole.server.on('disconnect', function (response) {
                callback(null, 'server disconnected');
            });
            discipleConsole.server.on('connect', function (response) {
                callback(null, 'server reconnected');
            });
        }

        // make sure we have a server connection
        // before we try to process any commands
        if (!discipleConsole.server.connected) {
            return callback(null, 'no connection');
        }

        // cmd comes in as (COMMAND)/n
        // removing the container ()\n characters
        rawCmd = rawCmd.substr(1);
        rawCmd = rawCmd.substr(0, rawCmd.length-2);
        
        if (!rawCmd) {
            return callback(undefined, undefined);
        }

        var rawCmdTitle = rawCmd.split(' ');

        if ( discipleConsole.commands.indexOf(rawCmdTitle[0]) == -1 ) {
            return callback(null, 'Invalid command ' +rawCmdTitle[0]);
        }

        var command = rawCmdTitle[0];
        var cmdParams = rawCmdTitle.slice(1).join(' ');

        if (command) {

            try {
                // using jsonic library, allows malformed json
                cmdParams = cmdParams || '{}';

                // passing command to server, on response will fire discipleConsole callback
                discipleConsole.server.emit(command, cmdParams.trim());
            }
            catch (e) {
                // error parsing json, pass it to discipleConsole callback
                return callback(null, e);
            }
        }
        else {
            // no command, blank line
            callback(undefined, undefined);
        }
    };

    return discipleConsole;
}