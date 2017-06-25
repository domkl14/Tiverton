const X0 = 275;
const Y0 = 27;
const S = 75;

var express = require('express');
var app = express();
var serv = require('http').Server(app);
var GameController = require('./game');

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/views/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

var port = process.env.PORT || '3000';
serv.listen(port, '0.0.0.0');
console.log('Server listening on port ' + port);

var io = require('socket.io')(serv, {});
var game = new GameController(io);
game.initialize(X0, Y0, S);

io.on('connection', function(socket) {
  game.onConnection(socket);
});
