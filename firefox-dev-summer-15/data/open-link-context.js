self.on("click", function(node, data) {
    self.postMessage({
        url : node.getAttribute("href"),
        ctx : data,
        base : window.location.href
    });
    console.log("clicked");
});
