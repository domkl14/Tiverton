var args = process.argv.slice(2);
var isExpansion;
if (args[0] == 'original') {
  isExpansion = false;
} else if (args[0] == 'expansion') {
  isExpansion = true;
}

if (isExpansion === undefined) {
  console.log('ERROR: Please pick a game type (original / expansion)');
  console.log('Example: node server.js original');
}
else {
  var express = require('express');
  var app = express();
  var serv = require('http').Server(app);
  var GameController = require('./game');

  app.get('/', function(req, res) {
    if (!isExpansion) {
      res.sendFile(__dirname + '/client/views/index.html');
    } else {
      res.sendFile(__dirname + '/client/views/index_exp.html');
    }
  });
  app.use('/client', express.static(__dirname + '/client'));

  var port = process.env.PORT || '3000';
  serv.listen(port, '0.0.0.0');
  console.log('Server listening on port ' + port);

  var io = require('socket.io')(serv, {});

  var game = new GameController(io, isExpansion);
  if (!isExpansion) {
    game.initialize(275, 27, 75);
  } else {
    game.initialize(275, 27, 70);
  }

  io.on('connection', function(socket) {
    game.onConnection(socket);
  });
}
