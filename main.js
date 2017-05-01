"use strict";

var SPACE = {
  ticker: function (obj, highlight) {

    var arr = [];

    var tick = function() {
      arr.unshift(arr.pop());
      draw();
    };

    var draw = function() {
      obj.html(arr.join(''));
    };

    var init = function() {
      var chars = obj.html().split(' ').join('');
      var highlightFrom = -1;
      var highlightTo = -1;

      if (highlight) {
        highlightFrom = chars.toLowerCase().indexOf(highlight.toLowerCase());
        highlightTo = highlightFrom + highlight.length;
      }

      $.map( chars.split(''), function( val, i ) {
        var cls = '';
        if ((highlightFrom!=-1) && (i>=highlightFrom) && (i<highlightTo)) cls = 'highlight';
        arr.push('<span class="' + cls + '">' + val + '</span>');
      });

      setInterval(function() { tick(); }, 500);
      draw();
    };

    init();
  }
};

$( document ).ready(function() {
  SPACE.ticker($('h1.tagline'), 'space');
});