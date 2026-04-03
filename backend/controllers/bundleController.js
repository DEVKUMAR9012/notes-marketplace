const Bundle = require('../models/Bundle');
const Note = require('../models/Note');

// ── Get All Bundles ─────────────────────────────────────────────────────────────
exports.getBundles = async (req, res) => {
  try {
    const bundles = await Bundle.find()
      .populate('creator', 'name profileImage')
      .populate('notes', 'title price subject');
    res.json(bundles);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// ── Create Bundle ─────────────────────────────────────────────────────────────
exports.createBundle = async (req, res) => {
  try {
    const { title, description, price, noteIds } = req.body;
    
    // Ensure all notes exist and belong to the creator
    const notes = await Note.find({ _id: { $in: noteIds }, uploadedBy: req.user._id });
    if (notes.length !== noteIds.length) {
      return res.status(400).json({ message: 'Some notes are invalid or do not belong to you' });
    }
    
    const originalPrice = notes.reduce((acc, note) => acc + note.price, 0);
    if (Number(price) > originalPrice) {
      return res.status(400).json({ message: `Bundle price (₹${price}) cannot exceed total individual price (₹${originalPrice})` });
    }

    const bundle = await Bundle.create({
      title,
      description,
      price: Number(price),
      notes: noteIds,
      creator: req.user._id
    });
    
    res.status(201).json(bundle);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// ── Get Single Bundle ─────────────────────────────────────────────────────────────
exports.getBundle = async (req, res) => {
  try {
    const bundle = await Bundle.findById(req.params.id)
      .populate('creator', 'name profileImage')
      .populate('notes', 'title price subject pdfUrl');
      
    if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
    res.json(bundle);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
