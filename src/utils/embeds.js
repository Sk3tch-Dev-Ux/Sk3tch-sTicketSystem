const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Create a standard embed with consistent styling
 */
function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.color || config.colors.primary)
        .setTimestamp();

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.footer) embed.setFooter(options.footer);
    if (options.author) embed.setAuthor(options.author);
    if (options.fields) embed.addFields(options.fields);
    if (options.url) embed.setURL(options.url);

    return embed;
}

/**
 * Success embed
 */
function successEmbed(description, title = null) {
    return createEmbed({
        color: config.colors.success,
        title: title ? `${config.emojis.success} ${title}` : null,
        description: `${config.emojis.success} ${description}`
    });
}

/**
 * Error embed
 */
function errorEmbed(description, title = null) {
    return createEmbed({
        color: config.colors.error,
        title: title ? `${config.emojis.error} ${title}` : null,
        description: `${config.emojis.error} ${description}`
    });
}

/**
 * Warning embed
 */
function warningEmbed(description, title = null) {
    return createEmbed({
        color: config.colors.warning,
        title: title ? `${config.emojis.warning} ${title}` : null,
        description: `${config.emojis.warning} ${description}`
    });
}

/**
 * Info embed
 */
function infoEmbed(description, title = null) {
    return createEmbed({
        color: config.colors.info,
        title: title,
        description: description
    });
}

/**
 * Create ticket panel embed
 */
function ticketPanelEmbed(guildSettings, categories, guild) {
    const categoryList = categories.map(cat => 
        `${cat.emoji} **${cat.name}**\n${cat.description}`
    ).join('\n\n');

    return createEmbed({
        color: parseInt(guildSettings.embedColor.replace('#', ''), 16),
        title: `${guildSettings.serverName} Ticket Center`,
        description: `Welcome to our support system!\nPlease select a category below to open a ticket.\n\n${categoryList}`,
        thumbnail: guild.iconURL({ dynamic: true }),
        footer: { text: `${guild.name} • Ticket System` }
    });
}

/**
 * Create ticket welcome embed
 */
function ticketWelcomeEmbed(ticket, category, user, guild) {
    const fields = [
        { name: '👤 Opened By', value: `<@${user.id}>`, inline: true },
        { name: '📁 Category', value: category.name, inline: true },
        { name: '🔢 Ticket Number', value: `#${ticket.ticketNumber}`, inline: true }
    ];

    // Add form responses if any
    if (ticket.formResponses && ticket.formResponses.length > 0) {
        ticket.formResponses.forEach(response => {
            fields.push({
                name: response.question,
                value: response.answer || 'No response',
                inline: false
            });
        });
    }

    return createEmbed({
        color: config.colors.primary,
        title: `${config.emojis.ticket} Ticket #${ticket.ticketNumber}`,
        description: category.welcomeMessage,
        fields: fields,
        thumbnail: user.displayAvatarURL({ dynamic: true }),
        footer: { text: `${guild.name} • Support Ticket` }
    });
}

/**
 * Create ticket log embed
 */
function ticketLogEmbed(action, ticket, user, moderator = null, details = {}) {
    const actionColors = {
        'created': config.colors.success,
        'closed': config.colors.error,
        'claimed': config.colors.info,
        'unclaimed': config.colors.warning,
        'reopened': config.colors.success,
        'transferred': config.colors.info,
        'member_added': config.colors.success,
        'member_removed': config.colors.warning
    };

    const actionTitles = {
        'created': '🎫 Ticket Created',
        'closed': '📪 Ticket Closed',
        'claimed': '📌 Ticket Claimed',
        'unclaimed': '📤 Ticket Unclaimed',
        'reopened': '📬 Ticket Reopened',
        'transferred': '🔄 Ticket Transferred',
        'member_added': '➕ Member Added',
        'member_removed': '➖ Member Removed'
    };

    const fields = [
        { name: 'Ticket', value: `#${ticket.ticketNumber}`, inline: true },
        { name: 'Category', value: ticket.categoryName, inline: true },
        { name: 'User', value: `<@${user.id}>`, inline: true }
    ];

    if (moderator) {
        fields.push({ name: 'Staff Member', value: `<@${moderator.id}>`, inline: true });
    }

    if (details.reason) {
        fields.push({ name: 'Reason', value: details.reason, inline: false });
    }

    if (details.transferredTo) {
        fields.push({ name: 'Transferred To', value: `<@${details.transferredTo}>`, inline: true });
    }

    if (details.member) {
        fields.push({ name: 'Member', value: `<@${details.member}>`, inline: true });
    }

    return createEmbed({
        color: actionColors[action] || config.colors.primary,
        title: actionTitles[action] || `Ticket Action: ${action}`,
        fields: fields,
        footer: { text: `Ticket ID: ${ticket.channelId}` }
    });
}

/**
 * Create transcript embed
 */
function transcriptEmbed(ticket, user, closedBy, transcriptAttachment) {
    return createEmbed({
        color: config.colors.info,
        title: `📝 Ticket Transcript - #${ticket.ticketNumber}`,
        description: `Transcript for ticket in **${ticket.categoryName}**`,
        fields: [
            { name: 'Opened By', value: `<@${user.id}> (${ticket.username})`, inline: true },
            { name: 'Closed By', value: `<@${closedBy.id}>`, inline: true },
            { name: 'Category', value: ticket.categoryName, inline: true },
            { name: 'Created', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`, inline: true },
            { name: 'Closed', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: 'Messages', value: 'See attached file', inline: true }
        ],
        footer: { text: `Ticket #${ticket.ticketNumber}` }
    });
}

module.exports = {
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed,
    ticketPanelEmbed,
    ticketWelcomeEmbed,
    ticketLogEmbed,
    transcriptEmbed
};
