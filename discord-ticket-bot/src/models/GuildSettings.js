const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    // Ticket system settings
    ticketCounter: {
        type: Number,
        default: 0
    },
    maxTicketsPerUser: {
        type: Number,
        default: 3
    },
    // Channel configurations
    logChannelId: {
        type: String,
        default: null
    },
    transcriptChannelId: {
        type: String,
        default: null
    },
    // Role configurations
    adminRoles: [{
        type: String
    }],
    supportRoles: [{
        type: String
    }],
    // Panel message reference
    panelMessageId: {
        type: String,
        default: null
    },
    panelChannelId: {
        type: String,
        default: null
    },
    // Customization
    embedColor: {
        type: String,
        default: '#5865F2'
    },
    serverName: {
        type: String,
        default: 'Support'
    },
    // Feature toggles
    transcriptsEnabled: {
        type: Boolean,
        default: true
    },
    dmTranscriptsEnabled: {
        type: Boolean,
        default: true
    },
    autoTagEnabled: {
        type: Boolean,
        default: true
    },
    claimEnabled: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Get or create guild settings
guildSettingsSchema.statics.getOrCreate = async function(guildId) {
    let settings = await this.findOne({ guildId });
    if (!settings) {
        settings = await this.create({ guildId });
    }
    return settings;
};

// Increment ticket counter and return new number
guildSettingsSchema.methods.getNextTicketNumber = async function() {
    this.ticketCounter += 1;
    await this.save();
    return this.ticketCounter;
};

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
