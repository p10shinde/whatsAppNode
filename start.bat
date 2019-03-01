start cmd.exe /k "%cd%/MongoDB/server/3.2/bin/mongod.exe --config %cd%/MongoDB/server/3.2/bin/mongod.cfg"
start cmd.exe /k "node webServer.js"
start cmd.exe /k "node runner.js"