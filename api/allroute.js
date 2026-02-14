const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) return;
  
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = db.connections[0].readyState;
  } catch (error) {
    console.error(error);
  }
};

const BotSchema = new mongoose.Schema({
  botId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  storeName: { type: String, required: true },
  ownerUsername: { type: String, required: true },
  isBlacklisted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Bot = mongoose.models.Bot || mongoose.model('Bot', BotSchema);

router.post('/register', async (req, res) => {
  await connectToDatabase();
  const { botId, ownerId, storeName, ownerUsername } = req.body;

  try {
    const existingBot = await Bot.findOne({ botId });
    if (existingBot) {
      return res.status(200).json({ message: 'Bot already registered', data: existingBot });
    }

    const newBot = new Bot({
      botId,
      ownerId,
      storeName,
      ownerUsername
    });

    await newBot.save();
    res.status(201).json({ message: 'Bot registered successfully', data: newBot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/check/:botId', async (req, res) => {
  await connectToDatabase();
  const { botId } = req.params;

  try {
    const bot = await Bot.findOne({ botId });

    if (bot && bot.isBlacklisted) {
      return res.status(200).json({ 
        status: false, 
        message: 'Bot is blacklisted',
        data: bot
      });
    }

    return res.status(200).json({ 
      status: true, 
      message: 'Bot is valid',
      data: bot || null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/list', async (req, res) => {
  await connectToDatabase();
  try {
    const bots = await Bot.find().sort({ createdAt: -1 });
    res.status(200).json(bots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/blacklist', async (req, res) => {
  await connectToDatabase();
  const { botId, action } = req.body;

  try {
    const isBlacklisted = action === 'blacklist';
    const updatedBot = await Bot.findOneAndUpdate(
      { botId },
      { isBlacklisted },
      { new: true }
    );

    if (!updatedBot) {
      return res.status(404).json({ message: 'Bot not found' });
    }

    res.status(200).json({ 
      message: `Bot ${isBlacklisted ? 'blacklisted' : 'unblacklisted'} successfully`, 
      data: updatedBot 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;