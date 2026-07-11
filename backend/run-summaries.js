require('dotenv').config();
const mongoose = require('mongoose');
const Note = require('./models/Note');
const { generateAISummary } = require('./utils/aiSummary');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://test-yt:X2JwyGa5mKSOVazL@test1.wlkd0ep.mongodb.net/notesmarketplace?retryWrites=true&w=majority';

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Find all notes missing an AI summary
    const notes = await Note.find({
      $or: [
        { aiSummary: '' },
        { aiSummary: null },
        { aiSummary: { $exists: false } }
      ]
    });

    console.log(`Found ${notes.length} notes missing AI summary.`);

    let done = 0;
    for (const note of notes) {
      try {
        done++;
        console.log(`[${done}/${notes.length}] Generating summary for: "${note.title}" (ID: ${note._id})`);
        
        // Pass pdfUrl, title, subject, itemType
        const summary = await generateAISummary(note.pdfUrl, note.title, note.subject, note.itemType || 'note');
        
        if (summary) {
          note.aiSummary = summary;
          await note.save();
          console.log(`✅ Success: "${summary.slice(0, 70)}..."`);
        } else {
          console.log(`⚠️ Summary returned null or empty.`);
        }

        // Wait a tiny bit between calls to avoid API issues
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`❌ Failed for "${note.title}":`, err.message);
      }
    }

    console.log('🎉 Done processing all notes!');
    process.exit(0);
  } catch (err) {
    console.error('Critical Error:', err);
    process.exit(1);
  }
}

run();
