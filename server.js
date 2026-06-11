const net = require('net');

function logRequest(method,path,statusCode,ms){
  const colors = {
    GET:    '\x1b[32m',  // green
    POST:   '\x1b[34m',  // blue
    PUT:    '\x1b[33m',  // yellow
    DELETE: '\x1b[31m',  // red
  };
  const reset = '\x1b[0m';
  const methodColor = colors[method] || '\x1b[37m';
  const statusColor = statusCode < 400 ? '\x1b[32m' : '\x1b[31m'; // green or red
  
  const methodPad = method.padEnd(7);
  const pathPad = path.padEnd(20);

  console.log(
    `${methodColor}${methodPad}${reset} ${pathPad} ${statusColor}${statusCode}${reset}  ${ms}ms`
  );
}

function createApp(){
    const routes = [];
    //register a route
    function addRoute(method,path,handler){
        routes.push({method,path,handler});
    }
    //find route for incoming request
    function match(method,path){
        for(const route of routes){
            if(route.method == method && route.path == path){
                return route.handler;
            }
        }
        return null; //no match found
    }
    function listen(port){
      // Start the server
      const server = net.createServer((socket) => {
        socket.on('data', (data) => {
          const req = parseRequest(data);
          const startTime = Date.now();

          //wrap socket.end to log after every response
          const originalEnd = socket.end.bind(socket);
          socket.end = (...args) => {
            logRequest(req.method, req.path, res._status, Date.now()-startTime);
            return originalEnd(...args);
          }

          
          const res = {
            _status: 200,
            _statusText: 'OK',
            _headers: {},

            status(code){
              const statusTexts = {
                200: 'OK', 201: 'Created', 400: 'Bad Request', 
                403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error'
              };
              this._status = code;
              this._statusText = statusTexts[code]|| 'Unknown';
              return this;
            },

            set(key,value){
              this._headers[key] = value;
              return this;
            },

            send(body){
              socket.end(buildResponse(this._status, this._statusText,
              {'Content-Type': 'text/html', ...this._headers }, body));   
            },
            json(data) {
              const body = JSON.stringify(data);
              socket.end(buildResponse(this._status, this._statusText,
                {'Content-Type': 'application/json', ...this._headers }, body));
            }  
          };

          const handler = match(req.method, req.path);
          if (handler) {
            handler(req, res);
          } else {
            serveStatic('./public', req,res, socket);
          }
        });
      });
      server.listen(port,()=> console.log(`Server running on http://localhost:${port}`));
    }
    return{
        get: (path,handler) => addRoute('GET',path,handler),
        post:   (path, handler) => addRoute('POST', path, handler),
        put:    (path, handler) => addRoute('PUT', path, handler),
        delete: (path, handler) => addRoute('DELETE', path, handler),
        listen
    };

}
//parse raw request text 
function parseRequest(rawData){
    const text = rawData.toString();

    const[headerSection, body] = text.split('\r\n\r\n');
    const lines = headerSection.split('\r\n');

    const [method,fullPath] = lines[0].split(' ');
    //split path from query string
    const[path,queryString] = fullPath.split('?');
    const query = {};
    if (queryString){
        queryString.split('&').forEach(param => {
            const [key,value] = param.split('=');
            query[decodeURIComponent(key)] = decodeURIComponent(value|| '');

        });
    }

    //parse headers
    const headers = {};
    for (let i =0; i< lines.length; i++){
        const colonIndex = lines[i].indexOf(':');
        if (colonIndex > 0){
            const key = lines[i].slice(0,colonIndex).toLowerCase();
            const value = lines[i].slice(colonIndex+1).trim();
            headers[key] = value
        }
    }
    return {method, path, query, headers, body}

}
//build responsw string to send back
function buildResponse(statusCode, statusText,headers, body){
    let response = `HTTP/1.1 ${statusCode} ${statusText}\r\n`;
    if (body) {
    headers['Content-Length'] = Buffer.byteLength(body);
    }

    for (const [key, value] of Object.entries(headers)) {
    response += `${key}: ${value}\r\n`;
    }

    response += '\r\n';
    if (body) response += body;

    return response;  
}

const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
};

function serveStatic(staticDir, req, res, socket) {
  const filePath = path.join(staticDir, req.path);

  // Security
  if (!path.resolve(filePath).startsWith(path.resolve(staticDir))) {
    res.status(403).send('Access denied');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(404).send('File not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    socket.end(buildResponse(200, 'OK', { 'Content-Type': contentType }, data));
  });
}
module.exports = createApp;




