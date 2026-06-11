An HTTP server framework built on Node.js's net module. Lets you handle POST, GET, PUT, and DELETE requests and serve static files. Additionally, I also added a built in color coded request logger, with time per request.

## Usage
```javascript 
const createApp = require('./server');

const app = createApp();

app.get('/hello', (req, res) => {
  res.status(200).send('<h1>Hello!</h1>');
});

app.listen(3000);

```