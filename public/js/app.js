$(function() {
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
         var options = JSON.parse(editor.getSession().getValue());
         // get width/height from img
         Sammy.log(options);
         var $img = $("#graph-preview img");
         options.options = $.extend(true, {}, $img.dimensions(), options.options);
         Sammy.log(options);
         var graph = new Graphiti.Graph(options);
         var url = graph.buildURL();
         Sammy.log(url);
         $img.attr('src', url);
       }
     });
});
