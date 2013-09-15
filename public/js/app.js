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
      editor.renderer.setShowGutter(0);
      editor.renderer.setShowPrintMargin(0);
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
        text = Graphiti.defaultGraph;
      }
      this.setupEditor();
      var text = this.setEditorJSON(text);
      $('#editor').show();
      this.graphPreview(JSON.parse(text));
      this.buildDashboardsDropdown(uuid);
      if (uuid) { // this is an already saved graph
        $('#graph-actions form').attr('data-action', function(i, action) {
          if (action) {
            $(this).attr('action', action.replace(/:uuid/, uuid));
          }
        }).show();
        $('[name=uuid]').val(uuid);
        $('#graph-actions').find('.update, .dashboard').show();
      } else {
        // TODO: replace Clone with Save
        $('#graph-actions').find('.update, .dashboard').hide();
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
        var key_value = opts[key].toString();
        if (key_value !== '') {
          $form.find('[name="options[' + key + ']"]').val(key_value);
        }
      }
    },
    saveOptions: function(params) {
      var json = this.getEditorJSON();
      json.options = $.extend(true, json.options, params || {});
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
    loadAndRenderGraphs: function(url, slug, params, display_options) {
      var ctx = this;
      this.load(url, {cache: false})
          .then(function(data) {
            var $graphs = ctx.showPane('graphs', ' ');
            var layout = "grid";
            if (display_options && display_options.layout) {
              layout = display_options.layout;
            }
            $graphs.removeClass("layout-grid").removeClass("layout-list");
            $graphs.addClass("layout-" + layout);
            var title = 'All Graphs', all_graphs;
            if (data.title) {
              all_graphs = false;
              title = '<a href="/">Dashboards</a> <span class="breadcrumbs-devider">/</span> ' + data.title;
            } else {
              all_graphs = true;
            }
            var params_title = '';
            if (params.options) {
              var params_title_parts = [];
              if (params.options.from) {
                 params_title_parts.push("from: " + $("<div/>").text(params.options.from).html());
              }
              if (params.options.until) {
                 params_title_parts.push("until: " + $("<div/>").text(params.options.until).html());
              }
              if (params_title_parts.length > 0) {
                params_title = " (" + params_title_parts.join("; ") + ")";
              }
            }
            var intervals = [
                ["Default", ""],
                ["Minutes", "-1h"],
                ["Hours", "-1d"],
                ["Days", "-7d"],
                ["Weeks", "-1month"],
                ["Months", "-1year"]];
            var has_from = params.options && params.options.from;
            var only_from = has_from && (typeof params.options.until == "undefined");
            var intervals_html = "<div class='time-interval'><span class='time-interval-title'>Time Interval:</span> <ul>";
            for (var i = 0; i < intervals.length; i++) {
                var active_interval = only_from && params.options.from == intervals[i][1] ||
                                      !has_from && i == 0;
                intervals_html += '<li>';
                if (active_interval) {
                    intervals_html += '<span class="active-time-interval">' + intervals[i][0] + "</span>";
                } else {
                    intervals_html += '<span><a href="?layout=' + layout + (intervals[i][1] ? '&from=' + intervals[i][1] : '') + '">' + intervals[i][0] + "</a></span>";
                }
                intervals_html += '</li>';
            }
            intervals_html += "</ul></div>";
            var layouts_html = '<div class="graphs-layout"><span class="graphs-layout-title">Show as:</span> <ul>';
            var layouts = [["grid", "Grid"], ["list", "List"]];
            for (var i = 0; i < layouts.length; i++) {
                if (layouts[i][0] == layout) {
                  layouts_html += '<li><span class="active-graphs-layout">' + layouts[i][1] + '</span></li>';
                } else {
                  layouts_html += '<li><a href="?layout=' + layouts[i][0] + (params.options && params.options.from ? '&from=' + params.options.from: '') + (params.options && params.options.until ? '&until=' + params.options.until: '') + '">' + layouts[i][1] + "</a></li>";
                }
            }
            layouts_html += "</ul></div>";
            $graphs.append('<h2 class="graphs-title">' + title + params_title + '</h2>');
            $graphs.append(intervals_html);
            $graphs.append(layouts_html);
            $graphs.append("<br style='clear:both'>");
            var graphs = data.graphs;
            if (graphs.length == 0) {
              $graphs.append($('#graphs-empty'));
              return true;
            }
            var dashboard_sections = {"General": []};
            for (var i = 0; i < graphs.length; i++) {
              var graph_json = JSON.parse(graphs[i].json || '{}');
              if (graph_json.presentation && graph_json.presentation.sections && typeof graph_json.presentation.sections == "object") {
                  var sections = Object.keys(graph_json.presentation.sections),
                      sections_len = sections.length;
                  for (var j = 0; j < sections_len; j++) {
                    if (sections[j] == slug) {
                      var section_name = graph_json.presentation.sections[sections[j]];
                      dashboard_sections[section_name] = (dashboard_sections[section_name] || []);
                      dashboard_sections[section_name].push(graphs[i]);
                    }
                  }
              } else {
                dashboard_sections["General"].push(graphs[i]);
              }
            }
            Sammy.log("dashboard_sections", dashboard_sections);
            var dashboard_section_names = Object.keys(dashboard_sections).sort();
            for (var i = 0; i < dashboard_section_names.length; i++) {
              var section_graphs = dashboard_sections[dashboard_section_names[i]];
              if (!section_graphs.length) {
                continue;
              }
              $graphs.append('<h3 class="section-name">' + dashboard_section_names[i] + '</h3>');
              for (var j = 0; j < section_graphs.length; j++) {
                var graph = section_graphs[j];
                var graph_params = $.extend(true, JSON.parse(graph.json), params || {});
                var graph_obj = new Graphiti.Graph(graph_params);

                $('#templates .graph').clone()
                  .find('.title').text(graph.title || 'Untitled').end()
                  .find('a.edit').attr('href', '/graphs/' + graph.uuid).end()
                  .show()
                  .appendTo($graphs).each(function() {
                    // actually replace the graph image
                    graph_obj.image($(this).find('img'));
                    if (all_graphs) {
                      // if its all graphs, delete operates on everything
                      $(this).find('.delete').attr('action', '/graphs/' + graph.uuid);
                    } else {
                      // otherwise it just removes the graphs
                      $(this).find('.delete').attr('action', '/graphs/dashboards')
                        .find('[name=dashboard]').val(data.slug).end()
                        .find('[name=uuid]').val(graph.uuid).end()
                        .find('[type=submit]').val('Remove');
                    }
                  });
              }
            }
          });
    },
    loadAndRenderDashboards: function() {
      var ctx = this;
      this.load('/dashboards.js', {cache: false})
        .then(function(data) {
          var $dashboards = ctx.showPane('dashboards', '<h2>Dashboards</h2>');
          var dashboards = data.dashboards,
          i = 0, l = dashboards.length, dashboard, alt,
          $dashboard = $('#templates .dashboard').clone();

          if (dashboards.length == 0) {
            $dashboards.append($('#dashboards-empty'));
          } else {
            for (; i < l;i++) {
              dashboard = dashboards[i];
              $dashboard.clone()
                .find('a.view').attr('href', '/dashboards/' + dashboard.slug).end()
                .find('.title').text(dashboard.title).end()
                .find('form.delete').attr('action','/dashboards/'+dashboard.slug).end()
                .show()
                .appendTo($dashboards);
            }
          }
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
          ctx.showEditor(graph_data.json, ctx.params.uuid);
        });
  });

  this.get('/graphs', function(ctx) {
    this.loadAndRenderGraphs('/graphs.js');
  });

  this.get('/dashboards/:slug', function(ctx) {
    var options = {};
    var display_options = {};
    if (this.params.from) {
      options["from"] = this.params.from;
    }
    if (this.params.until) {
      options["until"] = this.params.until;
    }
    if (this.params.layout) {
      display_options["layout"] = this.params.layout;
    }
    this.loadAndRenderGraphs('/dashboards/' + this.params.slug + '.js', this.params.slug, {"options": options}, display_options);
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
        url: '/graphs/'+ this.params.uuid,
        success: function(resp){
          ctx.app.refresh();
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

    var disableSave = function() {
      if ($(this).val().toString() == '') {
        $(this).siblings('.save').attr('disabled', 'disabled');
      } else {
        $(this).siblings('.save').removeAttr('disabled');
      }
    };
    $('select[name="dashboard"]')
      .live('click', disableSave)
      .live('focus', disableSave)
      .live('blur', disableSave);
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
