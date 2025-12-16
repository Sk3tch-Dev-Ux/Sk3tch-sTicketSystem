const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
        maxlength: 45
    },
    placeholder: {
        type: String,
        maxlength: 100
    },
    style: {
        type: String,
        enum: ['short', 'paragraph'],
        default: 'short'
    },
    required: {
        type: Boolean,
        default: true
    },
    minLength: {
        type: Number,
        default: 1
    },
    maxLength: {
        type: Number,
        default: 1000
    }
});

const ticketCategorySchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    categoryId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500,
        default: 'Open a ticket in this category'
    },
    emoji: {
        type: String,
        default: '🎫'
    },
    // Button style: Primary, Secondary, Success, Danger
    buttonStyle: {
        type: String,
        enum: ['Primary', 'Secondary', 'Success', 'Danger'],
        default: 'Primary'
    },
    // Discord category channel for tickets
    ticketCategoryChannelId: {
        type: String,
        default: null
    },
    // Roles that can see/manage tickets in this category
    supportRoles: [{
        type: String
    }],
    // Modal form fields (up to 5 per Discord limits)
    formFields: {
        type: [formFieldSchema],
        validate: [arrayLimit, 'Form fields cannot exceed 5']
    },
    // Welcome message for new tickets
    welcomeMessage: {
        type: String,
        default: 'Thank you for creating a ticket! Our team will be with you shortly.'
    },
    // Auto-add specific users to tickets
    autoAddUsers: [{
        type: String
    }],
    // Is this category enabled
    enabled: {
        type: Boolean,
        default: true
    },
    // Order in panel
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

function arrayLimit(val) {
    return val.length <= 5;
}

// Compound index for unique category per guild
ticketCategorySchema.index({ guildId: 1, categoryId: 1 }, { unique: true });

// Get all categories for a guild
ticketCategorySchema.statics.getByGuild = async function(guildId) {
    return this.find({ guildId, enabled: true }).sort({ order: 1 });
};

module.exports = mongoose.model('TicketCategory', ticketCategorySchema);
