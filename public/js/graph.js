/*
Instantiating a new Graph:

// Pass an Object without options or target attributes to set some options:
var graph = new Graphiti.Graph({width:100,title:"Cool Graph"});

// Pass a string to set a Graph target:
var graph = new Graphiti.Graph('stats.beers.consumed');

// Pass an array to set a Graph target with options:
var graph = new Graphiti.Graph(['stats.beers.consumed',{drawAsInfinite:true}]);

// Pass an Object with options or target attribues:
var graph = new Graphiti.Graph({options:{width:1000}, targets:['stats']})

// Add attribues to the object
graph.addTarget('stats.times.stumbled);
graph.addTarget(['stats.times.stumbled',{drawAsInfinite:true}]);

// Build the URL
graph.buildURL();

*/

Graphiti = window.Graphiti || {};

Graphiti.Graph = function(targetsAndOptions){
  this.options = {};
  this.targets = [];
  this.parsedTargets = [];

  var defaults = {
    width:    950,
    height:   400,
    from:     '-6hour',
    fontSize: "10",
    title:    "",
    targets:  []
  };

  if (targetsAndOptions.options){
    $.extend(true, this.options, defaults, targetsAndOptions.options);
  } else {
    $.extend(true, this.options, defaults);
  }

  if (targetsAndOptions.targets){
    var i = 0, l = targetsAndOptions.targets.length;
    for (; i < l; i++) {
      this.addTarget(targetsAndOptions.targets[i]);
    }
  };

  if(!targetsAndOptions.options && !targetsAndOptions.targets){
    if(targetsAndOptions.charCodeAt){
      this.addTarget(targetsAndOptions);
    } else {
      if(targetsAndOptions instanceof Array){
        this.addTarget(targetsAndOptions);
      } else {
        $.extend(this.options, defaults, targetsAndOptions);
      };
    }
  };
}

Graphiti.Graph.prototype = {
  urlBase: (function() { return Graphiti.graphite_base_url + "/render/?"; })(),

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
    var url = this.urlBase;
    var parts = [];
    $.each(this.options, function(key,value){
      parts.push(key + "=" + encodeURIComponent(value));
    });
    $.each(this.parsedTargets, function(c, target){
      parts.push("target=" + encodeURIComponent(target));
    });
    parts.push('_timestamp_=' + new Date().getTime());
    return url + parts.join('&') + '#.png';
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
    return JSON.stringify({options: this.options, targets: this.targets}, null, 2)
  },

  save: function(uuid, callback) {
    var url;
    var data = {
      graph: {
        title: this.options.title || 'Untitled',
        url: this.buildURL(),
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
  },

  snapshot: function(uuid, callback) {
    $.ajax({
      type: 'post',
      dataType: 'json',
      url: '/graphs/' + uuid + '/snapshot',
      success: function(json) {
        callback(json.url);
      }
    });
  }
};
