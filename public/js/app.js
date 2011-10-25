var app = Sammy('body', function() {
  this.use('Session');
  this.use('NestedParams');

  var defaultGraph = {
            "options": {
              "title": "New Graph"
            },
            "targets": [
              "stats.timers.production.rails.controller.total.mean"
            ]
          };


  var canon = require("pilot/canon");

  this.registerShortcut = function(name, keys, callback) {
    var app = this;
    app.bind(name, callback);
    canon.addCommand({
       name: name,
       bindKey: {
         win: "Ctrl-" + keys,
         mac: "Command-" + keys,
         sender: 'editor'
       },
       exec: function() {
         app.trigger(name);
       }
    });

    key('command+' + keys, function() {
      app.trigger(name);
      return false;
    });
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
    },
    redrawPreview: function() {
      try {
        this.log('redraw');
        this.graphPreview(this.getEditorJSON());
      } catch(e) {
        alert(e);
      }
      return false;
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
      this.buildDashboardsDropdown(uuid);
      if (uuid) { // this is an already saved graph
        $('#graph-actions .update')
          .attr('action', '/graphs/' + uuid)
          .show();
        $('[name=uuid]').val(uuid);
        $('#graph-actions .dashboard').show();
      } else {
        $('#graph-actions .update, #graph-actions .dashboard').hide();
      }
      this.toggleEditorPanesByPreference();
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
        var $img = $("#graph-preview img"), $url = $('#graph-url input');
        var graph = new Graphiti.Graph(options);
        graph.image($img);
        $url.val(graph.buildURL());
      });
      this.updateOptionsForm(options);
    },
    updateOptionsForm: function(options) {
      var opts = options.options ? options.options : options,
          key, $form = $('#graph-options form');
      for (key in opts) {
        if (opts[key] != '') {
          $form.find('[name="options[' + key + ']"]').val(opts[key]);
        }
      }
    },
    saveOptions: function(params) {
      var json = this.getEditorJSON();
      json.options = params;
      this.graphPreview(json);
      this.setEditorJSON(json);
    },
    loadMetricsList: function(refresh) {
      var ctx = this;
      var url = '/metrics.js';
      if (refresh) { url += '?refresh=true'; }
      return this.load(url)
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
                    $('#metrics-menu')
                      .find('[rel="reload"]').live('click', function() {
                        Sammy.log('reload!');
                        ctx.loadMetricsList(true);
                      }).end()
                      .find('input[type="search"]').live('keyup', function() {
                        var search = $(this).val();
                        Sammy.log('search', search);
                        var $lis = $('#metrics-list li')
                        if (search != '') {
                          $lis.hide()
                          .filter(':contains(' + search + ')')
                          .show();
                        } else {
                          $lis.show();
                        }
                      });
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
    },
    timestamp: function(time) {
      if (typeof time == 'string') {
        time = parseInt(time, 10);
      }
      return new Date(time * 1000).toString();
    },

    buildDashboardsDropdown: function(uuid) {
      this.load('/dashboards.js', {cache: false, data: {uuid: uuid}})
          .then(function(data) {
            var $select = $('select[name="dashboard"]');
            $select.html('');
            var dashboards = data.dashboards,
                i = 0,
                l = dashboards.length,
                dashboard;
            for (; i < l; i++) {
              dashboard = dashboards[i];
              $('<option />', {
                value: dashboard.slug,
                text: dashboard.title
              }).appendTo($select);
            }
          });
    },
    loadAndRenderGraphs: function(url) {
      var $graphs = $('#graphs-pane').html('').show();
      this.load(url, {cache: false})
          .then(function(data) {
            var title = 'All Graphs';
            if (data.title) {
              title = data.title;
            }
            $graphs.append('<h2>' + title + '</h2>');
            var graphs = data.graphs,
                i = 0,
                l = graphs.length,
                $graph = $('#templates .graph').clone(),
                graph, graph_obj;
            for (; i < l; i++) {
              graph = graphs[i];
              graph_obj = new Graphiti.Graph(JSON.parse(graph.json));
              this.log(graph_obj);
              $graph
              .clone()
              .find('.title').text(graph.title || 'Untitled').end()
              .find('a.edit').attr('href', '/graphs/' + graph.uuid).end()
              .show()
              .appendTo($graphs).each(function() {
                graph_obj.image($(this).find('img'));
                if ((i+1)%2 == 0) {
                  $(this).addClass('last');
                }
              });
            }
          });
    },
    loadAndRenderDashboards: function() {
      var $dashboards = $('#dashboards-pane').html('<h2>Dashboards</h2>').show();
      var ctx = this;
      this.load('/dashboards.js', {cache: false})
          .then(function(data) {
            var dashboards = data.dashboards,
            i = 0, l = dashboards.length, dashboard, alt,
            $dashboard = $('#templates .dashboard').clone();

            for (; i < l;i++) {
              dashboard = dashboards[i];
              alt = ((i+1)%2 == 0) ? 'alt' : '';
              $dashboard.clone()
                .find('a.view').attr('href', '/dashboards/' + dashboard.slug).end()
                .find('.title').text(dashboard.title).end()
                .find('.graphs-count').text(dashboard.graphs.length).end()
                .find('.updated-at').text(ctx.timestamp(dashboard.updated_at)).end()
                .addClass(alt)
                .show()
                .appendTo($dashboards);
            }

          });
    },

    bindEditorPanes: function() {
      var ctx = this;
      $('#editor-pane')
      .delegate('.edit-group .edit-head', 'click', function(e) {
        e.preventDefault();
        var $group = $(this).add($(this).siblings('.edit-body'))
        var group_name = $group.parents('.edit-group').attr('data-group');
        if ($group.is('.closed')) {
          $group.removeClass('closed').addClass('open');
          ctx.session('groups:' + group_name, true);
        } else {
          $group.addClass('closed').removeClass('open');
          ctx.session('groups:' + group_name, false);
        }
      });
    },

    toggleEditorPanesByPreference: function() {
      var ctx = this;
      $('#editor-pane .edit-group').each(function() {
        var $group = $(this), group_name = $group.attr('data-group'),
            $parts = $group.find('.edit-head, .edit-body');
        ctx.session('groups:' + group_name, function(open) {
          if (open) {
            $parts.removeClass('closed').addClass('open');
          } else {
            $parts.removeClass('open').addClass('closed');
          }
        });
      });

    }
  });

  this.before({only: {verb: 'get'}}, function() {
    $('.pane').hide();
  });

  this.get('/graphs/new', function(ctx) {
    this.session('lastPreview', function(lastPreview) {
      ctx.showEditor(lastPreview);
    });
  });

  this.get('/graphs/:uuid', function(ctx) {
    this.load('/graphs/' + this.params.uuid + '.js', {cache: false})
        .then(function(graph_data) {
          ctx.showEditor(graph_data.json, ctx.params.uuid);
        });
  });

  this.get('/graphs', function(ctx) {
    this.loadAndRenderGraphs('/graphs.js');
  });

  this.get('/dashboards/:slug', function(ctx) {
    this.loadAndRenderGraphs('/dashboards/' + this.params.slug + '.js');
  });

  this.get('/dashboards', function(ctx) {
    this.loadAndRenderDashboards();
  });

  this.get('', function(ctx) {
    this.loadAndRenderDashboards();
  });

  this.post('/graphs', function(ctx) {
    var $button = $(this.target).find('input');
    var original_val = $button.val();
    $button.val('Saving').attr('disabled', 'disabled');
    var graph = new Graphiti.Graph(this.getEditorJSON());
    graph.save(function(resp) {
      Sammy.log('created', resp);
      $button.val(original_val).removeAttr('disabled');
      if (resp.uuid) {
        ctx.redirect('/graphs/' + resp.uuid);
      }
    });
  });

  this.put('/graphs/options', function(ctx) {
    this.saveOptions(this.params.options);
  });

  this.put('/graphs/:uuid', function(ctx) {
    var $button = $(this.target).find('input');
    var original_val = $button.val();
    $button.val('Saving').attr('disabled', 'disabled');
    var graph = new Graphiti.Graph(this.getEditorJSON());
    graph.save(this.params.uuid, function(response) {
      Sammy.log('updated', response);
      ctx.redrawPreview();
      $button.val(original_val).removeAttr('disabled');
    });
  });


  this.post('/graphs/dashboards', function(ctx) {
    var $target = $(this.target);
    $.post('/graphs/dashboards', $target.serialize(), function(resp) {
      ctx.buildDashboardsDropdown(resp.uuid);
    });
  });


  this.post('/dashboards', function(ctx) {
    var $target = $(this.target);
    $.post('/dashboards', $target.serialize(), function(resp) {
      $target.find('input[type=text]').val('');
      ctx.buildDashboardsDropdown();
      ctx.trigger('toggle-dashboard-creation', {target: $target.parents('.dashboard')});
    });
  });

  this.bind('toggle-dashboard-creation', function(e, data) {
    var $parent = $(data.target);
    var $new = $parent.find('.new-dashboard');
    var $add = $parent.find('.add-to-dashboard');
    if ($new.is(':visible')) {
      $new.hide(); $add.show();
    } else {
      $new.show(); $add.hide();
    }
  });

  this.registerShortcut('redraw-preview', 'g', function() {
    this.redrawPreview();
  });

  this.bind('run', function() {
    var ctx = this;

    this.bindEditorPanes();

    $('select[name="dashboard"]').live('change', function() {
      if ($(this).val() == '') {
        $(this).siblings('.save').attr('disabled', 'disabled');
      } else {
        $(this).siblings('.save').removeAttr('disabled');
      }
    });

    $('.dashboard button[rel=create], .dashboard a[rel="cancel"]').live('click', function(e) {
      e.preventDefault();
      ctx.trigger('toggle-dashboard-creation', {target: $(this).parents('.dashboard')});
    });

    $('#graph-actions').delegate('.redraw', 'click', function(e) {
      e.preventDefault();
      ctx.redrawPreview();
    });
  });

});

$(function() {
  app.run();
});
