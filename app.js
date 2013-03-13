#!/usr/bin/env node

var DA = require("./index"),
    http = require("http");

var app = DA();

app.use(DA.addJson());

app.get("/", function(req, res, next) {
  res.json({hello: "there"});
});

app.get("/:name/:greeting", function(req, res, next) {
  res.json({hello: req.routeParameter("name"), });
});

var server = http.createServer(app);

server.listen(3000, function() {
  console.log("Listening...");
});
