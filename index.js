const createApp = require('./server');

const app = createApp();

app.get('/hello', (req, res) => {
  res.status(200).send('<h1>Hello from my server!</h1>');
});

app.get('/about', (req, res) => {
  res.status(200).json({ name: 'My HTTP Server', version: '1.0' });
});

app.listen(3000);