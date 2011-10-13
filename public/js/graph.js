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
  var defaults = {
    width:    800,
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
  urlBase: "http://graphite01.pp.local/render/?",

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
          if (value != true){
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
    this.options.targets.push(target);
    return this;
  },

  buildURL: function(){
    var url = this.urlBase;
    $.each(this.options, function(key,value){
      if(key == "targets"){
        $.each(value, function(c, target){
          url += ("&target=" + target);
        });
      } else {
        url += ("&" + (key + "=" + value));
      };
    });
    return url;
  },

  image: function($image) {
    Sammy.log($image.dimensions());
    this.updateOptions($image.dimensions());
    $image.attr('src', this.buildURL());
    return $image;
  }
};
