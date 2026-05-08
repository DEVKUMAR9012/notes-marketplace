require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Deprecated options hata diye gaye hain
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to DB');

    const result = await User.updateMany(
      // Duplicate email hata di gayi hai
      { email: { $in: ['dk25042008@gmail.com'] } },
      { $set: { role: 'admin' } }
    );

    console.log(`Matched ${result.matchedCount} users and modified ${result.modifiedCount} users.`);

    // DB connection gracefully close karo exit karne se pehle
    await mongoose.connection.close();
    console.log('Connection closed gracefully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to DB:', err);
    process.exit(1);
  });