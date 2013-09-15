Graphiti = window.Graphiti || {};

Graphiti.refreshGraphs = function(target) {
  $(target).each(function() {
    var jqt = $(this);
    var img_src = jqt.attr('src');
    img_src.replace(/_timestamp_=.*/, '_timestamp_=' + (new Date().getTime()));
    jqt.animate({opacity: 0.5}, 2000, function() {
      jqt.bind('load', function() {
        jqt.animate({opacity: 1}, 2000);
      })
      .attr('src', img_src);
    });
  });
};

Graphiti.startRefresh = function(seconds){
  this.refreshTimer = setInterval(function(){
    if ($('#graphs-pane').is(':visible')) {
      Sammy.log('Refreshing graphs pane images');
      Graphiti.refreshGraphs('#graphs-pane div.graph img.ggraph');
    } else if ($('#editor-pane').is(':visible')) {
      Sammy.log('Refreshing preview pane images');
      Graphiti.refreshGraphs('#editor-pane div#graph-preview img');
    }
  }, seconds * 1000);
};

Graphiti.stopRefresh = function(){
  clearInterval(this.refreshTimer);
};

Graphiti.setRefresh = function(){
  if ($('#auto-refresh').prop('checked')) {
    Sammy.log("Starting automatic graphs refreshing.");
    this.startRefresh($('#auto-refresh').data('interval'));
  } else {
    Sammy.log("Stopped automatic graphs refreshing.");
    this.stopRefresh();
  }
};

$(Graphiti.setRefresh.bind(Graphiti));
$("#auto-refresh").change(Graphiti.setRefresh.bind(Graphiti));
