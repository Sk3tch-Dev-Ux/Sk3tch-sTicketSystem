const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    ticketNumber: {
        type: Number,
        required: true
    },
    channelId: {
        type: String,
        required: true,
        unique: true
    },
    // User who created the ticket
    userId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    // Category reference
    categoryId: {
        type: String,
        required: true
    },
    categoryName: {
        type: String,
        required: true
    },
    // Form responses
    formResponses: [{
        question: String,
        answer: String
    }],
    // Ticket status
    status: {
        type: String,
        enum: ['open', 'claimed', 'closed'],
        default: 'open'
    },
    // Claimed by staff member
    claimedBy: {
        userId: String,
        username: String,
        claimedAt: Date
    },
    // Added members (beyond the creator and support roles)
    addedMembers: [{
        userId: String,
        username: String,
        addedBy: String,
        addedAt: Date
    }],
    // Ticket history/logs
    history: [{
        action: {
            type: String,
            enum: ['created', 'claimed', 'unclaimed', 'closed', 'reopened', 'transferred', 'member_added', 'member_removed']
        },
        userId: String,
        username: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: String
    }],
    // Transcript URL (if saved)
    transcriptUrl: {
        type: String,
        default: null
    },
    transcriptMessageId: {
        type: String,
        default: null
    },
    // Timestamps
    closedAt: {
        type: Date,
        default: null
    },
    closedBy: {
        userId: String,
        username: String
    }
}, {
    timestamps: true
});

// Compound index
ticketSchema.index({ guildId: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ guildId: 1, userId: 1, status: 1 });
ticketSchema.index({ channelId: 1 });

// Find ticket by channel
ticketSchema.statics.findByChannel = async function(channelId) {
    return this.findOne({ channelId });
};

// Count open tickets for user in guild
ticketSchema.statics.countUserOpenTickets = async function(guildId, userId) {
    return this.countDocuments({ 
        guildId, 
        userId, 
        status: { $ne: 'closed' } 
    });
};

// Add history entry
ticketSchema.methods.addHistory = function(action, userId, username, details = null) {
    this.history.push({
        action,
        userId,
        username,
        details,
        timestamp: new Date()
    });
};

module.exports = mongoose.model('Ticket', ticketSchema);
