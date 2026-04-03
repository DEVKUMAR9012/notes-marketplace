const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://test-yt:X2JwyGa5mKSOVazL@test1.wlkd0ep.mongodb.net/notesmarketplace?retryWrites=true&w=majority')
  .then(async () => {
    const notes = await mongoose.connection.collection('notes').find().sort({ createdAt: -1 }).limit(3).toArray();
    notes.forEach(n => console.log('Title:', n.title, '| URL:', n.pdfUrl));
    process.exit(0);
  });
