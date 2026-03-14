const http = require('http');

const options = {
  hostname: '100.96.26.38',
  port: 4000,
  path: '/api/records/tasks?_limit=1',
  method: 'GET',
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
