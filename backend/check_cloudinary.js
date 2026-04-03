const https = require('https');
https.get('https://res.cloudinary.com/dngllg6ii/image/upload/v1775238581/notes-marketplace/1775238580811-114024978.pdf', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Body:', data.substring(0, 500)));
});
