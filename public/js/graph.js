/*
Instantiating a new Graph:

// Pass an Object without options or target attributes to set some options:
var graph = new Graphiti.Graph({width:100,title:"Cool Graph"});

// Pass a string to set a Graph target:
var graph = new Graphiti.Graph('stats.beers.consumed');

// Pass an array to set a Graph target with options:
var graph = new Graphiti.Graph(['stats.beers.consumed',{drawAsInfinite:true}]);

// Pass an Object with options or target attribues:
var graph = new Graphiti.Graph({graphite: 'http://graphite.example.com', options:{width:1000}, targets:['stats']})

// Add attribues to the object
graph.addTarget('stats.times.stumbled);
graph.addTarget(['stats.times.stumbled',{drawAsInfinite:true}]);

// Build the URL
graph.buildURL();

*/

Graphiti = window.Graphiti || {};

Graphiti.Graph = function(graphParams){
  this.graphite_host = Graphiti.default_graphite_host;
  this.options = {};
  this.targets = [];
  this.parsedTargets = [];
  this.presentation = {};

  var defaults = {
    from:     '-6hour',
    until:    '',
    title:    "",
    vtitle:   ""
  };

  if (graphParams.graphite_host) {
    this.graphite_host = graphParams.graphite_host;
  }

  if (graphParams.options){
    $.extend(true, this.options, defaults, graphParams.options);
  } else {
    $.extend(true, this.options, defaults);
  }

  if (graphParams.targets){
    var i = 0, l = graphParams.targets.length;
    for (; i < l; i++) {
      this.addTarget(graphParams.targets[i]);
    }
  }

  if(!graphParams.options && !graphParams.targets){
    if(graphParams.charCodeAt){
      this.addTarget(graphParams);
    } else {
      if(graphParams instanceof Array){
        this.addTarget(graphParams);
      } else {
        $.extend(this.options, defaults, graphParams);
      };
    }
  }

  if (graphParams.presentation) {
    $.extend(true, this.presentation, graphParams.presentation);
  }
}

Graphiti.Graph.prototype = {
  updateOptions: function(options) {
    $.extend(true, this.options, options || {});
  },

  addTarget: function(targets){
    var json = "", target, options;
    if (typeof targets == 'string'){
      target = targets;
    } else {
      target = targets[0];
      options = targets[1];

      for (option in options){
        var key = option;
        var value = options[option];
        if (key == 'mostDeviant'){
          json = JSON.stringify(value);
          target = [key,"(",json,",",target,")"].join("");
        } else {
          if (value !== true){
            json = JSON.stringify(value);
            target = "" + key
              + "(" +
                target + "," +
                (json[0] === '[' && json.substr(1, json.length - 2) || json)
              + ")";
          } else {
            target = [key,"(",target,")"].join("");
          };
        };
      };
    };
    this.targets.push(targets);
    this.parsedTargets.push(target);
    return this;
  },

  buildURL: function(){
    var parts = [];
    $.each(this.options, function(key,value){
      parts.push(key + "=" + encodeURIComponent(value));
    });
    $.each(this.parsedTargets, function(c, target){
      parts.push("target=" + encodeURIComponent(target));
    });
    parts.push('_timestamp_=' + new Date().getTime());
    return "http://" + this.graphite_host + "/render/?" + parts.join('&');
  },

  image: function($image) {
    this.updateOptions($image.dimensions());
    $image.bind('load', function() {
        $(this).removeClass('loading');
      })
      .addClass('loading')
      .attr('src', this.buildURL());
    return $image;
  },

  toJSON: function() {
    return JSON.stringify({
                graphite_host: this.graphite_host,
                options: this.options,
                targets: this.targets,
                presentation: this.presentation
              }, null, 2);
  },

  save: function(uuid, callback) {
    var url;
    var data = {
      graph: {
        title: this.options.title || 'Untitled',
        json: this.toJSON()
      }
    };
    if ($.isFunction(uuid)) {
      callback = uuid;
      uuid = null;
    }
    // update
    if (uuid) {
      url = '/graphs/' + uuid;
      data['_method'] = 'PUT';
    // create
    } else {
      url = '/graphs';
    }
    $.ajax({
      url: url,
      data: data,
      type: 'post',
      success: callback
    });
  }
};
