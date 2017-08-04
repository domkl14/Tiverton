function GameController(io, isExpansion) {
  var PLAYER_LIST = {}; // id by colors
  const NAMES = !isExpansion ? {red: 'RED', blue: 'BLUE', white: 'WHITE', orange: 'ORANGE'} :
    {red: 'RED', blue: 'BLUE', white: 'WHITE', orange: 'ORANGE', green: 'GREEN', purple: 'PURPLE'};
  const COLORS = !isExpansion ? ['red', 'blue', 'white', 'orange'] :
    ['red', 'blue', 'white', 'orange', 'green', 'purple'];
  const RESOURCE_LIMIT = !isExpansion ? 19 : 24;

  // Game properties
  var self = {
    s: 0, // Side length of a tile
    tiles: [], // Tile resource values, 0 = sand, 1 = wood, 2 = brick, 3 = ore, 4 = hay, 5 = sheep
    odds: [], // Odds per tile
    points: [], // Tile coordinates
    locations: [], // Coordinates of all possible locations / intersections
    adjacentLocations: {}, // Adjacent locations per location number
    adjacentTiles: {}, // Adjacent tiles per location number
    developmentCards: [], // Development cards deck
    playerDevelopmentCards: {}, // Development cards owned by players
    resources: {}, // Resources per player
    robber: 0, // Robber location
    placements: [], // Placements per location
    roadPlacements: [], // Array of placed roads between location coordinates
    hasAutoPickup: {} // Players having auto-pickup on
  }

  // Initialize game
  self.initialize = function(X0, Y0, S) {
    // Initialize tiles
    self.tiles = !isExpansion ? [0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5] :
      [-1, -1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5];
    shuffle(self.tiles);

    // Initialize odds
    self.odds = !isExpansion ? ['', 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9 ,9, 10, 10, 11, 11, 12] :
      [0, 0, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9 ,9, 10, 10, 10, 11, 11, 11, 12, 12];
    shuffle(self.odds);

    // Align sand tiles with blank odds
    if (!isExpansion) {
      self.odds[self.odds.indexOf('')] = self.odds[self.tiles.indexOf(0)];
      self.odds[self.tiles.indexOf(0)] = '';
      self.robber = self.tiles.indexOf(0);
    } else {
      self.odds[self.odds.indexOf(0)] = self.odds[self.tiles.indexOf(-1)];
      self.odds[self.tiles.indexOf(-1)] = '';
      self.tiles[self.tiles.indexOf(-1)] = 0;
      self.odds[self.odds.indexOf(0)] = self.odds[self.tiles.indexOf(-1)];
      self.odds[self.tiles.indexOf(-1)] = '';
      self.tiles[self.tiles.indexOf(-1)] = 0;
    }
    self.robber = self.tiles.indexOf(0);
    self.s = S;
    var w = Math.sqrt(3)/2 * S * 2;
    var h = S * 2;
    self.points = !isExpansion ? [
      {x: X0, y: Y0},
      {x: X0 + w, y: Y0},
      {x: X0 + w * 2, y: Y0},
      {x: X0 - w / 2, y: Y0 + h * 3 / 4},
      {x: X0 + w / 2, y: Y0 + h * 3 / 4},
      {x: X0 + w * 3 / 2, y: Y0 + h * 3 / 4},
      {x: X0 + w * 5 / 2, y: Y0 + h * 3 / 4},
      {x: X0 - w, y: Y0 + h * 3 / 2},
      {x: X0, y: Y0 + h * 3 / 2},
      {x: X0 + w, y: Y0 + h * 3 / 2},
      {x: X0 + w * 2, y: Y0 + h * 3 / 2},
      {x: X0 + w * 3, y: Y0 + h * 3 / 2},
      {x: X0 - w / 2, y: Y0 + h * 9 / 4},
      {x: X0 + w / 2, y: Y0 + h * 9 / 4},
      {x: X0 + w * 3 / 2, y: Y0 + h * 9 / 4},
      {x: X0 + w * 5 / 2, y: Y0 + h * 9 / 4},
      {x: X0, y: Y0 + h * 3},
      {x: X0 + w, y: Y0 + h * 3},
      {x: X0 + w * 2, y: Y0 + h * 3},
      ]
    : [
      {x: X0, y: Y0},
      {x: X0 + w, y: Y0},
      {x: X0 + w * 2, y: Y0},
      {x: X0 - w / 2, y: Y0 + h * 3 / 4},
      {x: X0 + w / 2, y: Y0 + h * 3 / 4},
      {x: X0 + w * 3 / 2, y: Y0 + h * 3 / 4},
      {x: X0 + w * 5 / 2, y: Y0 + h * 3 / 4},
      {x: X0 - w, y: Y0 + h * 3 / 2},
      {x: X0, y: Y0 + h * 3 / 2},
      {x: X0 + w, y: Y0 + h * 3 / 2},
      {x: X0 + w * 2, y: Y0 + h * 3 / 2},
      {x: X0 + w * 3, y: Y0 + h * 3 / 2},
      {x: X0 - w * 3 / 2, y: Y0 + h * 9 / 4},
      {x: X0 - w / 2, y: Y0 + h * 9 / 4},
      {x: X0 + w / 2, y: Y0 + h * 9 / 4},
      {x: X0 + w * 3 / 2, y: Y0 + h * 9 / 4},
      {x: X0 + w * 5 / 2, y: Y0 + h * 9 / 4},
      {x: X0 + w * 7 / 2, y: Y0 + h * 9 / 4},
      {x: X0 - w, y: Y0 + h * 3},
      {x: X0, y: Y0 + h * 3},
      {x: X0 + w, y: Y0 + h * 3},
      {x: X0 + w * 2, y: Y0 + h * 3},
      {x: X0 + w * 3, y: Y0 + h * 3},
      {x: X0 - w / 2, y: Y0 + h * 15 / 4},
      {x: X0 + w / 2, y: Y0 + h * 15 / 4},
      {x: X0 + w * 3 / 2, y: Y0 + h * 15 / 4},
      {x: X0 + w * 5 / 2, y: Y0 + h * 15 / 4},
      {x: X0, y: Y0 + h * 9 / 2},
      {x: X0 + w, y: Y0 + h * 9 / 2},
      {x: X0 + w * 2, y: Y0 + h * 9 / 2}
    ];
    self.locations = [];
    for (var i in self.points) {
      addLocations(self.points[i].x, self.points[i].y, S, self.locations);
    }
    self.adjacentLocations = !isExpansion ? {
      0:  [1, 5],
      1:  [0, 2, 6],
      2:  [1, 3, 9],
      3:  [2, 4, 14],
      4:  [3, 5, 17],
      5:  [0, 4],
      6:  [1, 7],
      7:  [6, 8, 10],
      8:  [7, 9, 13],
      9:  [2, 8, 18],
      10: [7, 11],
      11: [10, 12],
      12: [11, 13, 22],
      13: [8, 12, 20],
      14: [3, 15, 19],
      15: [14, 16, 25],
      16: [15, 17, 28],
      17: [4, 16],
      18: [9, 19, 21],
      19: [14, 18, 29],
      20: [13, 21, 24],
      21: [18, 20, 31],
      22: [12, 23],
      23: [22, 24, 35],
      24: [20, 23, 33],
      25: [15, 26, 30],
      26: [25, 27, 40],
      27: [26, 28],
      28: [16, 27],
      29: [19, 30, 32],
      30: [25, 29, 38],
      31: [21, 32, 34],
      32: [29, 31, 41],
      33: [24, 34, 37],
      34: [31, 33, 43],
      35: [23, 36],
      36: [35, 37],
      37: [33, 36, 45],
      38: [30, 39, 42],
      39: [38, 40, 49],
      40: [26, 39],
      41: [32, 42, 44],
      42: [38, 41, 47],
      43: [34, 44, 46],
      44: [41, 43, 50],
      45: [37, 46],
      46: [43, 45, 52],
      47: [42, 48, 51],
      48: [47, 49],
      49: [39, 48],
      50: [44, 51, 53],
      51: [47, 50],
      52: [46, 53],
      53: [50, 52]
    } : {
      0:  [1, 5],
      1:  [0, 2, 6],
      2:  [1, 3, 9],
      3:  [2, 4, 14],
      4:  [3, 5, 17],
      5:  [0, 4],
      6:  [1, 7],
      7:  [6, 8, 10],
      8:  [7, 9, 13],
      9:  [2, 8, 18],
      10: [7, 11],
      11: [10, 12],
      12: [11, 13, 22],
      13: [8, 12, 20],
      14: [3, 15, 19],
      15: [14, 16, 25],
      16: [15, 17, 28],
      17: [4, 16],
      18: [9, 19, 21],
      19: [14, 18, 29],
      20: [13, 21, 24],
      21: [18, 20, 31],
      22: [12, 23],
      23: [22, 24, 35],
      24: [20, 23, 33],
      25: [15, 26, 30],
      26: [25, 27, 38],
      27: [26, 28, 41],
      28: [16, 27],
      29: [19, 30, 32],
      30: [25, 29, 42],
      31: [21, 32, 34],
      32: [29, 31, 44],
      33: [24, 34, 37],
      34: [31, 33, 46],
      35: [23, 36],
      36: [35, 37, 50],
      37: [33, 36, 48],
      38: [26, 39, 43],
      39: [38, 40, 55],
      40: [39, 41],
      41: [27, 40],
      42: [30, 43, 45],
      43: [38, 42, 53],
      44: [32, 45, 47],
      45: [42, 44, 56],
      46: [34, 47, 49],
      47: [44, 46, 58],
      48: [37, 49, 52],
      49: [46, 48, 60],
      50: [36, 51],
      51: [50, 52],
      52: [48, 51, 62],
      53: [43, 54, 57],
      54: [53, 55, 66],
      55: [39, 54],
      56: [45, 57, 59],
      57: [53, 56, 64],
      58: [47, 59, 61],
      59: [56, 58, 67],
      60: [49, 61, 63],
      61: [58, 60, 69],
      62: [52, 63],
      63: [60, 62, 71],
      64: [57, 65, 68],
      65: [64, 66, 75],
      66: [54, 65],
      67: [59, 68, 70],
      68: [64, 67, 73],
      69: [61, 70, 72],
      70: [67, 69, 76],
      71: [63, 72],
      72: [69, 71, 78],
      73: [68, 74, 77],
      74: [73, 75],
      75: [65, 74],
      76: [77, 79],
      77: [73, 76],
      78: [72, 79],
      79: [76, 78]
    };
    self.adjacentTiles = !isExpansion ? {
      0:  [0],
      1:  [0, 1],
      2:  [0, 1, 4],
      3:  [0, 3, 4],
      4:  [0, 3],
      5:  [0],
      6:  [1],
      7:  [1, 2],
      8:  [1, 2, 5],
      9:  [1, 4, 5],
      10: [2],
      11: [2],
      12: [2, 6],
      13: [2, 5, 6],
      14: [3, 4, 8],
      15: [3, 7, 8],
      16: [3, 7],
      17: [3],
      18: [4, 5, 9],
      19: [4, 8, 9],
      20: [5, 6, 10],
      21: [5, 9, 10],
      22: [6],
      23: [6, 11],
      24: [6, 10, 11],
      25: [7, 8, 12],
      26: [7, 12],
      27: [7],
      28: [7],
      29: [8, 9, 13],
      30: [8, 12, 13],
      31: [9, 10, 14],
      32: [9, 13, 14],
      33: [10, 11, 15],
      34: [10, 14, 15],
      35: [11],
      36: [11],
      37: [11, 15],
      38: [12, 13, 16],
      39: [12, 16],
      40: [12],
      41: [13, 14, 17],
      42: [13, 16, 17],
      43: [14, 15, 18],
      44: [14, 17, 18],
      45: [15],
      46: [15, 18],
      47: [16, 17],
      48: [16],
      49: [16],
      50: [17, 18],
      51: [17],
      52: [18],
      53: [18]
    } : {
      0:  [0],
      1:  [0, 1],
      2:  [0, 1, 4],
      3:  [0, 3, 4],
      4:  [0, 3],
      5:  [0],
      6:  [1],
      7:  [1, 2],
      8:  [1, 2, 5],
      9:  [1, 4, 5],
      10: [2],
      11: [2],
      12: [2, 6],
      13: [2, 5, 6],
      14: [3, 4, 8],
      15: [3, 7, 8],
      16: [3, 7],
      17: [3],
      18: [4, 5, 9],
      19: [4, 8, 9],
      20: [5, 6, 10],
      21: [5, 9, 10],
      22: [6],
      23: [6, 11],
      24: [6, 10, 11],
      25: [7, 8, 13],
      26: [7, 12, 13],
      27: [7, 12],
      28: [7],
      29: [8, 9, 14],
      30: [8, 13, 14],
      31: [9, 10, 15],
      32: [9, 14, 15],
      33: [10, 11, 16],
      34: [10, 15, 16],
      35: [11],
      36: [11, 17],
      37: [11, 16 , 17],
      38: [12, 13, 18],
      39: [12, 18],
      40: [12],
      41: [12],
      42: [13, 14, 19],
      43: [13, 18, 19],
      44: [14, 15, 20],
      45: [14, 19, 20],
      46: [15, 16, 21],
      47: [15, 20, 21],
      48: [16, 17, 22],
      49: [16, 21, 22],
      50: [17],
      51: [17],
      52: [17, 22],
      53: [18, 19, 23],
      54: [18, 23],
      55: [18],
      56: [19, 20, 24],
      57: [19, 23, 24],
      58: [20, 21, 25],
      59: [20, 24, 25],
      60: [21, 22, 26],
      61: [21, 25, 26],
      62: [22],
      63: [22, 26],
      64: [23, 24, 27],
      65: [23, 27],
      66: [23],
      67: [24, 25, 28],
      68: [24, 27, 28],
      69: [25, 26, 29],
      70: [25, 28, 29],
      71: [26],
      72: [26, 29],
      73: [27, 28],
      74: [27],
      75: [27],
      76: [28, 29],
      77: [28],
      78: [29],
      79: [29]
    };
    self.developmentCards = [
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'knight', owner: null},
      {type: 'victory point', owner: null},
      {type: 'victory point', owner: null},
      {type: 'victory point', owner: null},
      {type: 'victory point', owner: null},
      {type: 'victory point', owner: null},
      {type: 'road building', owner: null},
      {type: 'road building', owner: null},
      {type: 'monopoly', owner: null},
      {type: 'monopoly', owner: null},
      {type: 'year of plenty', owner: null},
      {type: 'year of plenty', owner: null}
    ];
    if (isExpansion) {
      self.developmentCards.push(
        {type: 'knight', owner: null},
        {type: 'knight', owner: null},
        {type: 'knight', owner: null},
        {type: 'knight', owner: null},
        {type: 'knight', owner: null},
        {type: 'knight', owner: null},
        {type: 'road building', owner: null},
        {type: 'monopoly', owner: null},
        {type: 'year of plenty', owner: null}
      );
    }
    self.hasAutoPickup = !isExpansion ? {red: false, blue: false, white: false, orange: false} :
      {red: false, blue: false, white: false, orange: false, green: false, purple: false};
    return self;
  }

  // On socket connection to game
  self.onConnection = function(socket) {
    // Maximum of four players
    if (Object.keys(PLAYER_LIST).length >= COLORS.length) {
      console.log('Socket rejected:\t', socket.id);
      socket.emit('gameIsFull');
      return;
    }

    // Set color / id for player
    var id;
    for (var i in COLORS) {
      var isUsed = false;
      for (var j in PLAYER_LIST) {
        if (COLORS[i] == j) {
          isUsed = true;
        }
      }
      if (!isUsed) {
        id = COLORS[i];
        break;
      }
    }

    PLAYER_LIST[id] = socket;
    console.log('Socket connected:\t', socket.id, '(' + id + ')');

    // Add player to game and set initial resources
    if (self.resources[id] == null) {
      self.resources[id] = {wood: 0, brick: 0, hay: 0, sheep: 0, ore: 0};
    }

    // Initialize board on client side
    socket.emit('initializeBoard', {id: id, name: NAMES[id], game: self, resources: self.resources});
    io.emit('setDevelopmentCards', {playerDevelopmentCards: self.playerDevelopmentCards});

    // Announce new player joining
    io.emit('logMessage', {message: NAMES[id] + ' joined the game'});
    io.emit('listPlayers', {players: Object.keys(PLAYER_LIST), names: NAMES});

    /**
     * Send message to server / all clients
     * data: {message}
     */
    socket.on('sendMsgToServer', function(data) {
      io.emit('logMessage', data);
    });

    /**
     * Player changes their color
     * data: {color}
     */
    socket.on('changeColor', function(data) {
      if (Object.keys(PLAYER_LIST).length >= COLORS.length) {
        socket.emit('logError', {error: 'ALL COLORS TAKEN'});
        return;
      }
      var idx = COLORS.indexOf(data.color);
      while (PLAYER_LIST[COLORS[idx]] != null) {
        idx = (idx + 1) % COLORS.length;
      }
      var newColor = COLORS[idx];

      // Change id in player list
      PLAYER_LIST[newColor] = PLAYER_LIST[data.color];
      delete PLAYER_LIST[data.color];
      console.log('Socket changed:\t\t', id ,'->', newColor);
      id = newColor;

      if (self.resources[id] == null) {
        self.resources[id] = {wood: 0, brick: 0, hay: 0, sheep: 0, ore: 0};
      }

      socket.emit('changeColorNames', {newColor: newColor, name: NAMES[newColor]});
      socket.emit('setResources', {resources: self.resources});
      io.emit('listPlayers', {id: id, players: Object.keys(PLAYER_LIST), names: NAMES});
      io.emit('setDevelopmentCards', {playerDevelopmentCards: self.playerDevelopmentCards});
      io.emit('redrawBoard', {game: self});
    });

    /**
     * Player name change
     * data: {name}
     */
    socket.on('changeName', function(data) {
      io.emit('logMessage', {message: NAMES[id] + ' changed their name to ' + data.name.toUpperCase()});
      NAMES[id] = data.name.toUpperCase();
      io.emit('listPlayers', {id: id, players: Object.keys(PLAYER_LIST), names: NAMES});
    });

    /**
     * A seven is rolled
     */
    socket.on('rollSeven', function(data) {
      for (var i in self.resources) {
        var numResources = self.resources[i].wood + self.resources[i].brick + self.resources[i].hay +
          self.resources[i].sheep + self.resources[i].ore;
        if (numResources > 7) {
          io.emit('logMessage', {message: NAMES[i] + ' loses ' + parseInt(numResources / 2) + ' resources'});
        }
      }
    });

    /**
     * Distribute resources on a given roll
     * data: {roll}
     */
    socket.on('distributeResources', function(data) {
      // Count number of resources in the game
      var resource_counts = {wood: 0, brick: 0, hay: 0, sheep: 0, ore: 0};;
      for (var i in self.resources) {
        for (var j in self.resources[i]) {
          resource_counts[j] += self.resources[i][j];
        }
      }

      // Find out how much of each resource everyone picks up
      var pickup = {};
      for (var i in self.resources) {
        pickup[i] = {wood: 0, brick: 0, hay: 0, sheep: 0, ore: 0};
      }
      for (var i in self.placements) {
        if (self.placements[i] != null) {
          var numPickup = self.placements[i].type == 'city' ? 2 : self.placements[i].type == 'settlement' ? 1 : 0;
          for (var t in self.adjacentTiles[i]) {
            var tileIdx = self.adjacentTiles[i][t];
            if (self.odds[tileIdx] != data.roll) continue;
            if (tileIdx == self.robber) continue;
            if (self.tiles[tileIdx] == 0) continue;
            else if (self.tiles[tileIdx] == 1) pickup[self.placements[i].id].wood += numPickup; // wood
            else if (self.tiles[tileIdx] == 2) pickup[self.placements[i].id].brick += numPickup; // brick
            else if (self.tiles[tileIdx] == 3) pickup[self.placements[i].id].ore += numPickup; // ore
            else if (self.tiles[tileIdx] == 4) pickup[self.placements[i].id].hay += numPickup; // hay
            else if (self.tiles[tileIdx] == 5) pickup[self.placements[i].id].sheep += numPickup; // sheep
          }
        }
      }

      // Check resource limits
      for (var resource in resource_counts) {
        var total = resource_counts[resource];
        var numPlayersToPickup = 0;
        for (var i in pickup) {
          total += pickup[i][resource];
          if (pickup[i][resource] != 0) {
            numPlayersToPickup++;
          }
        }
        // No one picks up
        if (total > RESOURCE_LIMIT && numPlayersToPickup > 1) {
          for (var i in pickup) {
            pickup[i][resource] = 0;
          }
          io.emit('logMessage', {message: 'Not enough ' + resource.toUpperCase() + ' to fulfill harvest'});
        }
        // One person gets remaining amount of resource
        else if (total > RESOURCE_LIMIT && numPlayersToPickup == 1) {
          for (var i in pickup) {
            if (pickup[i][resource] != 0) {
              pickup[i][resource] = RESOURCE_LIMIT - resource_counts[resource];
              break;
            }
          }
        }
      }

      // Log game messages
      for (var i in pickup) {
        if (pickup[i].wood + pickup[i].brick + pickup[i].ore + pickup[i].hay + pickup[i].sheep == 0) continue;
        var message;
        if (self.hasAutoPickup[i]) {
          message = NAMES[i] + ' auto-picked up';
        } else {
          message = NAMES[i] + ' harvested';
        }
        if (pickup[i].wood != 0)  message += ' ' + pickup[i].wood + ' WOOD,';
        if (pickup[i].brick != 0) message += ' ' + pickup[i].brick + ' BRICK,';
        if (pickup[i].ore != 0)   message += ' '  + pickup[i].ore + ' ORE,';
        if (pickup[i].hay != 0)   message += ' '  + pickup[i].hay + ' HAY,';
        if (pickup[i].sheep != 0) message += ' '  + pickup[i].sheep + ' SHEEP,';
        message = message.substring(0, message.length - 1);

        if (self.hasAutoPickup[i]) {
          self.resources[i].wood += pickup[i].wood;
          self.resources[i].brick += pickup[i].brick;
          self.resources[i].ore += pickup[i].ore;
          self.resources[i].hay += pickup[i].hay;
          self.resources[i].sheep += pickup[i].sheep;
        }
        io.emit('setResources', {resources: self.resources});
        io.emit('logMessage', {message: message});
      }
    });

    /**
     * Move robber
     * data: {idx}
     */
    socket.on('moveRobber', function(data) {
      // Check valid robber placement
      if (self.robber == data.idx) {
        socket.emit('logError', {error: 'INVALID ROBBER PLACEMENT'});
        return;
      }
      self.robber = data.idx;
      io.emit('logMessage', {message: NAMES[id] + ' moved the ROBBER'});
      io.emit('redrawBoard', {game: self});
    });

    /**
     * Rob another player
     * data: {idx}
     */
    socket.on('rob', function(data) {
      // Check if there exists a settlement / city at location
      if (self.placements[data.idx] == null) {
        socket.emit('logError', {error: 'NO SETTLER AT LOCATION'});
        return;
      }
      // Check if settlement / city is on the robber tile
      var isValid = false;
      for (var i in self.adjacentTiles[data.idx]) {
        var tileIdx = self.adjacentTiles[data.idx][i];
        if (tileIdx == self.robber) {
          isValid = true;
          break;
        }
      }
      if (!isValid) {
        socket.emit('logError', {error: 'SETTLER NOT ON ROBBER'});
        return;
      }
      // Check not robbing yourself
      var victimId = self.placements[data.idx].id;
      if (victimId == id) {
        socket.emit('logError', {error: 'UNABLE TO ROB YOURSELF'});
        return;
      }
      var numResources = self.resources[victimId].wood + self.resources[victimId].brick + self.resources[victimId].hay +
        self.resources[victimId].sheep + self.resources[victimId].ore;
      if (numResources == 0) {
        io.emit('logMessage', {message: NAMES[id] + ' robbed NOTHING from ' +
          NAMES[self.placements[data.idx].id]});
        return;
      }
      // Rob a random resource
      var r = parseInt(Math.random() * numResources);
      var count = 0;
      var robbedResource;
      for (var i in self.resources[victimId]) {
        count += self.resources[victimId][i];
        if (count > r) {
          robbedResource = i;
          break;
        }
      }
      self.resources[victimId][i]--;
      self.resources[id][i]++;
      io.emit('setResources', {resources: self.resources});
      io.emit('logMessage', {message: NAMES[id] + ' robbed a' +
        (robbedResource == 'ore' ? 'n ' : ' ') + robbedResource.toUpperCase() + ' from ' +
        NAMES[self.placements[data.idx].id]});
    });

    /**
     * Player toggles auto-pickup
     */
    socket.on('toggleAutoPickup', function(data) {
      self.hasAutoPickup[id] = !self.hasAutoPickup[id];
    });

    /**
     * Player requests to add a road
     * data: {idx1, idx2}
     */
    socket.on('addRoad', function(data) {
      // Check if enough pieces remaining
      var count = 0;
      for (var i in self.roadPlacements) {
        if (self.roadPlacements[i].id == id) {
          count++;
        }
      }
      if (count == 15) {
        socket.emit('logError', {error: 'NO REMAINING ROADS'});
        return;
      }
      // Check if road location already taken
      for (var i in self.roadPlacements) {
        if (self.roadPlacements[i].idx1 == data.idx1 && self.roadPlacements[i].idx2 == data.idx2
          || self.roadPlacements[i].idx2 == data.idx1 && self.roadPlacements[i].idx1 == data.idx2) {
          socket.emit('logError', {error: 'ROAD LOCATION TAKEN'});
          return;
        }
      }
      // Check connects to a road / settlement / city
      var connectedToPiece = false;
      if (self.placements[data.idx1] != null && self.placements[data.idx1].id == id) connectedToPiece = true;
      if (self.placements[data.idx2] != null && self.placements[data.idx2].id == id) connectedToPiece = true;
      var connectedToRoad = false;
      for (var i in self.roadPlacements) {
        if (self.roadPlacements[i].id == id && (self.roadPlacements[i].idx1 == data.idx1 ||
          self.roadPlacements[i].idx1 == data.idx2 || self.roadPlacements[i].idx2 == data.idx1 ||
          self.roadPlacements[i].idx2 == data.idx2)) {
          connectedToRoad = true;
          break;
        }
      }
      // If more than two roads - has to be connected to a road / settlement / city
      if (count >= 2 && (!connectedToRoad && !connectedToPiece)) {
        socket.emit('logError', {error: 'NOT CONNECTED TO A ROAD / SETTLEMENT / CITY'});
        return;
      }
      // If less than two roads - has to be connected to a settlement
      if (count < 2 && !connectedToPiece) {
        socket.emit('logError', {error: 'INVALID INITIAL ROAD PLACEMENT'});
        return;
      }
      // Check points are adjacent
      var adjacent = false;
      for (var i in self.adjacentLocations[data.idx1]) {
        if (data.idx2 == self.adjacentLocations[data.idx1][i]) {
          adjacent = true;
          break;
        }
      }
      if (!adjacent) return;
      self.roadPlacements.push({id: id, idx1: data.idx1, idx2: data.idx2});
      io.emit('logMessage', {message: NAMES[id] + ' built a ROAD'});
      io.emit('redrawBoard', {game: self});
    });

    /**
     * Player requests to add a settlement / city
     * data: {idx, type}
     */
    socket.on('addPiece', function(data) {
      // Check if enough pieces remaining
      var count = 0;
      for (var i in self.placements) {
        if (self.placements[i] != null && self.placements[i].id == id && self.placements[i].type == data.type)
          count++;
      }
      if (data.type == 'settlement' && count == 5) {
        socket.emit('logError', {error: 'NO REMAINING SETTLEMENTS'});
        return;
      } else if (data.type == 'city' && count == 4) {
        socket.emit('logError', {error: 'NO REMAINING CITIES'});
        return;
      }
      // If settlement, check connects to a road (if more than two roads)
      var numRoads = 0;
      for (var i in self.roadPlacements) {
        if (self.roadPlacements[i].id == id)
          numRoads++;
      }
      if (data.type == 'settlement') {
        if (numRoads >= 2) {
          var connectedToRoad = false;
          for (var i in self.roadPlacements) {
            if (self.roadPlacements[i].id == id && (self.roadPlacements[i].idx1 == data.idx ||
              self.roadPlacements[i].idx2 == data.idx)) {
              connectedToRoad = true;
              break;
            }
          }
          if (!connectedToRoad) {
            socket.emit('logError', {error: 'SETTLEMENT NOT CONNECTED TO A ROAD'});
            return;
          }
        } else if (count == 2) {
          socket.emit('logError', {error: 'NO MORE INITIAL PLACEMENTS'});
          return;
        }
      }
      // If settlement, check if location already taken
      if (data.type == 'settlement' && self.placements[data.idx] != null) {
        socket.emit('logError', {error: data.type.toUpperCase() + ' LOCATION TAKEN'});
        return;
      }
      // Check if location adjacent to any placements
      for (var i in self.adjacentLocations[data.idx]) {
        if (self.placements[self.adjacentLocations[data.idx][i]] != null) {
           socket.emit('logError', {error: 'LOCATION ADJACENT TO A SETTLEMENT / CITY'});
           return;
         }
      }
      // If city, check is on top of a settlement
      if (data.type == 'city' && (numRoads < 2 || !(self.placements[data.idx] != null &&
        self.placements[data.idx].type == 'settlement' && self.placements[data.idx].id == id))) {
        socket.emit('logError', {error: 'INVALID CITY PLACEMENT'});
        return;
      }
      self.placements[data.idx] = {id: id, type: data.type};
      io.emit('logMessage', {message: NAMES[id] + ' built a ' + data.type.toUpperCase()});
      io.emit('redrawBoard', {game: self});
    });

    /**
     * Development card
     */
    socket.on('developmentCard', function(data) {
      // Check if there are any remaining development cards
      var remaining = false;
      for (var i in self.developmentCards) {
        if (self.developmentCards[i].owner == null) {
          remaining = true;
          break;
        }
      }
      if (!remaining) {
        socket.emit('logError', {error: 'NO REMAINING DEVELOPMENT CARDS'});
        return;
      }
      // Get random development card
      var r = parseInt(Math.random() * self.developmentCards.length);
      var dcard = self.developmentCards[r];
      while (dcard.owner != null) {
        r = parseInt(Math.random() * self.developmentCards.length);
        dcard = self.developmentCards[r];
      }
      dcard.owner = id;
      if (self.playerDevelopmentCards[id] == null) {
        self.playerDevelopmentCards[id] = [];
      }
      self.playerDevelopmentCards[id].push({type: dcard.type, used: false});

      io.emit('logMessage', {message: NAMES[id] + ' built a DEVELOPMENT CARD'});
      io.emit('setDevelopmentCards', {playerDevelopmentCards: self.playerDevelopmentCards});
    });

    /**
     * Player requests to remove a road
     * data: {idx1, idx2}
     */
    socket.on('removeRoad', function(data) {
      // Check validity
      var isValid = false;
      for (var i in self.roadPlacements) {
        if (self.roadPlacements[i].id == id && (self.roadPlacements[i].idx1 == data.idx1 &&
          self.roadPlacements[i].idx2 == data.idx2 || self.roadPlacements[i].idx2 == data.idx1 &&
          self.roadPlacements[i].idx1 == data.idx2)) {
          isValid = true;
          self.roadPlacements.splice(i, 1);
          break;
        }
      }
      if (!isValid) {
        socket.emit('logError', {error: 'INVALID ROAD REMOVAL'});
        return;
      }
      io.emit('logMessage', {message: NAMES[id] + ' removed a ROAD'});
      io.emit('redrawBoard', {game: self});
    });

    /**
     * Player requests to remove a settlement / city
     * data: {idx}
     */
    socket.on('removePiece', function(data) {
      // Check validity
      var type;
      for (var i in self.placements) {
        if (self.placements[i] != null && self.placements[i].id == id && i == data.idx) {
          type = self.placements[i].type;
          self.placements[i] = null;
          break;
        }
      }
      if (type == undefined) {
        socket.emit('logError', {error: 'INVALID CITY/SETTLEMENT REMOVAL'});
        return;
      }
      io.emit('logMessage', {message: NAMES[id] + ' removed a ' + type.toUpperCase()});
      io.emit('redrawBoard', {game: self});
    });

    /**
     * Player requests to remove a development card
     * data: {idx}
     */
    socket.on('removeDevelopmentCard', function(data) {
      self.playerDevelopmentCards[id].splice(data.idx, 1);
      io.emit('setDevelopmentCards', {playerDevelopmentCards: self.playerDevelopmentCards});
      io.emit('logMessage', {message: NAMES[id] + ' removed a DEVELOPMENT CARD'});
    });

    /**
     * Player requests to adjust resource amount
     * data: {resource, type}
     */
    socket.on('adjustResources', function(data) {
      // Check enough resources if adding
      if (data.type == 'plus') {
        var count = 0;
        for (var i in self.resources)
          count += self.resources[i][data.resource];
        if (count >= RESOURCE_LIMIT) {
          socket.emit('logError', {error: 'No more ' + data.resource.toUpperCase() + ' remaining'});
          return;
        }
      }

      // Adjust resource
      if (self.resources[id] == null)
        self.resources[id] = {wood: 0, brick: 0, hay: 0, sheep: 0, ore: 0};
      self.resources[id][data.resource] += data.type == 'plus' ? 1 : -1;

      socket.emit('setResources', {resources: self.resources});
      if (data.type == 'plus') {
        if (data.resource == 'ore')
          io.emit('logMessage', {message: NAMES[id] + ' picked up an ORE'});
        else
          io.emit('logMessage', {message: NAMES[id] + ' picked up a ' + data.resource.toUpperCase()});
      } else if (data.type == 'minus') {
        if (data.resource == 'ore')
          io.emit('logMessage', {message: NAMES[id] + ' dropped an ORE'});
        else
          io.emit('logMessage', {message: NAMES[id] + ' dropped a ' + data.resource.toUpperCase()});
      }
    });

    /**
     * Player uses a development card
     * data: {idx}
     */
    socket.on('useDevelopmentCard', function(data) {
      self.playerDevelopmentCards[id][data.idx].used = true;
      io.emit('setDevelopmentCards', {playerDevelopmentCards: self.playerDevelopmentCards});
      var message;
      if (self.playerDevelopmentCards[id][data.idx].type == 'knight' ||
        self.playerDevelopmentCards[id][data.idx].type == 'victory point') {
        message = NAMES[id] + ' used a ' + self.playerDevelopmentCards[id][data.idx].type.toUpperCase();
      } else {
        message = NAMES[id] + ' used ' + self.playerDevelopmentCards[id][data.idx].type.toUpperCase();
      }
      io.emit('logMessage', {message: message});
    });

    /**
     * Player hides a development card
     * data: {idx}
     */
    socket.on('hideDevelopmentCard', function(data) {
      self.playerDevelopmentCards[id][data.idx].used = false;
      io.emit('setDevelopmentCards', {playerDevelopmentCards: self.playerDevelopmentCards});
    });

    /**
     * On socket disconnect
     */
    socket.on('disconnect', function() {
      console.log('Socket disconnected:\t', socket.id, '(' + id + ')');
      io.emit('logMessage', {message: NAMES[id] + ' left the game'});
      delete PLAYER_LIST[id];
      io.emit('listPlayers', {players: Object.keys(PLAYER_LIST), names: NAMES});
    });
  };
  return self;
}

/**
 * Shuffle array a
 */
function shuffle(a) {
  var j, x, i;
  for (i = a.length; i; i--) {
    j = Math.floor(Math.random() * i);
    x = a[i - 1];
    a[i - 1] = a[j];
    a[j] = x;
  }
}

/**
 * Add locations from tile with point (x, y) and side length s
 */
function addLocations(x, y, s, locs) {
  var h = 2 * s;
  var w = Math.sqrt(3) / 2 * s * 2;
  var new_locs = [];
  new_locs.push({x: x, y: y});
  new_locs.push({x: x + w / 2, y: y + s / 2});
  new_locs.push({x: x + w / 2, y: y + s + s / 2});
  new_locs.push({x: x, y: y + h});
  new_locs.push({x: x - w / 2, y: y + s + s / 2});
  new_locs.push({x: x - w / 2, y: y + s / 2});

  for (var i = 0; i < new_locs.length; i++) {
    var isDupe = false;
    for (var j = 0; j < locs.length; j++) {
      if (Math.abs(locs[j].x - new_locs[i].x) + Math.abs(locs[j].y - new_locs[i].y) < 0.01) {
        isDupe = true;
        break;
      }
    }
    if (!isDupe) {
      locs.push(new_locs[i]);
    }
  }
}

module.exports = GameController;
