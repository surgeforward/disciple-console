var program = require('commander');
var disciple = require('./lib/console.js')();

program
    .version('0.0.1')
    .usage('[options] <file ...>')
    .option('-h, --host [server]', 'Set IP/Hostname of disciple server')
    .option('-p, --port [port]', 'Set port to connect on for client or admin. Listening port for server.')
    .parse(process.argv);

if (program.host) {
    return disciple.init(program.host, program.port);
}

program.help();