Graphiti = window.Graphiti || {};

Graphiti.startRefresh = function(seconds){
  this.refreshTimer = setInterval(function(){
    if (!$('#graphs-pane').is(':visible')) {Sammy.log("graphs pane is not visible, skip images reloading"); return};
    $('#graphs-pane div.graph img.ggraph').each(function() {
      var jqt = $(this);
      var src = jqt.attr('src');
      src.replace(/(^.*_timestamp_=).*/, function (match, _1) { return  _1 +  new Date().getTime() + "000#.png"; })
      jqt.animate({opacity: 0.5}, 2000, function() {
        jqt.bind('load', function() {
          jqt.animate({opacity: 1}, 2000);
        })
        .attr('src', src);
      });
    });
  }, seconds * 1000);
};

Graphiti.stopRefresh = function(){
  clearInterval(this.refreshTimer);
};

Graphiti.setRefresh = function(){
  if ($('#auto-refresh').prop('checked')) {
    console.log("starting");
    this.startRefresh($('#auto-refresh').data('interval'));
  } else {
    console.log("stop");
    this.stopRefresh();
  }
};

$(Graphiti.setRefresh.bind(Graphiti));
$("#auto-refresh").change(Graphiti.setRefresh.bind(Graphiti));
