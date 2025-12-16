const discordTranscripts = require('discord-html-transcripts');
const { AttachmentBuilder } = require('discord.js');
const { transcriptEmbed } = require('./embeds');

/**
 * Generate HTML transcript for a ticket channel
 */
async function generateTranscript(channel, ticket) {
    try {
        const transcript = await discordTranscripts.createTranscript(channel, {
            limit: -1, // No message limit
            returnType: 'attachment',
            filename: `transcript-${ticket.ticketNumber}.html`,
            saveImages: true,
            footerText: `Exported {number} message{s}`,
            poweredBy: false,
            hydrate: true
        });

        return transcript;
    } catch (error) {
        console.error('Error generating transcript:', error);
        throw error;
    }
}

/**
 * Save transcript to a channel and optionally DM the user
 */
async function saveTranscript(client, ticket, closedBy, settings) {
    try {
        const guild = await client.guilds.fetch(ticket.guildId);
        const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
        
        if (!channel) {
            console.log('Channel not found for transcript');
            return null;
        }

        // Generate transcript
        const transcript = await generateTranscript(channel, ticket);

        // Get user who created the ticket
        const user = await client.users.fetch(ticket.userId).catch(() => null);

        // Create embed for transcript
        const embed = transcriptEmbed(ticket, user || { id: ticket.userId }, closedBy, transcript);

        let transcriptMessage = null;

        // Send to transcript channel if configured
        if (settings.transcriptChannelId) {
            const transcriptChannel = await guild.channels.fetch(settings.transcriptChannelId).catch(() => null);
            if (transcriptChannel) {
                transcriptMessage = await transcriptChannel.send({
                    embeds: [embed],
                    files: [transcript]
                });
            }
        }

        // DM transcript to user if enabled
        if (settings.dmTranscriptsEnabled && user) {
            try {
                await user.send({
                    content: `Here is the transcript for your ticket #${ticket.ticketNumber} in **${guild.name}**:`,
                    files: [transcript]
                });
            } catch (dmError) {
                console.log(`Could not DM transcript to user ${ticket.userId}`);
            }
        }

        return transcriptMessage;
    } catch (error) {
        console.error('Error saving transcript:', error);
        return null;
    }
}

module.exports = {
    generateTranscript,
    saveTranscript
};
