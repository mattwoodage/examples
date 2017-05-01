'use strict'

// IMMEDIATELY INVOKED FUNCTION EXPRESSION
// used for privatising scope and not having global vars.  For when one instance is enough.
// brackets are needed to force the parser to parse the function as an expression, not a declaration

// new Calc() is not used here - this is used for creating an instance of a 'class'

var Calc = (function() {
  var data = {
    mem: 0
  }
  var container;

  var build = function() {

    $(container).on('click', ".add", function(event){
      event.preventDefault();
      console.log('add')
    });

    $(container).on('click', ".minus", function(event){
      event.preventDefault();
      console.log('minus')
    });

  }

  var loop = function() {
    var a, i, j, len;

    a = [1, 2, 3];

    for (j = 0, len = a.length; j < len; j++) {
      i = a[j];
      alert(i);
    }

    //coffeescript
    // a = [1,2,3]
    // for i in a
    //   alert(i)


  }

  return {
    init: function(_container) {
      container = _container;
      build();
    }
  };

})();

Calc.init($('#calculator'));