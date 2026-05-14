/**
 * make-all-free.js
 * Run once: node scripts/make-all-free.js
 * Sets price=0 on ALL notes in the database.
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Note = require('../models/Note');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌  MONGO_URI not found in .env');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB');

    // Count paid notes before
    const paidBefore = await Note.countDocuments({ price: { $gt: 0 } });
    console.log(`📊  Paid notes found: ${paidBefore}`);

    if (paidBefore === 0) {
      console.log('ℹ️   All notes are already free. Nothing to update.');
      process.exit(0);
    }

    // Set price=0 on every note where price > 0
    const result = await Note.updateMany(
      { price: { $gt: 0 } },
      { $set: { price: 0 } }
    );

    console.log(`🎉  Done! ${result.modifiedCount} notes set to free (price = 0)`);

    // Verify
    const paidAfter = await Note.countDocuments({ price: { $gt: 0 } });
    console.log(`✅  Paid notes remaining: ${paidAfter}`);

  } catch (err) {
    console.error('❌  Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌  Disconnected from MongoDB');
    process.exit(0);
  }
})();
