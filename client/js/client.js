const COLORS = {red: 'rgb(217, 31, 0)', blue: 'rgb(0, 115, 230)', white: 'rgb(255, 255, 255)', 
  orange: 'rgb(255, 165, 0)'};
const BUTTON_IDS = ['move_robber', 'rob', 'road', 'settlement', 'city', 'remove_road', 'remove_piece', 
  'remove_development_card'];
const WEIGHTED_DICE_ROLLS = [2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 9, 9, 9, 9, 
  10, 10, 10, 11, 11, 12];
const PROBABILITIES = {2: '.', 3: '..', 4: '...', 5: '....', 6: '.....', 8: '.....', 9: '....', 10: '...', 11: '..', 
  12: '.'};
const EPS = 0.001;

var canvas = document.getElementById('ctx');
var ctx = canvas.getContext('2d');
ctx.strokeStyle = 'black';
ctx.textAlign = 'center';
ctx.fillRect(0, 0, canvas.width, canvas.height);
$('#controls').width((window.innerWidth - 850) + 'px');

var socket = io();
var game;
var id;
var s;

/** 
 * Initialize board
 * data: {id, name, game, resources}
 */
socket.on('initializeBoard', function(data) {
  game = data.game;
  s = data.game.s;
  id = data.id;
  $('#color').text(id.toUpperCase());
  $('#name').val(data.name);
  if (id == 'red')         $('#name').css('width', '176px');
  else if (id == 'white')  $('#name').css('width', '159px');
  else if (id == 'blue')   $('#name').css('width', '170px');
  else if (id == 'orange') $('#name').css('width', '145px');

  // Set resources
  $('#wood_count').text(data.resources[id].wood);
  $('#brick_count').text(data.resources[id].brick);
  $('#hay_count').text(data.resources[id].hay);
  $('#sheep_count').text(data.resources[id].sheep);
  $('#ore_count').text(data.resources[id].ore);
  $('#total_count').text(data.resources[id].wood + data.resources[id].brick + data.resources[id].hay + 
    data.resources[id].sheep + data.resources[id].ore);
  if ($('#total_count').text() >= 10) {
    $('#my_dcards_title, #my_dcards_1, #my_dcards_2, .opponent').css('padding-left', '17px');
  } 
  else {
    $('#my_dcards_title, #my_dcards_1, #my_dcards_2, .opponent').css('padding-left', '25px');
  }
  
  // Clear game log
  $('#game_log').text('');

  drawBoard(game);
});

/**
 * Redraw board
 * data: {game}
 */
socket.on('redrawBoard', function(data) {
  game = data.game;
  drawBoard(game);
});

/**
 * List players in game
 * data: {names}
 */
socket.on('listPlayers', function(data) {
  $('#players').empty();
  var text = '';
  for (var i in data.players) {
    if (data.players[i] == id) {
      continue;
    } else if (data.players[i].toUpperCase() == data.names[data.players[i]]) {
      text += data.players[i].toUpperCase() + ' + ';
    } else {
      text +=  data.names[data.players[i]] + ' (' + data.players[i].toUpperCase() + ') + ';
    }
  }
  if (text == '') {
    $('#players').text('No other players...');
  } else {
    $('#players').text(text.substring(0, text.length - 3));
  }
});

/**
 * Set resources for player
 * data: {resources}
 */
socket.on('setResources', function(data) {
  $('#wood_count').text(data.resources[id].wood);
  $('#brick_count').text(data.resources[id].brick);
  $('#hay_count').text(data.resources[id].hay);
  $('#sheep_count').text(data.resources[id].sheep);
  $('#ore_count').text(data.resources[id].ore);
  $('#total_count').text(data.resources[id].wood + data.resources[id].brick + data.resources[id].hay + 
    data.resources[id].sheep + data.resources[id].ore);
  if ($('#total_count').text() >= 10) {
    $('#my_dcards_title, #my_dcards_1, #my_dcards_2, .opponent').css('padding-left', '17px');
  } 
  else {
    $('#my_dcards_title, #my_dcards_1, #my_dcards_2, .opponent').css('padding-left', '25px');
  }
});

/**
 * Set development cards
 * data: {developmentCards}
 */
socket.on('setDevelopmentCards', function(data) {
  // Clear fields
  $('#my_dcards_1').empty();
  $('#my_dcards_2').empty();
  $('#opponent_1_name').text('');
  $('#opponent_2_name').text('');
  $('#opponent_3_name').text('');
  $('#opponent_1_dcards').empty();
  $('#opponent_2_dcards').empty();
  $('#opponent_3_dcards').empty();

  // Set own development cards
  if (data.playerDevelopmentCards[id] != null) {
    for (var c in data.playerDevelopmentCards[id]) {
      var el = $('<button/>')
        .text(data.playerDevelopmentCards[id][c].type.charAt(0).toUpperCase())
        .addClass('dcard')
        .val(c)
        .click(function() {
          if ($('#remove_development_card').hasClass('active')) {
            $('#remove_development_card').removeClass('active');
            socket.emit('removeDevelopmentCard', {idx: $(this).val()});
          } else if (!$(this).hasClass('active')) {
            $(this).addClass('active');
            if ($(this).text() == 'K') {
              $('#move_robber').addClass('active');
            }
            socket.emit('useDevelopmentCard', {idx: $(this).val()});
          } else if ($(this).hasClass('active')) {
            $(this).removeClass('active');
            if ($(this).text() == 'K') {
              $('#move_robber').removeClass('active');
            }
            socket.emit('hideDevelopmentCard', {idx: $(this).val()});
          }
        });
      if (data.playerDevelopmentCards[id][c].used) {
        el.addClass('active');
      }
      if ($('#my_dcards_1 button').length < 7) {
        $('#my_dcards_1').append(el);
      } else {
        $('#my_dcards_2').append(el);
      }
    }
  }

  // Set development cards of other players
  var count = 1;
  for (var i in data.playerDevelopmentCards) {
    if (i == id) continue;
    if (data.playerDevelopmentCards[i].length == 0) continue;

    $('#opponent_' + count + '_name').text(i.charAt(0).toUpperCase() + ':');
    if (i == 'red')    $('#opponent_' + count + '_name').css('padding-right', '5px');
    if (i == 'blue')   $('#opponent_' + count + '_name').css('padding-right', '5px');
    if (i == 'orange') $('#opponent_' + count + '_name').css('padding-right', '2px');
    
    var text = '';
    for (var j in data.playerDevelopmentCards[i]) {
      if (data.playerDevelopmentCards[i][j].used) {
        text += data.playerDevelopmentCards[i][j].type.charAt(0).toUpperCase() + '-';
      } else {
        text += '?-';
      }
    }
    text = text.substring(0, text.length - 1);
    $('#opponent_' + count + '_dcards').text(text);
    count++;
  }
});

/**
 * Canvas click handler
 */
canvas.addEventListener('click', function(event) {
  drawBoard(game);
  // Get closest location coordinates to click location on canvas
  var x = event.pageX - canvas.offsetLeft;
  var y = event.pageY - canvas.offsetTop;
  var min_dist = Number.MAX_VALUE;
  var min_idx = -1;
  for (var i = 0; i < game.locations.length; i++) {
    var dx = game.locations[i].x - x;
    var dy = game.locations[i].y - y;
    if (dx * dx + dy * dy < min_dist) {
      min_dist = dx * dx + dy * dy;
      min_idx = i;
    }
  }
  
  // Player is moving the robber
  if ($('#move_robber').hasClass('active')) {
    // Get closest upper point location per tile
    var min_dist = Number.MAX_VALUE;
    var min_idx = -1;
    for (var i = 0; i < game.points.length; i++) {
      var dx = game.points[i].x - x;
      var dy = (game.points[i].y + s) - y;
      if (dx * dx + dy * dy < min_dist) {
        min_dist = dx * dx + dy * dy;
        min_idx = i;
      }
    }
    socket.emit('moveRobber', {idx: min_idx});
    $('#move_robber').removeClass('active');
  }
  // Player is robbing someone
  else if ($('#rob').hasClass('active')) {
    socket.emit('rob', {idx: min_idx});
    $('#rob').removeClass('active');
  }
  // Player is placing a road
  else if ($('#road').hasClass('active')) {
    var min_dist2 = Number.MAX_VALUE;
    var min_idx2 = -1;
    for (var i = 0; i < game.locations.length; i++) {
      var dx = game.locations[i].x - x;
      var dy = game.locations[i].y - y;
      if (dx * dx + dy * dy < min_dist2 && i != min_idx) {
        min_dist2 = dx * dx + dy * dy;
        min_idx2 = i;
      }
    }
    socket.emit('addRoad', {idx1: min_idx, idx2: min_idx2});
    $('#road').removeClass('active');
  } 
  // Player is placing a settlement
  else if ($('#settlement').hasClass('active')) {
    socket.emit('addPiece', {idx: min_idx, type: 'settlement'});
    $('#settlement').removeClass('active');
  }
  // Player is placing a city
  else if ($('#city').hasClass('active')) {
    socket.emit('addPiece', {idx: min_idx, type: 'city'});
    $('#city').removeClass('active');
  }
  // Player is removing a road
  else if ($('#remove_road').hasClass('active')) {
    var min_dist2 = Number.MAX_VALUE;
    var min_idx2 = -1;
    for (var i = 0; i < game.locations.length; i++) {
      var dx = game.locations[i].x - x;
      var dy = game.locations[i].y - y;
      if (dx * dx + dy * dy < min_dist2 && i != min_idx) {
        min_dist2 = dx * dx + dy * dy;
        min_idx2 = i;
      }
    }
    socket.emit('removeRoad', {idx1: min_idx, idx2: min_idx2});
    $('#remove_road').removeClass('active');
  }
  // Player is removing a settlement / city
  else if ($('#remove_piece').hasClass('active')) {
    socket.emit('removePiece', {idx: min_idx});
    $('#remove_piece').removeClass('active');
  }
}, false);

/**
 * On mouse move over canvas
 */
$('#ctx').mousemove(function(event) {
  if ($('#road').hasClass('active') || $('#settlement').hasClass('active') || $('#city').hasClass('active')) {
    drawBoard(game);
    ctx.fillStyle = 'rgba' + COLORS[id].substring(3, COLORS[id].length - 1) + ', 0.5)';
  } else if($('#move_robber').hasClass('active') || $('#rob').hasClass('active') || $('#remove_road').hasClass('active') 
    || $('#remove_piece').hasClass('active')) {
    drawBoard(game);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  } else {
    return;
  }

  // Get closest location coordinates to click location on canvas
  var x = event.pageX - canvas.offsetLeft;
  var y = event.pageY - canvas.offsetTop;
  var min_dist = Number.MAX_VALUE;
  var min_idx = -1;
  for (var i = 0; i < game.locations.length; i++) {
    var dx = game.locations[i].x - x;
    var dy = game.locations[i].y - y;
    if (dx * dx + dy * dy < min_dist) {
      min_dist = dx * dx + dy * dy;
      min_idx = i;
    }
  }
  
  // Player is moving the robber
  if ($('#move_robber').hasClass('active')) {
    // Get closest upper point location per tile
    var min_dist = Number.MAX_VALUE;
    var min_idx = -1;
    for (var i = 0; i < game.points.length; i++) {
      var dx = game.points[i].x - x;
      var dy = (game.points[i].y + s) - y;
      if (dx * dx + dy * dy < min_dist) {
        min_dist = dx * dx + dy * dy;
        min_idx = i;
      }
    }
    ctx.beginPath();
    ctx.arc(game.points[min_idx].x, game.points[min_idx].y + game.s * 0.7, game.s / 3.5, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Player is placing a road
  else if ($('#road').hasClass('active')) {
    var min_dist2 = Number.MAX_VALUE;
    var min_idx2 = -1;
    for (var i = 0; i < game.locations.length; i++) {
      var dx = game.locations[i].x - x;
      var dy = game.locations[i].y - y;
      if (dx * dx + dy * dy < min_dist2 && i != min_idx) {
        min_dist2 = dx * dx + dy * dy;
        min_idx2 = i;
      }
    }
    // Check if road location already taken
    for (var i in game.roadPlacements) {
      if (game.roadPlacements[i].idx1 == min_idx && game.roadPlacements[i].idx2 == min_idx2
        || game.roadPlacements[i].idx2 == min_idx && game.roadPlacements[i].idx1 == min_idx2) {
        return;
      }
    }
    // Check points are adjacent
    var adjacent = false;
    for (var i in game.adjacentLocations[min_idx]) {
      if (min_idx2 == game.adjacentLocations[min_idx][i]) {
        adjacent = true;
        break;
      }
    }
    if (!adjacent) return;
    ctx.beginPath();
    var x = (game.locations[min_idx].x + game.locations[min_idx2].x) / 2;
    var y = (game.locations[min_idx].y + game.locations[min_idx2].y) / 2;
    ctx.arc(x, y, game.s * 0.1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  // Player is robbing someone
  else if ($('#rob').hasClass('active')) {
    // Check if settlement / city is on the robber tile
    var isValid = false;
    for (var i in game.adjacentTiles[min_idx]) {
      var tileIdx = game.adjacentTiles[min_idx][i];
      if (tileIdx == game.robber) {
        isValid = true;
        break;
      }
    }
    if (!isValid) return;
    // Check if there exists a settlement / city (not yourself) at location
    if (game.placements[min_idx] == null || game.placements[min_idx].id == id) {
      return;
    }
    ctx.beginPath();
    ctx.arc(game.locations[min_idx].x, game.locations[min_idx].y, game.s * 0.2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Player is placing a settlement
  else if ($('#settlement').hasClass('active')) {
    if (game.placements[min_idx] == null) {
      ctx.beginPath();
      ctx.arc(game.locations[min_idx].x, game.locations[min_idx].y, game.s * 0.15, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // Player is placing a city
  else if ($('#city').hasClass('active')) {
    if (game.placements[min_idx] != null && game.placements[min_idx].type == 'settlement'
      && game.placements[min_idx].id == id) {
      ctx.beginPath();
      ctx.arc(game.locations[min_idx].x, game.locations[min_idx].y, game.s * 0.25, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // Player is removing a road
  else if ($('#remove_road').hasClass('active')) {
    var min_dist2 = Number.MAX_VALUE;
    var min_idx2 = -1;
    for (var i = 0; i < game.locations.length; i++) {
      var dx = game.locations[i].x - x;
      var dy = game.locations[i].y - y;
      if (dx * dx + dy * dy < min_dist2 && i != min_idx) {
        min_dist2 = dx * dx + dy * dy;
        min_idx2 = i;
      }
    }
    // Check if your road
    var isValid = false;
    for (var i in game.roadPlacements) {
      if ((game.roadPlacements[i].idx1 == min_idx && game.roadPlacements[i].idx2 == min_idx2
        || game.roadPlacements[i].idx2 == min_idx && game.roadPlacements[i].idx1 == min_idx2)
        && game.roadPlacements[i].id == id) {
        isValid = true;
        break;
      }
    }
    if (!isValid) return;
    ctx.beginPath();
    var x = (game.locations[min_idx].x + game.locations[min_idx2].x) / 2;
    var y = (game.locations[min_idx].y + game.locations[min_idx2].y) / 2;
    ctx.arc(x, y, game.s * 0.1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  // Player is removing a settlement / city
  else if ($('#remove_piece').hasClass('active')) {
    if (game.placements[min_idx] != null && game.placements[min_idx].id == id) {
      ctx.beginPath();
      ctx.arc(game.locations[min_idx].x, game.locations[min_idx].y, game.s * 0.2, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
});

/**
 * Color change
 */
$('#color_span').click(function() {
  socket.emit('changeColor', {color: $('#color').text().toLowerCase()});
})

/**
 * Change player color
 * data: {newColor}
 */
socket.on('changeColorNames', function(data) {
  if ($('#name').val() == $('#color').text()) {
    $('#name').val(data.newColor.toUpperCase());
  }
  $('#color').text(data.newColor.toUpperCase());
  id = data.newColor;
});

/**
 * On name change
 */
$('#name').change(function() {
  // No name, default name is color
  if ($(this).val() == '') {
    $(this).val(id.toUpperCase());
  }
  socket.emit('changeName', {name: $(this).val()});
});

/**
 * Button click handlers
 */
$('#move_robber, #rob, #road, #settlement, #city, #remove_road, #remove_piece, #remove_development_card').click(
  function() {
  var isHighlighted = $(this).hasClass('active');
  for (var i in BUTTON_IDS) {
    if ($('#' + BUTTON_IDS[i]).hasClass('active')) {
      $('#' + BUTTON_IDS[i]).removeClass('active');
    }
  }
  if (!isHighlighted) {
    $(this).addClass('active');
  }
});

/**
 * Roll button click handler
 */
$('#roll').click(function() {
  // Unhighlight all buttons
  for (var i in BUTTON_IDS) {
    if($('#' + BUTTON_IDS[i]).hasClass('active')) {
      $('#' + BUTTON_IDS[i]).removeClass('active');
    }
  }
  var r = parseInt(Math.random() * WEIGHTED_DICE_ROLLS.length);
  var message = '--------------------------------------------------------------------';
  if (WEIGHTED_DICE_ROLLS[r] == 8 || WEIGHTED_DICE_ROLLS[r] == 11) {
    message += $('#name').val().toUpperCase() + ' rolled an ' + WEIGHTED_DICE_ROLLS[r];
  } else {
    message += $('#name').val().toUpperCase() + ' rolled a ' + WEIGHTED_DICE_ROLLS[r];
  }
  socket.emit('sendMsgToServer', {message: message});

  if (WEIGHTED_DICE_ROLLS[r] == 7) {
    socket.emit('rollSeven');
  } else {
    socket.emit('distributeResources', {roll: WEIGHTED_DICE_ROLLS[r]});
  }
});

/**
 * Development card button click handler
 */
$('#development_card').click(function() {
  socket.emit('developmentCard');
});

/**
 * Clear game log button click handler
 */
$('#clear').click(function() {
  $('#game_log').text('');
});

/**
 * Player requests to adjust a resource
 */
$('#wood_plus, #wood_minus, #brick_plus, #brick_minus, #hay_plus, #hay_minus, #sheep_plus, #sheep_minus, #ore_plus, \
  #ore_minus').click(function() {
  var resource = this.id.substring(0, this.id.indexOf('_'));
  var type = this.id.substring(this.id.indexOf('_') + 1);
  if (type == 'minus' && parseInt($('#' + resource + '_count').text()) == 0) return;
  socket.emit('adjustResources', {resource: resource, type: type});
});

/**
 * Player sends a chat message
 */
$('#chat').bind('keydown', function(event) {
  if (event.keyCode == 13) {
    socket.emit('sendMsgToServer', {message: $('#name').val().toUpperCase() + ': ' + $('#chat').val()});
    $('#chat').val('');
  }
});

/**
 * Log a message in the game log
 * data: {message}
 */
socket.on('logMessage', function(data) {
  $('#game_log').append($('<div>').text(data.message));
  // Show only last 50 plays
  if ($('#game_log').children().length >= 50) {
    var lastPlays = $('#game_log').children().slice(-50);
    $('#game_log').html(lastPlays);
  }
  $('#game_log').animate({scrollTop: $('#game_log').get(0).scrollHeight}, 0);
});

/**
 * Log an error in the game log
 * data: {error}
 */
socket.on('logError', function(data) {
  $('#game_log').append($('<div>').text(data.error).css('color', 'red'));
  $('#game_log').animate({scrollTop: $('#game_log').get(0).scrollHeight}, 0);
});

/**
 * Switch to error page
 */
socket.on('gameIsFull', function() {
  document.location = '/client/views/error.html';
});

/**
 * Draw board
 */
function drawBoard(game) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#87cefa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw tiles
  for (var i in game.points) {
    if (game.tiles[i] == 0) color = '#c2b180'; // sand
    else if (game.tiles[i] == 1) color = '#145214'; // wood
    else if (game.tiles[i] == 2) color = '#aa3311'; // brick
    else if (game.tiles[i] == 3) color = '#a9a9a9'; // ore
    else if (game.tiles[i] == 4) color = '#e4d96f'; // hay
    else if (game.tiles[i] == 5) color = '#9acd32'; // sheep
    var hasOdds = game.tiles[i] != 0;
    drawTile(game.points[i].x, game.points[i].y, color, hasOdds);

    if (game.odds[i] == '') continue;

    // Draw odds
    ctx.font = '20pt Courier';
    if (game.odds[i] == 6 || game.odds[i] == 8) {
      ctx.fillStyle = '#e60000';
    } else {
      ctx.fillStyle = 'black';
    }
    if (game.odds[i] < 10) {
      ctx.fillText(' ' + game.odds[i], game.points[i].x - 8, game.points[i].y + game.s + 7);
    } else {
      ctx.fillText(game.odds[i], game.points[i].x, game.points[i].y + game.s + 7);
    }
    ctx.font = '14pt Arial';
    ctx.textAlign = 'center';
    ctx.fillText(PROBABILITIES[game.odds[i]], game.points[i].x, game.points[i].y + game.s + 15);
  }

  // Draw robber
  drawRobber(game.points[game.robber].x, game.points[game.robber].y);

  // Draw ports
  drawPorts(game.locations);

  // Draw roads
  for (var i in game.roadPlacements) {
    drawRoad(game.locations[game.roadPlacements[i].idx1].x, game.locations[game.roadPlacements[i].idx1].y, 
      game.locations[game.roadPlacements[i].idx2].x, game.locations[game.roadPlacements[i].idx2].y, 
      game.roadPlacements[i].id);
  }

  // Draw settlements / cities
  for (var i in game.placements) {
    if (game.placements[i] != null) {
      if (game.placements[i].type == 'settlement') {
        drawSettlement(game.locations[i].x, game.locations[i].y, game.placements[i].id);
      } else if (game.placements[i].type == 'city') {
        drawCity(game.locations[i].x, game.locations[i].y, game.placements[i].id);
      }
    }
  }
}

/**
 * Draw a tile on point (x, y) with side length s
 */
function drawTile(x, y, color, hasOdds) {
  var h = 2 * s;
  var w = Math.sqrt(3) / 2 * s * 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w / 2, y + s / 2);
  ctx.lineTo(x + w / 2, y + s + s / 2);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x - w / 2, y + s + s / 2);
  ctx.lineTo(x - w / 2, y + s / 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
  // Draw odds piece
  if (hasOdds) {
    ctx.beginPath();
    ctx.arc(x, y + h / 2, s / 3.2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#f5f5dc';
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Draw robber
 */
function drawRobber(x, y) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.beginPath();
  ctx.arc(x, y + s * 0.7, s / 3.5, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/**
 * Draw ports
 */
function drawPorts(locs) {
  ctx.fillStyle = '#643d01'; // wood color
  // ctx.fillStyle = '#4a4b46'; // gravel color

  const SIN_30 = Math.sin(30 * Math.PI / 180);
  const COS_30 = Math.cos(30 * Math.PI / 180);

  // Wood port (1, 6)
  ctx.beginPath();
  ctx.moveTo(locs[1].x, locs[1].y);
  ctx.lineTo(locs[1].x, locs[1].y - s * 0.4);
  ctx.lineTo(locs[1].x + s * COS_30 * 0.1, locs[1].y - s * SIN_30 * 0.1 - 0.4 * s);
  ctx.lineTo(locs[1].x + s * COS_30 * 0.2, locs[1].y - s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(locs[6].x, locs[6].y);
  ctx.lineTo(locs[6].x - s * COS_30 * 0.4, locs[6].y - s * SIN_30 * 0.4);
  ctx.lineTo(locs[6].x - s * COS_30 * 0.5, locs[6].y - s * SIN_30 * 0.3);
  ctx.lineTo(locs[6].x - s * COS_30 * 0.2, locs[6].y + s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3:1 port (10, 11)
  ctx.beginPath();
  ctx.moveTo(locs[10].x, locs[10].y);
  ctx.lineTo(locs[10].x + s * COS_30 * 0.4, locs[10].y - s * SIN_30 * 0.4);
  ctx.lineTo(locs[10].x + s * COS_30 * 0.5, locs[10].y - s * SIN_30 * 0.3);
  ctx.lineTo(locs[10].x + s * COS_30 * 0.2, locs[10].y + s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(locs[11].x, locs[11].y);
  ctx.lineTo(locs[11].x, locs[11].y - s * 0.4);
  ctx.lineTo(locs[11].x - s * COS_30 * 0.1, locs[11].y - s * SIN_30 * 0.1 - 0.4 * s);
  ctx.lineTo(locs[11].x - s * COS_30 * 0.2, locs[11].y - s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hay port (22, 23)
  ctx.beginPath();
  ctx.moveTo(locs[22].x, locs[22].y);
  ctx.lineTo(locs[22].x + s * COS_30 * 0.4, locs[22].y + s * SIN_30 * 0.4);
  ctx.lineTo(locs[22].x + s * COS_30 * 0.4, locs[22].y + s * 0.3);
  ctx.lineTo(locs[22].x, locs[22].y + s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(locs[23].x, locs[23].y);
  ctx.lineTo(locs[23].x + s * COS_30 * 0.4, locs[23].y - s * SIN_30 * 0.4);
  ctx.lineTo(locs[23].x + s * COS_30 * 0.4, locs[23].y - s * 0.3);
  ctx.lineTo(locs[23].x, locs[23].y - s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ore port (37, 45)
  ctx.beginPath();
  ctx.moveTo(locs[37].x, locs[37].y);
  ctx.lineTo(locs[37].x + s * COS_30 * 0.4, locs[37].y + s * SIN_30 * 0.4);
  ctx.lineTo(locs[37].x + s * COS_30 * 0.4, locs[37].y + s * 0.3);
  ctx.lineTo(locs[37].x, locs[37].y + s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(locs[45].x, locs[45].y);
  ctx.lineTo(locs[45].x + s * COS_30 * 0.4, locs[45].y - s * SIN_30 * 0.4);
  ctx.lineTo(locs[45].x + s * COS_30 * 0.4, locs[45].y - s * 0.3);
  ctx.lineTo(locs[45].x, locs[45].y - s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3:1 port (52, 53)
  ctx.beginPath();
  ctx.moveTo(locs[53].x, locs[53].y);
  ctx.lineTo(locs[53].x + s * COS_30 * 0.4, locs[53].y + s * SIN_30 * 0.4);
  ctx.lineTo(locs[53].x + s * COS_30 * 0.5, locs[53].y + s * SIN_30 * 0.3);
  ctx.lineTo(locs[53].x + s * COS_30 * 0.2, locs[53].y - s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(locs[52].x, locs[52].y);
  ctx.lineTo(locs[52].x, locs[52].y + s * 0.4);
  ctx.lineTo(locs[52].x - s * COS_30 * 0.1, locs[52].y + s * SIN_30 * 0.1 + 0.4 * s);
  ctx.lineTo(locs[52].x - s * COS_30 * 0.2, locs[52].y + s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sheep port (47, 51)
  ctx.beginPath();
  ctx.moveTo(locs[47].x, locs[47].y);
  ctx.lineTo(locs[47].x, locs[47].y + s * 0.4);
  ctx.lineTo(locs[47].x + s * COS_30 * 0.1, locs[47].y + s * SIN_30 * 0.1 + 0.4 * s);
  ctx.lineTo(locs[47].x + s * COS_30 * 0.2, locs[47].y + s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(locs[51].x, locs[51].y);
  ctx.lineTo(locs[51].x - s * COS_30 * 0.4, locs[51].y + s * SIN_30 * 0.4);
  ctx.lineTo(locs[51].x - s * COS_30 * 0.5, locs[51].y + s * SIN_30 * 0.3);
  ctx.lineTo(locs[51].x - s * COS_30 * 0.2, locs[51].y - s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3:1 port (39, 40)
  ctx.beginPath();
  ctx.moveTo(locs[40].x, locs[40].y);
  ctx.lineTo(locs[40].x, locs[40].y + s * 0.4);
  ctx.lineTo(locs[40].x + s * COS_30 * 0.1, locs[40].y + s * SIN_30 * 0.1 + 0.4 * s);
  ctx.lineTo(locs[40].x + s * COS_30 * 0.2, locs[40].y + s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(locs[39].x, locs[39].y);
  ctx.lineTo(locs[39].x - s * COS_30 * 0.4, locs[39].y + s * SIN_30 * 0.4);
  ctx.lineTo(locs[39].x - s * COS_30 * 0.5, locs[39].y + s * SIN_30 * 0.3);
  ctx.lineTo(locs[39].x - s * COS_30 * 0.2, locs[39].y - s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3:1 port (27, 28)
  ctx.beginPath();
  ctx.moveTo(locs[27].x, locs[27].y);
  ctx.lineTo(locs[27].x - s * COS_30 * 0.4, locs[27].y - s * SIN_30 * 0.4);
  ctx.lineTo(locs[27].x - s * COS_30 * 0.4, locs[27].y - s * 0.3);
  ctx.lineTo(locs[27].x, locs[27].y - s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(locs[28].x, locs[28].y);
  ctx.lineTo(locs[28].x - s * COS_30 * 0.4, locs[28].y + s * SIN_30 * 0.4);
  ctx.lineTo(locs[28].x - s * COS_30 * 0.4, locs[28].y + s * 0.3);
  ctx.lineTo(locs[28].x, locs[28].y + s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Brick port (4, 17)
  ctx.beginPath();
  ctx.moveTo(locs[17].x, locs[17].y);
  ctx.lineTo(locs[17].x, locs[17].y - s * 0.4);
  ctx.lineTo(locs[17].x + s * COS_30 * 0.1, locs[17].y - s * SIN_30 * 0.1 - 0.4 * s);
  ctx.lineTo(locs[17].x + s * COS_30 * 0.2, locs[17].y - s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(locs[4].x, locs[4].y);
  ctx.lineTo(locs[4].x - s * COS_30 * 0.4, locs[4].y - s * SIN_30 * 0.4);
  ctx.lineTo(locs[4].x - s * COS_30 * 0.5, locs[4].y - s * SIN_30 * 0.3);
  ctx.lineTo(locs[4].x - s * COS_30 * 0.2, locs[4].y + s * SIN_30 * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw labels
  ctx.font = '11pt Courier';
  ctx.fillStyle = 'black';
  
  // Wood port (1, 6)
  ctx.save();
  ctx.translate(locs[6].x, locs[6].y);
  ctx.rotate(Math.PI / 3);
  ctx.fillStyle = '#145214';
  ctx.fillText('2W:1', - s * COS_30 * 0.4, s / 2 + 3);
  ctx.restore();
  
  // 3:1 port (10, 11)
  ctx.save();
  ctx.translate(locs[10].x, locs[10].y);
  ctx.rotate(-Math.PI / 3);
  ctx.fillText('3:1', s * COS_30 * 0.4, s / 2 + 3);
  ctx.restore();
  
  // Hay port (22, 23)
  ctx.save();
  ctx.fillStyle = '#968a1d';
  ctx.fillText('2H:1', locs[22].x + s * COS_30 * 0.4, (locs[22].y + locs[23].y) / 2 + 3);
  ctx.restore();
  
  // Ore port (37, 45)
  ctx.save();
  ctx.fillStyle = '#666666';
  ctx.fillText('2O:1', locs[37].x + s * COS_30 * 0.4, (locs[37].y + locs[45].y) / 2 + 3);
  ctx.restore();
  
  // 3:1 port (52, 53)
  ctx.save();
  ctx.translate(locs[52].x, locs[52].y);
  ctx.rotate(Math.PI / 3);
  ctx.fillText('3:1', s * COS_30 * 0.4, s / 2 + 3);
  ctx.restore();

  // Sheep port (47, 51)
  ctx.save();
  ctx.translate(locs[47].x, locs[47].y);
  ctx.rotate(-Math.PI / 3);
  ctx.fillStyle = '#6b9023';
  ctx.fillText('2S:1', - s * COS_30 * 0.4, s / 2 + 3);
  ctx.restore();

  // 3:1 port (39, 40)
  ctx.save();
  ctx.translate(locs[40].x, locs[40].y);
  ctx.rotate(-Math.PI / 3);
  ctx.fillText('3:1', - s * COS_30 * 0.4, s / 2 + 3);
  ctx.restore();

  // 3:1 port (27, 28)
  ctx.fillText('3:1', locs[27].x - s * COS_30 * 0.4, (locs[27].y + locs[28].y) / 2 + 3);
  
  // Brick port (4, 17)
  ctx.save();
  ctx.translate(locs[4].x, locs[4].y);
  ctx.rotate(Math.PI / 3);
  ctx.fillStyle = '#aa3311';
  ctx.fillText('2B:1', - s * COS_30 * 0.4, s / 2 + 3);
  ctx.restore();
}

/**
 * Draw a settlement at (x, y)
 */
function drawSettlement(x, y, color) {
  ctx.beginPath();
  ctx.moveTo(x, y - 15);
  ctx.lineTo(x + 10, y - 5);
  ctx.lineTo(x + 10, y + 15);
  ctx.lineTo(x - 10, y + 15);
  ctx.lineTo(x - 10, y - 5);
  ctx.closePath();
  ctx.fillStyle = COLORS[color];
  ctx.fill();
  ctx.stroke();
}

/** 
 * Draw a city at (x, y)
 */
function drawCity(x, y, color) {
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 20);
  ctx.lineTo(x + 5, y - 10);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x + 20, y);
  ctx.lineTo(x + 20, y + 15);
  ctx.lineTo(x - 15, y + 15);
  ctx.lineTo(x - 15, y - 10);
  ctx.closePath();
  ctx.fillStyle = COLORS[color];
  ctx.fill();
  ctx.stroke();
}

/**
 * Draw a road from (x1, y1) to (x2, y2)
 */
function drawRoad(x1, y1, x2, y2, color) {
  ctx.beginPath();
  if (Math.abs(x1 - x2) > EPS) {
    ctx.moveTo(x1, y1 + 5);
    ctx.lineTo(x2, y2 + 5);
    ctx.lineTo(x2, y2 - 5);
    ctx.lineTo(x1, y1 - 5);
  } else if (y1 > y2) {
    ctx.moveTo(x1 - 4.5, y1 - 5);
    ctx.lineTo(x2 - 4.5, y2 + 5);
    ctx.lineTo(x2 + 4.5, y2 + 5);
    ctx.lineTo(x1 + 4.5, y1 - 5);
  } else if (y2 > y1) {
    ctx.moveTo(x1 - 4.5, y1 + 5);
    ctx.lineTo(x2 - 4.5, y2 - 5);
    ctx.lineTo(x2 + 4.5, y2 - 5);
    ctx.lineTo(x1 + 4.5, y1 + 5);
  }
  ctx.closePath();
  ctx.fillStyle = COLORS[color];
  ctx.fill();
  ctx.stroke();
}
