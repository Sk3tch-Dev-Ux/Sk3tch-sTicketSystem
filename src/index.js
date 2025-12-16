require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const mongoose = require('mongoose');
const events = require('./events');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

// Register event handlers
for (const event of events) {
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

// Connect to MongoDB and start bot
async function start() {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri || !mongoUri.startsWith("mongodb")) {
      throw new Error(`Invalid or missing MONGO_URI: ${mongoUri}`);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    console.log("🤖 Starting Discord bot...");
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error("❌ Failed to start:", error);
    process.exit(1);
  }
}


start();

// Graceful shutdown
async function shutdown() {
    console.log('\n🛑 Shutting down...');
    
    try {
        client.destroy();
        await mongoose.connection.close();
        console.log('✅ Cleanup complete');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
