const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

fs.writeFileSync('dummy.txt', 'hello pdf');

cloudinary.uploader.upload('dummy.txt', { resource_type: 'raw', public_id: 'test_raw.pdf' })
  .then(res => {
    console.log('Uploaded RAW URL:', res.secure_url);
    const https = require('https');
    https.get(res.secure_url, (resp) => {
      console.log('Status Code for RAW:', resp.statusCode);
      if (resp.statusCode === 200) console.log('RAW WORKED!');
      else console.log('RAW FAILED');
    });
  }).catch(err => console.error(err));
