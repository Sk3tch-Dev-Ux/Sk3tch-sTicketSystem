module.exports = {
    // Default embed colors
    colors: {
        primary: 0x5865F2,    // Discord Blurple
        success: 0x57F287,    // Green
        warning: 0xFEE75C,    // Yellow
        error: 0xED4245,      // Red
        info: 0x5865F2,       // Blue
    },

    // Default emojis (can be overridden per category)
    emojis: {
        ticket: '🎫',
        open: '📬',
        closed: '📪',
        claimed: '📌',
        locked: '🔒',
        unlocked: '🔓',
        transcript: '📝',
        delete: '🗑️',
        user: '👤',
        staff: '👮',
        success: '✅',
        error: '❌',
        warning: '⚠️',
    },

    // Ticket settings defaults
    ticketDefaults: {
        maxTicketsPerUser: 3,
        autoCloseAfterHours: 48,
        transcriptEnabled: true,
        dmTranscript: true,
    },

    // Permission levels
    permissions: {
        admin: ['Administrator'],
        staff: ['ManageChannels', 'ManageMessages'],
    }
};
