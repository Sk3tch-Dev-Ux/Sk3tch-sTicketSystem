const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');
const { GuildSettings, TicketCategory, Ticket } = require('../models');
const { errorEmbed, successEmbed, ticketWelcomeEmbed } = require('../utils/embeds');
const { buildTicketPermissions, getSupportRoleIds } = require('../utils/permissions');
const { logTicketCreated } = require('../utils/logger');
const config = require('../config');

/**
 * Handle ticket creation button click
 */
async function handleTicketCreate(interaction, categoryId) {
    const settings = await GuildSettings.getOrCreate(interaction.guild.id);
    const category = await TicketCategory.findOne({
        guildId: interaction.guild.id,
        categoryId
    });

    if (!category) {
        return interaction.reply({
            embeds: [errorEmbed('This ticket category no longer exists.')],
            ephemeral: true
        });
    }

    if (!category.enabled) {
        return interaction.reply({
            embeds: [errorEmbed('This ticket category is currently disabled.')],
            ephemeral: true
        });
    }

    // Check max tickets per user
    const openTickets = await Ticket.countUserOpenTickets(interaction.guild.id, interaction.user.id);
    if (openTickets >= settings.maxTicketsPerUser) {
        return interaction.reply({
            embeds: [errorEmbed(`You already have ${openTickets} open ticket(s). Please close existing tickets before opening new ones.`)],
            ephemeral: true
        });
    }

    // If category has form fields, show modal
    if (category.formFields && category.formFields.length > 0) {
        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${categoryId}`)
            .setTitle(category.name);

        category.formFields.forEach((field, index) => {
            const textInput = new TextInputBuilder()
                .setCustomId(`field_${index}`)
                .setLabel(field.label)
                .setStyle(field.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                .setRequired(field.required)
                .setMinLength(field.minLength || 1)
                .setMaxLength(field.maxLength || 1000);

            if (field.placeholder) {
                textInput.setPlaceholder(field.placeholder);
            }

            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
        });

        return interaction.showModal(modal);
    }

    // No form fields, create ticket directly
    await createTicket(interaction, category, settings, []);
}

/**
 * Handle ticket modal submission
 */
async function handleTicketModal(interaction, categoryId) {
    const settings = await GuildSettings.getOrCreate(interaction.guild.id);
    const category = await TicketCategory.findOne({
        guildId: interaction.guild.id,
        categoryId
    });

    if (!category) {
        return interaction.reply({
            embeds: [errorEmbed('This ticket category no longer exists.')],
            ephemeral: true
        });
    }

    // Collect form responses
    const formResponses = [];
    category.formFields.forEach((field, index) => {
        const value = interaction.fields.getTextInputValue(`field_${index}`);
        formResponses.push({
            question: field.label,
            answer: value
        });
    });

    await createTicket(interaction, category, settings, formResponses);
}

/**
 * Create the actual ticket channel and database entry
 */
async function createTicket(interaction, category, settings, formResponses) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // Get next ticket number
        const ticketNumber = await settings.getNextTicketNumber();

        // Get support role IDs
        const supportRoleIds = getSupportRoleIds(settings, category);

        // Build permission overwrites
        const permissionOverwrites = buildTicketPermissions(
            interaction.guild,
            interaction.user.id,
            supportRoleIds
        );

        // Determine parent category
        const parentId = category.ticketCategoryChannelId || null;

        // Create channel
        const channel = await interaction.guild.channels.create({
            name: `ticket-${ticketNumber}`,
            type: ChannelType.GuildText,
            parent: parentId,
            permissionOverwrites
        });

        // Create ticket in database
        const ticket = await Ticket.create({
            guildId: interaction.guild.id,
            ticketNumber,
            channelId: channel.id,
            userId: interaction.user.id,
            username: interaction.user.username,
            categoryId: category.categoryId,
            categoryName: category.name,
            formResponses,
            status: 'open',
            history: [{
                action: 'created',
                userId: interaction.user.id,
                username: interaction.user.username,
                timestamp: new Date()
            }]
        });

        // Build control buttons
        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒'),
            new ButtonBuilder()
                .setCustomId('ticket_claim')
                .setLabel('Claim')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📌')
        );

        // Create welcome embed
        const welcomeEmbed = ticketWelcomeEmbed(ticket, category, interaction.user, interaction.guild);

        // Build ping content for auto-tagging
        let pingContent = `<@${interaction.user.id}>`;
        if (settings.autoTagEnabled && supportRoleIds.length > 0) {
            pingContent += ' ' + supportRoleIds.map(r => `<@&${r}>`).join(' ');
        }

        // Send welcome message
        await channel.send({
            content: pingContent,
            embeds: [welcomeEmbed],
            components: [controlRow]
        });

        // Log ticket creation
        await logTicketCreated(interaction.client, settings, ticket, interaction.user);

        // Reply to user
        await interaction.editReply({
            embeds: [successEmbed(`Your ticket has been created: ${channel}`)]
        });

    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Failed to create ticket. Please try again or contact an administrator.')]
        });
    }
}

/**
 * Handle quick close button
 */
async function handleQuickClose(interaction) {
    const ticket = await Ticket.findByChannel(interaction.channel.id);
    
    if (!ticket) {
        return interaction.reply({
            embeds: [errorEmbed('This is not a valid ticket channel.')],
            ephemeral: true
        });
    }

    const settings = await GuildSettings.getOrCreate(interaction.guild.id);
    const category = await TicketCategory.findOne({
        guildId: interaction.guild.id,
        categoryId: ticket.categoryId
    });

    const { canManageTicket } = require('../utils/permissions');
    
    if (!canManageTicket(interaction.member, ticket, settings, category)) {
        return interaction.reply({
            embeds: [errorEmbed('You do not have permission to close this ticket.')],
            ephemeral: true
        });
    }

    // Show confirmation
    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_close_confirm')
            .setLabel('Confirm Close')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('ticket_close_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        embeds: [require('../utils/embeds').warningEmbed('Are you sure you want to close this ticket?')],
        components: [confirmRow],
        ephemeral: true
    });
}

/**
 * Handle close confirmation
 */
async function handleCloseConfirm(interaction) {
    const ticket = await Ticket.findByChannel(interaction.channel.id);
    
    if (!ticket) {
        return interaction.update({
            embeds: [errorEmbed('Ticket not found.')],
            components: []
        });
    }

    const settings = await GuildSettings.getOrCreate(interaction.guild.id);

    await interaction.update({
        embeds: [require('../utils/embeds').warningEmbed('Closing ticket in 5 seconds...')],
        components: []
    });

    // Save transcript if enabled
    if (settings.transcriptsEnabled) {
        const { saveTranscript } = require('../utils/transcript');
        await saveTranscript(interaction.client, ticket, interaction.user, settings);
    }

    // Update ticket
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = {
        userId: interaction.user.id,
        username: interaction.user.username
    };
    ticket.addHistory('closed', interaction.user.id, interaction.user.username);
    await ticket.save();

    // Log
    const { logTicketClosed } = require('../utils/logger');
    const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
    await logTicketClosed(interaction.client, settings, ticket, ticketUser || { id: ticket.userId }, interaction.user);

    // Delete channel
    setTimeout(async () => {
        try {
            await interaction.channel.delete();
        } catch (e) {
            console.error('Error deleting channel:', e);
        }
    }, 5000);
}

/**
 * Handle quick claim button
 */
async function handleQuickClaim(interaction) {
    const ticket = await Ticket.findByChannel(interaction.channel.id);
    
    if (!ticket) {
        return interaction.reply({
            embeds: [errorEmbed('This is not a valid ticket channel.')],
            ephemeral: true
        });
    }

    const settings = await GuildSettings.getOrCreate(interaction.guild.id);
    const category = await TicketCategory.findOne({
        guildId: interaction.guild.id,
        categoryId: ticket.categoryId
    });

    const { isSupport } = require('../utils/permissions');
    
    if (!isSupport(interaction.member, settings, category)) {
        return interaction.reply({
            embeds: [errorEmbed('Only support staff can claim tickets.')],
            ephemeral: true
        });
    }

    if (!settings.claimEnabled) {
        return interaction.reply({
            embeds: [errorEmbed('Claim system is disabled.')],
            ephemeral: true
        });
    }

    if (ticket.claimedBy && ticket.claimedBy.userId) {
        return interaction.reply({
            embeds: [errorEmbed(`This ticket is already claimed by <@${ticket.claimedBy.userId}>`)],
            ephemeral: true
        });
    }

    ticket.status = 'claimed';
    ticket.claimedBy = {
        userId: interaction.user.id,
        username: interaction.user.username,
        claimedAt: new Date()
    };
    ticket.addHistory('claimed', interaction.user.id, interaction.user.username);
    await ticket.save();

    // Rename channel
    try {
        await interaction.channel.setName(`claimed-${ticket.ticketNumber}`);
    } catch (e) {
        // Ignore
    }

    // Update button row
    const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
        new ButtonBuilder()
            .setCustomId('ticket_unclaim')
            .setLabel('Unclaim')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📤')
    );

    // Update original message
    try {
        const messages = await interaction.channel.messages.fetch({ limit: 10 });
        const welcomeMsg = messages.find(m => m.author.id === interaction.client.user.id && m.components.length > 0);
        if (welcomeMsg) {
            await welcomeMsg.edit({ components: [newRow] });
        }
    } catch (e) {
        // Ignore
    }

    const { logTicketClaimed } = require('../utils/logger');
    const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
    await logTicketClaimed(interaction.client, settings, ticket, ticketUser || { id: ticket.userId }, interaction.user);

    await interaction.reply({
        embeds: [successEmbed(`${interaction.user} has claimed this ticket.`)]
    });
}

/**
 * Handle unclaim button
 */
async function handleUnclaim(interaction) {
    const ticket = await Ticket.findByChannel(interaction.channel.id);
    
    if (!ticket) {
        return interaction.reply({
            embeds: [errorEmbed('This is not a valid ticket channel.')],
            ephemeral: true
        });
    }

    const settings = await GuildSettings.getOrCreate(interaction.guild.id);

    if (!ticket.claimedBy || !ticket.claimedBy.userId) {
        return interaction.reply({
            embeds: [errorEmbed('This ticket is not claimed.')],
            ephemeral: true
        });
    }

    if (ticket.claimedBy.userId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            embeds: [errorEmbed('Only the staff member who claimed this ticket can unclaim it.')],
            ephemeral: true
        });
    }

    ticket.status = 'open';
    ticket.claimedBy = null;
    ticket.addHistory('unclaimed', interaction.user.id, interaction.user.username);
    await ticket.save();

    // Rename channel back
    try {
        await interaction.channel.setName(`ticket-${ticket.ticketNumber}`);
    } catch (e) {
        // Ignore
    }

    // Update button row
    const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
        new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('Claim')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📌')
    );

    // Update original message
    try {
        const messages = await interaction.channel.messages.fetch({ limit: 10 });
        const welcomeMsg = messages.find(m => m.author.id === interaction.client.user.id && m.components.length > 0);
        if (welcomeMsg) {
            await welcomeMsg.edit({ components: [newRow] });
        }
    } catch (e) {
        // Ignore
    }

    const { logTicketUnclaimed } = require('../utils/logger');
    const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
    await logTicketUnclaimed(interaction.client, settings, ticket, ticketUser || { id: ticket.userId }, interaction.user);

    await interaction.reply({
        embeds: [successEmbed('This ticket has been unclaimed.')]
    });
}

module.exports = {
    handleTicketCreate,
    handleTicketModal,
    handleQuickClose,
    handleCloseConfirm,
    handleQuickClaim,
    handleUnclaim
};
