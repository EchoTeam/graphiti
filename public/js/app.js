var app = Sammy('body', function() {
  this.use('Session');
  this.use('NestedParams');

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
    showPane: function(pane, content) {
      var selector = '#' + pane + '-pane';
      $('.pane:not(' + selector + ')').hide();
      var $pane = $(selector);
      if (content) { $pane.html(content); }
      return $pane.show();
    },
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
      this.showPane('editor');
      if (!text) {
        text = defaultGraph;
      }
      this.setupEditor();
      var text = this.setEditorJSON(text);
      $('#editor').show();
      this.graphPreview(JSON.parse(text));
      this.buildDashboardsDropdown(uuid);
      if (uuid) { // this is an already saved graph
        $('#graph-actions form').attr('action', function(i, action) {
          if (action) {
            return action.replace(/:uuid/, uuid)
          }
        }).show();
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
    buildMetricsList: function($list, metrics) {
      var $li = $list.find('li:first').clone();
      $list.html('');
      var i = 0, l = metrics.length;
      for (; i < l; i++) {
        Sammy.log(metrics[i]);
        $li.clone()
        .attr('id', "metric_list_metric_" + i)
        .find('strong').text(metrics[i])
        .end()
        .appendTo($list).show();
      }
    },
    bindMetricsList: function() {
      var ctx = this;
      var $list = $('#metrics-list ul')
      var throttle;
      $('#metrics-menu')
        .find('input[type="search"]').live('keyup', function() {
          var val = $(this).val();
          if (throttle) {
            clearTimeout(throttle);
          }
          throttle = setTimeout(function() {
            ctx.searchMetricsList(val);
          }, 200);
        });
      $list.delegate('li a', 'click', function(e) {
        e.preventDefault();
        var action = $(this).attr('rel'),
            metric = $(this).siblings('strong').text();
        Sammy.log('clicked', action, metric);
        ctx[action + "GraphMetric"](metric);
      }).addClass('.bound');
    },

    searchMetricsList: function(search) {
      var ctx = this;
      var $list = $('#metrics-list ul');
      var $loading = $('#metrics-list .loading');
      var $empty = $('#metrics-list .empty');
      var url = '/metrics.js';
      url += '?q=' + search;
      if (ctx.app.searching) return;
      if (search.length > 4) {
        ctx.app.searching = true;
        $empty.hide();
        $loading.show();
        return this.load(url).then(function(metrics) {
          var metrics = metrics.metrics;
          $loading.hide();
          if (metrics.length > 0) {
            $list.show();
            ctx.buildMetricsList($list, metrics);
          } else {
            $empty.show();
          }
          ctx.app.searching = false;
        });
      } else {
        $empty.show();
        $list.hide();
      }
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
    buildSnapshotsDropdown: function(urls, clear) {
      var $select = $('select[name="snapshot"]');
      if (clear) { $select.html(''); }
      var i = 0,
          l = urls.length, url, date;
      for (; i < l; i++) {
        url = urls[i];
        try {
          date = new Date(parseInt(url.match(/\/(\d+)\.png/)[1], 10)).toString();
        } catch (e) { }
        $('<option />', {
          value: url,
          text: date
        }).prependTo($select).attr('selected', 'selected');
      }
    },
    loadAndRenderGraphs: function(url) {
      var $graphs = this.showPane('graphs', ' ');
      this.load(url, {cache: false})
          .then(function(data) {
            var title = 'All Graphs', all_graphs;
            if (data.title) {
              all_graphs = false;
              title = data.title;
            } else {
              all_graphs = true;
            }
            $graphs.append('<h2>' + title + '</h2>');
            var graphs = data.graphs,
                i = 0,
                l = graphs.length,
                $graph = $('#templates .graph').clone(),
                graph, graph_obj;
            if (data.graphs.length == 0) {
              $graphs.append($('#graphs-empty'));
              return true;
            }
            for (; i < l; i++) {
              graph = graphs[i];
              graph_obj = new Graphiti.Graph(JSON.parse(graph.json));

              $graph
              .clone()
              .find('.title').text(graph.title || 'Untitled').end()
              .find('a.edit').attr('href', '/graphs/' + graph.uuid).end()
              .show()
              .appendTo($graphs).each(function() {
                // actually replace the graph image
                graph_obj.image($(this).find('img'));
                // add a last class alternatingly to fix the display grid
                if ((i+1)%2 == 0) {
                  $(this).addClass('last');
                }
                // if its all graphs, delete operates on everything
                if (all_graphs) {
                  $(this)
                  .find('.delete')
                  .attr('action', '/graphs/' + graph.uuid);
                // otherwise it just removes the graphs
                } else {
                  $(this)
                  .find('.delete')
                  .attr('action', '/graphs/dashboards')
                  .find('[name=dashboard]').val(data.slug).end()
                  .find('[name=uuid]').val(graph.uuid).end()
                  .find('[type=submit]').val('Remove');
                }
              });
            }
          });
    },
    loadAndRenderDashboards: function() {
      var $dashboards = this.showPane('dashboards', '<h2>Dashboards</h2>');
      var ctx = this;

      this.load('/dashboards.js', {cache: false})
          .then(function(data) {
            var dashboards = data.dashboards,
            i = 0, l = dashboards.length, dashboard, alt,
            $dashboard = $('#templates .dashboard').clone();

            if (dashboards.length == 0) {
              $dashboards.append($('#dashboards-empty'));
            } else {
              for (; i < l;i++) {
                dashboard = dashboards[i];
                alt = ((i+1)%2 == 0) ? 'alt' : '';
                $dashboard.clone()
                  .find('a.view').attr('href', '/dashboards/' + dashboard.slug).end()
                  .find('.title').text(dashboard.title).end()
                  .find('.graphs-count').text(dashboard.graphs.length).end()
                  .find('.updated-at').text(ctx.timestamp(dashboard.updated_at)).end()
                  .find('form.delete').attr('action','/dashboards/'+dashboard.slug).end()
                  .addClass(alt)
                  .show()
                  .appendTo($dashboards);
              }
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
    },

    confirmDelete: function(type) {
      var warning = "Are you sure you want to delete this " + type + "? There is no undo. You may regret this later.";
      return confirm(warning);
    },

    showSaving: function(title) {
      this.$button = $(this.target).find('input');
      this.original_button_val = this.$button.val();
      this.$button.val('Saving').attr('disabled', 'disabled');
    },

    hideSaving: function() {
      this.$button.val(this.original_button_val).removeAttr('disabled');
    }

  });

  this.before({only: {verb: 'get'}}, function() {
    this.showPane('loading');
  });

  this.get('/graphs/new', function(ctx) {
    this.session('lastPreview', Graphiti.defaultGraph, function() {
      ctx.redirect('/graphs/workspace');
    });
  });

  this.get('/graphs/workspace', function(ctx) {
    this.session('lastPreview', function(lastPreview) {
      ctx.showEditor(lastPreview);
    });
  });

  this.get('/graphs/:uuid', function(ctx) {
    this.load('/graphs/' + this.params.uuid + '.js', {cache: false})
        .then(function(graph_data) {
          ctx.buildSnapshotsDropdown(graph_data.snapshots, true);
          ctx.showEditor(graph_data.json, ctx.params.uuid);
        });
  });

  this.get('/graphs/:uuid/snapshots', function(ctx) {
    if (this.params.snapshot) {
      window.location = this.params.snapshot;
    }
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

  this.del('/dashboards/:slug', function(ctx){
    var slug = this.params.slug;
    if (this.confirmDelete('dashboard')) {
      $.ajax({
        type: 'post',
        data: '_method=DELETE',
        url: '/dashboards/'+slug,
        complete: function(resp){
          ctx.loadAndRenderDashboards();
        }
      });
    }
  });

  this.del('/graphs/dashboards', function(ctx){
    if (this.confirmDelete('graph')) {
      $.ajax({
        type: 'post',
        data: $(ctx.target).serialize() + '&_method=DELETE',
        url: '/graphs/dashboards',
        success: function(resp){
          ctx.app.refresh();
        }
      });
    }
  });

  this.del('/graphs/:uuid', function(ctx){
    if (this.confirmDelete('graph')) {
      $.ajax({
        type: 'post',
        data: '_method=DELETE',
        url: '/graphs/'+uuid,
        success: function(resp){
          ctx.refresh();
        }
      });
    }
  });

  this.get('', function(ctx) {
    this.loadAndRenderDashboards();
  });

  this.post('/graphs', function(ctx) {
    ctx.showSaving();
    var graph = new Graphiti.Graph(this.getEditorJSON());
    graph.save(function(resp) {
      ctx.hideSaving();
      Sammy.log('created', resp);
      if (resp.uuid) {
        ctx.redirect('/graphs/' + resp.uuid);
      }
    });
  });

  this.put('/graphs/options', function(ctx) {
    this.saveOptions(this.params.options);
  });

  this.post('/graphs/:uuid/snapshots', function(ctx) {
    ctx.showSaving();
    var graph = new Graphiti.Graph(this.getEditorJSON());
    graph.snapshot(this.params.uuid, function(url) {
      ctx.hideSaving();
      Sammy.log('snapshotted', url);
      if (url) {
        ctx.buildSnapshotsDropdown([url]);
      }
    });
  });

  this.put('/graphs/:uuid', function(ctx) {
    ctx.showSaving();
    var graph = new Graphiti.Graph(this.getEditorJSON());
    graph.save(this.params.uuid, function(response) {
      Sammy.log('updated', response);
      ctx.hideSaving();
      ctx.redrawPreview();
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
    this.bindMetricsList();

    $('select[name="dashboard"]').live('focus', function() {
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
