var app = Sammy('body', function() {
  this.use('Session');

  this.helpers({
    setupEditor: function() {
      if (this.editorSetup) return;

      var ctx = this;
      var editor = ace.edit("editor");
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
           sender: "editor"
         },
         exec: function() {
           try {
             var options = JSON.parse(editor.getSession().getValue());
             ctx.graphPreview(options);
            } catch(e) {
              alert(e);
            }
         }
      });
      this.editorSetup = true;
    },
    showEditor: function(text) {
      $('#editor-pane').show();
      if (!text) {
        text = {
            "targets": [
              "stats.timers.production.rails.controller.total.mean"
            ]
          };
      }
      if (typeof text != 'string') {
        text = JSON.stringify(text, null, 2);
      }
      $('#editor').text(text).show();
      this.setupEditor();
      this.graphPreview(JSON.parse(text));
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
    }
  });

  this.get('/graphs/new', function(ctx) {
    this.session('lastPreview', function(lastPreview) {
      ctx.showEditor(lastPreview);
    });
  });

  this.bind('run', function() {
    var ctx = this;
  });
});

$(function() {
  app.run();
});
