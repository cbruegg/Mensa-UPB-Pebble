/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var ajax = require('ajax');

//
// Extensions
//
function addDays(date, days) {
    var dat = new Date(date.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

//
// API
//


var baseUrl = 'http://www.studentenwerk-pb.de/fileadmin/shareddata/access2.php?id=' + apiId;
var restaurantUrl = baseUrl + '&getrestaurants=1';
 
function downloadRestaurants(url, onSuccess, onError) {
  ajax({url: url, type: 'json'}, 
            function(data, status, request) {
              // Restaurants are provided as objects, convert to array
              onSuccess(convertToRestaurantArray(data));
            }, 
            function(error, status, request) {
              onError(error);
            });
}
  
function downloadDishes(restaurantId, onSuccess, onError) {
  var MAX_TRIALS = 5;
  
  var forDate = new Date();
  var trials = 0;
  
  var onErrorInternal =  function(error, status, request) {
    onError(error);
  };
  
  var onSuccessInternal = function(data, status, request) {
    if (data.length > 0) {
      onSuccess(data);
    } else if (trials++ < MAX_TRIALS) {
      forDate = addDays(forDate, 1);
      downloadDishesInternal(restaurantId, forDate, onSuccessInternal, onErrorInternal);
    } else {
      onError('No data');
    }
  };

  downloadDishesInternal(restaurantId, forDate, onSuccessInternal, onErrorInternal);
}

function downloadDishesInternal(restaurantId, date, onSuccess, onError) {
  ajax({url: generateDishesUrl(restaurantId, date), type: 'json'}, 
            function(data, status, request) {
                onSuccess(data);
            }, 
            function(error, status, request) {
              onError(error);
            });
}
  
function generateDishesUrl(restaurantId, date) {
  return baseUrl + '&restaurant=' + restaurantId + '&date=' + formatApiDate(date);
}

function formatApiDate(date) {
  return date.getFullYear() + '-' + formatMinTwoChars(date.getMonth() + 1) + '-' + formatMinTwoChars(date.getDate() + 1);
}

function formatMinTwoChars(number) {
  return number < 10 ? '0' + number : number;
}

function convertToRestaurantArray(object) {
  var arr = [];
  for (var restaurantId in object) {
    var restaurant = object[restaurantId];
    restaurant.id = restaurantId;
    arr.push(restaurant);
  }
  return arr;
}

//
// UI
//

function showRestaurants(restaurants) {
  var items = restaurants.map(function(restaurant) {
    return {title: restaurant.name};
  });
  
  var menu = new UI.Menu({
    backgroundColor: 'black',
    textColor: 'white',
    highlightBackgroundColor: 'white',
    highlightTextColor: 'black',
    sections: [{title: 'Restaurants', items: items}]
  });
  menu.on('select', function(e) {
    var selectedRestaurant = restaurants[e.itemIndex];
    loadRestaurant(selectedRestaurant);
  });
  menu.show();
}

function loadRestaurant(restaurant) {
  downloadDishes(restaurant.id, function(dishes) {
      showRestaurantDishes(restaurant, dishes);
    }, function(error){
      showPopup('Error', 'Couldn\'t load the restaurant.');
    });
}

function showPopup(title, body) {
  var popup = new UI.Card({
    title: title,
    body: body
  });
  popup.show();
}

function showRestaurantDishes(restaurant, dishes) {
  sortDishesByCategory(dishes);
  var items = dishes.map(function(dish) {
    return {title: dish.name_de};
  });
  
  var menu = new UI.Menu({
    backgroundColor: 'black',
    textColor: 'white',
    highlightBackgroundColor: 'white',
    highlightTextColor: 'black',
    sections: [{title: restaurant.name, items: items}]
  });
  menu.on('select', function(e) {
    var selectedDish = dishes[e.itemIndex];
    showPopup(selectedDish.category_de, selectedDish.name_de + '\n\n' + selectedDish.date);
  });
  menu.show();
}

function sortDishesByCategory(dishes) {
  var compare = function(a,b) {
    if (a.category_de < b.category_de) {
      return -1;
    } else if (a.category_de > b.category_de) {
      return 1;
    } else {
      return 0;
    }
  };
  
  dishes.sort(compare);
  dishes.reverse();
}

/// Main code

// Show splash
var splashCard = new UI.Card({
  title: "Please Wait",
  body: "Downloading..."
});
splashCard.show();

downloadRestaurants(
  restaurantUrl,
  function(restaurants) {
    showRestaurants(restaurants);
    splashCard.hide();
  }, 
  function(error){
    showPopup('Error', 'Couldn\'t download restaurants.');
  }
);
