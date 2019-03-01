const express = require('express');
// module.exports = {};
// module.exports.startServer = function(){
	var app = express();
	app.use(express.static(__dirname)); 
	app.get("*", function(request, response){ 
      console.log(request.originalUrl)
      // if(request.originalUrl.search('.html') != -1)
      //    response.sendfile(__dirname + request.originalUrl);
      // else
		   response.sendfile(__dirname + '/index.html');
	});
	app.listen(4000);
	console.log("webserver started");
// }






