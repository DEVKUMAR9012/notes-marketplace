const https = require('https');

const data = JSON.stringify({
  name: 'Test User',
  email: 'test1234567890@gmail.com',
  password: 'password123',
  college: 'Test College'
});

const options = {
  hostname: 'notes-marketplace-hcwy.onrender.com',
  port: 443,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);

  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();