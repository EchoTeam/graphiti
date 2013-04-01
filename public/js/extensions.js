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

// Spinner
var spinnerOpts = {
  lines: 13, // The number of lines to draw
  length: 17, // The length of each line
  width: 7, // The line thickness
  radius: 40, // The radius of the inner circle
  corners: 1, // Corner roundness (0..1)
  rotate: 0, // The rotation offset
  color: '#000', // #rgb or #rrggbb
  speed: 1, // Rounds per second
  trail: 60, // Afterglow percentage
  shadow: false, // Whether to render a shadow
  hwaccel: false, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  top: 'auto', // Top position relative to parent in px
  left: 'auto' // Left position relative to parent in px
};
var spinnerTarget = document.getElementById('loading-spinner');
var spinner;
if (spinnerTarget) {
	spinner = new Spinner(spinnerOpts).spin(spinnerTarget);
}
