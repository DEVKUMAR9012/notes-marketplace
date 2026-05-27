const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://test-yt:X2JwyGa5mKSOVazL@test1.wlkd0ep.mongodb.net/notesmarketplace?retryWrites=true&w=majority';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB successfully!');
    
    const colleges = await mongoose.connection.db.collection('notes').distinct('college');
    console.log('Unique college names in DB:', colleges);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
