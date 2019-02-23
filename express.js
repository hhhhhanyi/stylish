var server = http.createServer(function (request, response) {
  response.writeHead(200, {"Content-Type": "text/html"});
  response.end("<h3>Node webserver running</h3>\n");
});

server.listen(80);
console.log("success!!!!!!!");
