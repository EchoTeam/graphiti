var app = Sammy('body', function() {
  this.use('Session');

  var defaultGraph = {
            "options": {
              "title": "New Graph"
            },
            "targets": [
              "stats.timers.production.rails.controller.total.mean"
            ]
          };

  this.helpers({
    setupEditor: function() {
      if (this.app.editor) return;

      var ctx = this;
      var editor = this.app.editor = ace.edit("editor");
      editor.setTheme("ace/theme/textmate");
      var JSONMode = require("ace/mode/json").Mode;
      var session = editor.getSession();
      session.setMode(new JSONMode());
      session.setUseSoftTabs(true);
      session.setTabSize(2);

      var canon = require("pilot/canon");

      canon.addCommand({
         name: "save",
         bindKey: {
           win: "Ctrl-S",
           mac: "Command-S",
           sender: function() { Sammy.log(arguments) }
         },
         exec: function() {
           try {
             ctx.graphPreview(ctx.getEditorJSON());
            } catch(e) {
              alert(e);
            }
         }
      });

      key('command+s', function() {
        Sammy.log("command+s");
        return false;
      });
    },
    showEditor: function(text, uuid) {
      $('#editor-pane').show();
      if (!text) {
        text = defaultGraph;
      }
      this.setupEditor();
      var text = this.setEditorJSON(text);
      $('#editor').show();
      this.graphPreview(JSON.parse(text));
      this.loadMetricsList()
      if (uuid) { // this is an already saved graph
        $('#graph-actions .update')
          .attr('action', '/graphs/' + uuid)
          .show();
      } else {
        $('#graph-actions .update').hide();
      }
    },
    getEditorJSON: function() {
      return JSON.parse(this.app.editor.getSession().getValue());
    },
    setEditorJSON: function(text) {
      if (typeof text != 'string') {
        text = JSON.stringify(text, null, 2);
      }
      this.app.editor.getSession().setValue(text);
      return text;
    },
    graphPreview: function(options) {
      // get width/height from img
      this.session('lastPreview', options, function() {
        var $img = $("#graph-preview img");
        options.options = $.extend(true, {}, $img.dimensions(), options.options);
        Sammy.log(options);
        var graph = new Graphiti.Graph(options);
        var url = graph.buildURL();
        Sammy.log(url);
        $img.attr('src', url);
      });
    },
    loadMetricsList: function() {
      return this.load('/metrics')
                 .then(function(resp) {
                   this.next(resp.metrics);
                 })
                .then(function(metrics) {
                  var $list = $('#metrics-list ul');
                  var $li = $list.find('li:first').clone();
                  $list.html('');
                  var i = 0, l = metrics.length;
                  for (; i < l; i++) {
                    $li.clone()
                    .find('strong').text(metrics[i])
                    .end()
                    .appendTo($list);
                  }
                  // bind delegates only the first time
                  if (!$list.is('.bound')) {
                    $list.delegate('li a', 'click', function(e) {
                      e.preventDefault();
                      var action = $(this).attr('rel'),
                          metric = $(this).siblings('strong').text();
                      Sammy.log('clicked', action, metric);
                      ctx[action + "GraphMetric"](metric);
                    }).addClass('.bound');
                  }
                });
    },
    addGraphMetric: function(metric) {
      var json = this.getEditorJSON();
      json.targets.push([metric]);
      this.graphPreview(json);
      this.setEditorJSON(json);
    },
    replaceGraphMetric: function(metric) {
      var json = this.getEditorJSON();
      json.targets = [[metric]];
      this.graphPreview(json);
      this.setEditorJSON(json);
    }
  });

  this.get('/graphs/new', function(ctx) {
    this.session('lastPreview', function(lastPreview) {
      ctx.showEditor(lastPreview);
    });
  });

  this.get('/graphs/:uuid', function(ctx) {
    this.load('/graphs/' + this.params.uuid + '.js')
        .then(function(graph_data) {
          ctx.showEditor(graph_data.json, ctx.params.uuid);
        });
  });

  this.post('/graphs', function(ctx) {
    var json = this.getEditorJSON();
    var data = {
      url: new Graphiti.Graph(json).buildURL(),
      json: JSON.stringify(json, null, 2)
    };
    $.post('/graphs', {graph: data}, function(resp) {
      Sammy.log(resp);
      if (resp.uuid) {
        ctx.redirect('/graphs/' + resp.uuid);
      }
    });
  });

  this.put('/graphs/:uuid', function(ctx) {
    var json = this.getEditorJSON();
    var data = {
      url: new Graphiti.Graph(json).buildURL(),
      json: JSON.stringify(json, null, 2)
    };
    $.ajax({
      url: '/graphs/' + this.params.uuid,
      data: {graph: data, '_method': 'PUT'},
      type: 'post',
      success: function(resp) {
        Sammy.log(resp);
        if (resp.uuid) {
          ctx.redirect('/graphs/' + resp.uuid);
        }
      }
    });
  });

  this.bind('run', function() {
    var ctx = this;
    $('#editor-pane')
    .delegate('.edit-group .edit-head', 'click', function(e) {
      e.preventDefault();
      var $group = $(this).add($(this).siblings('.edit-body'))
      Sammy.log($group);
      if ($group.is('.closed')) {
        $group.removeClass('closed').addClass('open');
      } else {
        $group.addClass('closed').removeClass('open');
      }
    });
  });

});

$(function() {
  app.run();
});
