const { ticketLogEmbed } = require('./embeds');

/**
 * Log a ticket action to the configured log channel
 */
async function logTicketAction(client, settings, action, ticket, user, moderator = null, details = {}) {
    try {
        // Skip if no log channel configured
        if (!settings.logChannelId) {
            return null;
        }

        const guild = await client.guilds.fetch(ticket.guildId);
        const logChannel = await guild.channels.fetch(settings.logChannelId).catch(() => null);

        if (!logChannel) {
            console.log(`Log channel ${settings.logChannelId} not found`);
            return null;
        }

        const embed = ticketLogEmbed(action, ticket, user, moderator, details);
        
        const message = await logChannel.send({ embeds: [embed] });
        return message;
    } catch (error) {
        console.error('Error logging ticket action:', error);
        return null;
    }
}

/**
 * Log ticket creation
 */
async function logTicketCreated(client, settings, ticket, user) {
    return logTicketAction(client, settings, 'created', ticket, user);
}

/**
 * Log ticket closed
 */
async function logTicketClosed(client, settings, ticket, user, closedBy, reason = null) {
    return logTicketAction(client, settings, 'closed', ticket, user, closedBy, { reason });
}

/**
 * Log ticket claimed
 */
async function logTicketClaimed(client, settings, ticket, user, claimedBy) {
    return logTicketAction(client, settings, 'claimed', ticket, user, claimedBy);
}

/**
 * Log ticket unclaimed
 */
async function logTicketUnclaimed(client, settings, ticket, user, unclaimedBy) {
    return logTicketAction(client, settings, 'unclaimed', ticket, user, unclaimedBy);
}

/**
 * Log ticket transferred
 */
async function logTicketTransferred(client, settings, ticket, user, transferredBy, transferredTo) {
    return logTicketAction(client, settings, 'transferred', ticket, user, transferredBy, { transferredTo });
}

/**
 * Log member added to ticket
 */
async function logMemberAdded(client, settings, ticket, user, addedBy, member) {
    return logTicketAction(client, settings, 'member_added', ticket, user, addedBy, { member });
}

/**
 * Log member removed from ticket
 */
async function logMemberRemoved(client, settings, ticket, user, removedBy, member) {
    return logTicketAction(client, settings, 'member_removed', ticket, user, removedBy, { member });
}

module.exports = {
    logTicketAction,
    logTicketCreated,
    logTicketClosed,
    logTicketClaimed,
    logTicketUnclaimed,
    logTicketTransferred,
    logMemberAdded,
    logMemberRemoved
};
