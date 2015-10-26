var cur_id = -1;

self.port.on("ask", function(name, id){
    cur_id = id;
    $("#ask-area").text("Are you sure you want to delete "+name);
});

$(function(){
    $("#yes").click(function(event){
        self.port.emit("yes", cur_id);
    });
    $("#no").click(function(event){
        self.port.emit("no");
    });
});
