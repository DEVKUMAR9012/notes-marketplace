const Razorpay = require('razorpay');
const crypto = require('crypto');
const Note = require('../models/Note');
const User = require('../models/User');
const Bundle = require('../models/Bundle');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// ── Create Razorpay Order ──────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { noteId, noteIds, bundleId } = req.body;
    const userId = req.user._id;

    let itemsToProcess = [];
    let title = '';
    let amount = 0;

    // Determine checkout type
    if (bundleId) {
      const bundle = await Bundle.findById(bundleId);
      if (!bundle) return res.status(404).json({ message: 'Bundle not found' });
      itemsToProcess = bundle.notes;
      amount = bundle.price;
      title = `Bundle: ${bundle.title}`;
    } else if (noteIds && Array.isArray(noteIds)) {
      const notes = await Note.find({ _id: { $in: noteIds } });
      if (!notes.length) return res.status(404).json({ message: 'Notes not found' });
      itemsToProcess = notes.map(n => n._id);
      amount = notes.reduce((sum, n) => sum + n.price, 0);
      title = `Cart Checkout (${notes.length} items)`;
    } else if (noteId) {
      const note = await Note.findById(noteId);
      if (!note) return res.status(404).json({ message: 'Note not found' });
      itemsToProcess = [note._id];
      amount = note.price;
      title = note.title;
    } else {
      return res.status(400).json({ message: 'Please provide noteId, noteIds, or bundleId' });
    }

    if (amount === 0) {
      return res.status(400).json({ message: 'Total amount is free' });
    }

    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: `r_${userId.toString().slice(-8)}_${Date.now().toString(36)}`,
      notes: {
        userId: userId.toString(),
        checkoutType: bundleId ? 'bundle' : noteIds ? 'cart' : 'single',
        entityIds: itemsToProcess.join(','),
        amount
      },
    };
    
    if (options.notes.entityIds.length > 250) {
       options.notes.entityIds = "multiple_limit_hit";
    }

    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      title,
      processedIds: itemsToProcess
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Payment initiation failed' });
  }
};

// ── Verify Payment & Unlock Note(s) ──────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, processedIds } = req.body;
    const userId = req.user._id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !processedIds || !processedIds.length) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const notes = await Note.find({ _id: { $in: processedIds } });
    if (!notes.length) return res.status(404).json({ message: 'Notes not found' });

    let pdfUrls = [];
    
    for (const note of notes) {
      if (note.purchasedBy && note.purchasedBy.some(id => id.toString() === userId.toString())) {
        pdfUrls.push(note.pdfUrl);
        continue;
      }
      
      const platformFee = Math.round(note.price * 0.1);
      const sellerEarning = note.price - platformFee;

      await Note.findByIdAndUpdate(note._id, {
        $addToSet: { purchasedBy: userId },
        $inc: { downloads: 1, totalEarnings: note.price }
      });

      await User.findByIdAndUpdate(userId, {
        $addToSet: { purchasedNotes: note._id },
        $pull: { cart: note._id, wishlist: note._id },
        $push: {
          transactions: {
            type: 'debit',
            amount: note.price,
            description: `Purchased: ${note.title}`,
            noteId: note._id,
          }
        }
      });

      await User.findByIdAndUpdate(note.uploadedBy, {
        $inc: { walletBalance: sellerEarning, totalEarnings: sellerEarning, totalSales: 1 },
        $push: {
          transactions: {
            type: 'credit',
            amount: sellerEarning,
            description: `Sale: ${note.title}`,
            noteId: note._id,
          }
        }
      });
      
      pdfUrls.push(note.pdfUrl);
    }

    res.json({ success: true, message: 'Payment verified', pdfUrls });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ message: 'Payment verification error' });
  }
};

// ── Get Purchase Status ────────────────────────────────────────────────────────
exports.getPurchaseStatus = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user._id;

    const note = await Note.findById(noteId).select('purchasedBy price pdfUrl title');
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const isPurchased = note.price === 0 || note.purchasedBy?.includes(userId);
    res.json({ isPurchased, pdfUrl: isPurchased ? note.pdfUrl : null });
  } catch (err) {
    console.error('Get purchase status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Wallet Withdraw ─────────────────────────────────────────────────────────
exports.withdrawRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, upiId } = req.body;

    if (!amount || !upiId) {
      return res.status(400).json({ message: 'amount and upiId are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (amount > user.walletBalance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    if (amount < 50) {
      return res.status(400).json({ message: 'Minimum withdrawal is ₹50' });
    }

    await User.findByIdAndUpdate(userId, {
      $inc: { walletBalance: -amount },
      $push: {
        transactions: {
          type: 'debit',
          amount,
          description: `Withdrawal to UPI: ${upiId}`,
        }
      }
    });

    res.json({ success: true, message: `₹${amount} withdrawal request submitted to ${upiId}` });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ message: 'Withdrawal failed' });
  }
};