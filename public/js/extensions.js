(function($) {

  var dimensions = function() {
    var $this = $(this);
    return {
      width: $this.width(),
      height: $this.height()
    };
  };

  $.extend($.fn, {
    dimensions: dimensions
  });
})(jQuery);
