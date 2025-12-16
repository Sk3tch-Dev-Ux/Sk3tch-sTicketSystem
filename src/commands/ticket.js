const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const { Ticket, GuildSettings, TicketCategory } = require('../models');
const { successEmbed, errorEmbed, warningEmbed } = require('../utils/embeds');
const { isSupport, canManageTicket, buildTicketPermissions, getSupportRoleIds } = require('../utils/permissions');
const { saveTranscript } = require('../utils/transcript');
const { 
    logTicketClosed, 
    logTicketClaimed, 
    logTicketUnclaimed, 
    logTicketTransferred,
    logMemberAdded,
    logMemberRemoved
} = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage tickets')
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket')
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for closing')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('claim')
                .setDescription('Claim this ticket')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unclaim')
                .setDescription('Unclaim this ticket')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('transfer')
                .setDescription('Transfer ticket to another staff member')
                .addUserOption(option =>
                    option
                        .setName('staff')
                        .setDescription('Staff member to transfer to')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a member to this ticket')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a member from this ticket')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rename')
                .setDescription('Rename this ticket channel')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('New channel name')
                        .setRequired(true)
                        .setMaxLength(100)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('transcript')
                .setDescription('Generate a transcript of this ticket')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View ticket information')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // Get ticket from current channel
        const ticket = await Ticket.findByChannel(interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({
                embeds: [errorEmbed('This command can only be used in a ticket channel.')],
                ephemeral: true
            });
        }

        const settings = await GuildSettings.getOrCreate(interaction.guild.id);
        const category = await TicketCategory.findOne({
            guildId: interaction.guild.id,
            categoryId: ticket.categoryId
        });

        const member = interaction.member;

        switch (subcommand) {
            case 'close': {
                if (!canManageTicket(member, ticket, settings, category)) {
                    return interaction.reply({
                        embeds: [errorEmbed('You do not have permission to close this ticket.')],
                        ephemeral: true
                    });
                }

                const reason = interaction.options.getString('reason') || 'No reason provided';

                await interaction.reply({
                    embeds: [warningEmbed(`Closing ticket in 5 seconds...\n**Reason:** ${reason}`)]
                });

                // Save transcript if enabled
                if (settings.transcriptsEnabled) {
                    await saveTranscript(interaction.client, ticket, interaction.user, settings);
                }

                // Update ticket
                ticket.status = 'closed';
                ticket.closedAt = new Date();
                ticket.closedBy = {
                    userId: interaction.user.id,
                    username: interaction.user.username
                };
                ticket.addHistory('closed', interaction.user.id, interaction.user.username, reason);
                await ticket.save();

                // Log the action
                const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
                await logTicketClosed(interaction.client, settings, ticket, ticketUser || { id: ticket.userId }, interaction.user, reason);

                // Delete channel after delay
                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch (e) {
                        console.error('Error deleting ticket channel:', e);
                    }
                }, 5000);

                break;
            }

            case 'claim': {
                if (!isSupport(member, settings, category)) {
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

                // Rename channel to show claimed
                try {
                    await interaction.channel.setName(`claimed-${ticket.ticketNumber}`);
                } catch (e) {
                    // Ignore rename errors
                }

                const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
                await logTicketClaimed(interaction.client, settings, ticket, ticketUser || { id: ticket.userId }, interaction.user);

                return interaction.reply({
                    embeds: [successEmbed(`${interaction.user} has claimed this ticket.`)]
                });
            }

            case 'unclaim': {
                if (!isSupport(member, settings, category)) {
                    return interaction.reply({
                        embeds: [errorEmbed('Only support staff can unclaim tickets.')],
                        ephemeral: true
                    });
                }

                if (!ticket.claimedBy || !ticket.claimedBy.userId) {
                    return interaction.reply({
                        embeds: [errorEmbed('This ticket is not claimed.')],
                        ephemeral: true
                    });
                }

                // Only the claimer or admins can unclaim
                if (ticket.claimedBy.userId !== interaction.user.id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
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
                    // Ignore rename errors
                }

                const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
                await logTicketUnclaimed(interaction.client, settings, ticket, ticketUser || { id: ticket.userId }, interaction.user);

                return interaction.reply({
                    embeds: [successEmbed('This ticket has been unclaimed and is now open for other staff.')]
                });
            }

            case 'transfer': {
                if (!isSupport(member, settings, category)) {
                    return interaction.reply({
                        embeds: [errorEmbed('Only support staff can transfer tickets.')],
                        ephemeral: true
                    });
                }

                const targetUser = interaction.options.getUser('staff');
                const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

                if (!targetMember) {
                    return interaction.reply({
                        embeds: [errorEmbed('Could not find that member.')],
                        ephemeral: true
                    });
                }

                if (!isSupport(targetMember, settings, category)) {
                    return interaction.reply({
                        embeds: [errorEmbed('You can only transfer tickets to support staff.')],
                        ephemeral: true
                    });
                }

                ticket.status = 'claimed';
                ticket.claimedBy = {
                    userId: targetUser.id,
                    username: targetUser.username,
                    claimedAt: new Date()
                };
                ticket.addHistory('transferred', interaction.user.id, interaction.user.username, `Transferred to ${targetUser.username}`);
                await ticket.save();

                const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
                await logTicketTransferred(interaction.client, settings, ticket, ticketUser || { id: ticket.userId }, interaction.user, targetUser.id);

                return interaction.reply({
                    embeds: [successEmbed(`Ticket transferred to ${targetUser}.`)]
                });
            }

            case 'add': {
                if (!canManageTicket(member, ticket, settings, category)) {
                    return interaction.reply({
                        embeds: [errorEmbed('You do not have permission to add members to this ticket.')],
                        ephemeral: true
                    });
                }

                const userToAdd = interaction.options.getUser('user');

                // Check if already added
                if (ticket.addedMembers.some(m => m.userId === userToAdd.id)) {
                    return interaction.reply({
                        embeds: [errorEmbed(`${userToAdd} is already in this ticket.`)],
                        ephemeral: true
                    });
                }

                // Add to channel permissions
                await interaction.channel.permissionOverwrites.create(userToAdd.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    AttachFiles: true,
                    EmbedLinks: true,
                    ReadMessageHistory: true
                });

                // Update ticket record
                ticket.addedMembers.push({
                    userId: userToAdd.id,
                    username: userToAdd.username,
                    addedBy: interaction.user.id,
                    addedAt: new Date()
                });
                ticket.addHistory('member_added', interaction.user.id, interaction.user.username, `Added ${userToAdd.username}`);
                await ticket.save();

                const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
                await logMemberAdded(interaction.client, settings, ticket, ticketUser || { id: ticket.userId }, interaction.user, userToAdd.id);

                return interaction.reply({
                    embeds: [successEmbed(`Added ${userToAdd} to this ticket.`)]
                });
            }

            case 'remove': {
                if (!isSupport(member, settings, category)) {
                    return interaction.reply({
                        embeds: [errorEmbed('Only support staff can remove members from tickets.')],
                        ephemeral: true
                    });
                }

                const userToRemove = interaction.options.getUser('user');

                // Can't remove ticket owner
                if (userToRemove.id === ticket.userId) {
                    return interaction.reply({
                        embeds: [errorEmbed('You cannot remove the ticket owner.')],
                        ephemeral: true
                    });
                }

                // Remove from channel permissions
                await interaction.channel.permissionOverwrites.delete(userToRemove.id).catch(() => null);

                // Update ticket record
                ticket.addedMembers = ticket.addedMembers.filter(m => m.userId !== userToRemove.id);
                ticket.addHistory('member_removed', interaction.user.id, interaction.user.username, `Removed ${userToRemove.username}`);
                await ticket.save();

                const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
                await logMemberRemoved(interaction.client, settings, ticket, ticketUser || { id: ticket.userId }, interaction.user, userToRemove.id);

                return interaction.reply({
                    embeds: [successEmbed(`Removed ${userToRemove} from this ticket.`)]
                });
            }

            case 'rename': {
                if (!isSupport(member, settings, category)) {
                    return interaction.reply({
                        embeds: [errorEmbed('Only support staff can rename tickets.')],
                        ephemeral: true
                    });
                }

                const newName = interaction.options.getString('name');

                try {
                    await interaction.channel.setName(newName);
                    return interaction.reply({
                        embeds: [successEmbed(`Ticket renamed to **${newName}**`)],
                        ephemeral: true
                    });
                } catch (e) {
                    return interaction.reply({
                        embeds: [errorEmbed('Failed to rename the channel. Please try again.')],
                        ephemeral: true
                    });
                }
            }

            case 'transcript': {
                if (!canManageTicket(member, ticket, settings, category)) {
                    return interaction.reply({
                        embeds: [errorEmbed('You do not have permission to generate transcripts.')],
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                try {
                    const transcriptMsg = await saveTranscript(interaction.client, ticket, interaction.user, settings);
                    
                    if (transcriptMsg) {
                        return interaction.editReply({
                            embeds: [successEmbed(`Transcript generated and saved to <#${settings.transcriptChannelId}>`)]
                        });
                    } else {
                        return interaction.editReply({
                            embeds: [warningEmbed('Transcript generated but no transcript channel is configured.')]
                        });
                    }
                } catch (e) {
                    return interaction.editReply({
                        embeds: [errorEmbed('Failed to generate transcript.')]
                    });
                }
            }

            case 'info': {
                const ticketUser = await interaction.client.users.fetch(ticket.userId).catch(() => null);
                const claimedBy = ticket.claimedBy?.userId 
                    ? await interaction.client.users.fetch(ticket.claimedBy.userId).catch(() => null)
                    : null;

                const fields = [
                    { name: 'Ticket Number', value: `#${ticket.ticketNumber}`, inline: true },
                    { name: 'Status', value: ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1), inline: true },
                    { name: 'Category', value: ticket.categoryName, inline: true },
                    { name: 'Created By', value: ticketUser ? `${ticketUser}` : ticket.username, inline: true },
                    { name: 'Created At', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`, inline: true },
                    { name: 'Claimed By', value: claimedBy ? `${claimedBy}` : 'Not claimed', inline: true }
                ];

                if (ticket.addedMembers.length > 0) {
                    fields.push({
                        name: 'Added Members',
                        value: ticket.addedMembers.map(m => `<@${m.userId}>`).join(', '),
                        inline: false
                    });
                }

                const embed = require('../utils/embeds').createEmbed({
                    title: `📋 Ticket Information`,
                    fields: fields,
                    footer: { text: `Channel ID: ${ticket.channelId}` }
                });

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
        }
    }
};
