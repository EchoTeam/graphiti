$(function() {
    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/textmate");
    var JavaScriptMode = require("ace/mode/javascript").Mode;
    var session = editor.getSession();
    session.setMode(new JavaScriptMode());
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
         var addToGraph = eval(editor.getSession().getValue());
         var graph = new Graphiti.Graph(addToGraph);
         var url = graph.buildURL();
         Sammy.log(url);
         $("#graph-preview img").attr('src', url);
       }
     });
});
