const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { GuildSettings } = require('../models');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure the ticket system for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('logs')
                .setDescription('Set the ticket log channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel for ticket logs')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('transcripts')
                .setDescription('Set the transcript channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel for ticket transcripts')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('support-role')
                .setDescription('Add or remove a support role')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The support role')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Add or remove the role')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('admin-role')
                .setDescription('Add or remove an admin role')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The admin role')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Add or remove the role')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('color')
                .setDescription('Set the embed color')
                .addStringOption(option =>
                    option
                        .setName('hex')
                        .setDescription('Hex color code (e.g., #5865F2)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('name')
                .setDescription('Set the server name for ticket embeds')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('The name to display')
                        .setRequired(true)
                        .setMaxLength(100)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle features on/off')
                .addStringOption(option =>
                    option
                        .setName('feature')
                        .setDescription('The feature to toggle')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Transcripts', value: 'transcripts' },
                            { name: 'DM Transcripts', value: 'dm_transcripts' },
                            { name: 'Auto Tag Support', value: 'auto_tag' },
                            { name: 'Claim System', value: 'claim' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current settings')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const settings = await GuildSettings.getOrCreate(interaction.guild.id);

        switch (subcommand) {
            case 'logs': {
                const channel = interaction.options.getChannel('channel');
                settings.logChannelId = channel.id;
                await settings.save();
                return interaction.reply({
                    embeds: [successEmbed(`Log channel set to ${channel}`)],
                    ephemeral: true
                });
            }

            case 'transcripts': {
                const channel = interaction.options.getChannel('channel');
                settings.transcriptChannelId = channel.id;
                await settings.save();
                return interaction.reply({
                    embeds: [successEmbed(`Transcript channel set to ${channel}`)],
                    ephemeral: true
                });
            }

            case 'support-role': {
                const role = interaction.options.getRole('role');
                const action = interaction.options.getString('action');

                if (action === 'add') {
                    if (!settings.supportRoles.includes(role.id)) {
                        settings.supportRoles.push(role.id);
                        await settings.save();
                        return interaction.reply({
                            embeds: [successEmbed(`Added ${role} as a support role`)],
                            ephemeral: true
                        });
                    } else {
                        return interaction.reply({
                            embeds: [errorEmbed(`${role} is already a support role`)],
                            ephemeral: true
                        });
                    }
                } else {
                    const index = settings.supportRoles.indexOf(role.id);
                    if (index > -1) {
                        settings.supportRoles.splice(index, 1);
                        await settings.save();
                        return interaction.reply({
                            embeds: [successEmbed(`Removed ${role} from support roles`)],
                            ephemeral: true
                        });
                    } else {
                        return interaction.reply({
                            embeds: [errorEmbed(`${role} is not a support role`)],
                            ephemeral: true
                        });
                    }
                }
            }

            case 'admin-role': {
                const role = interaction.options.getRole('role');
                const action = interaction.options.getString('action');

                if (action === 'add') {
                    if (!settings.adminRoles.includes(role.id)) {
                        settings.adminRoles.push(role.id);
                        await settings.save();
                        return interaction.reply({
                            embeds: [successEmbed(`Added ${role} as an admin role`)],
                            ephemeral: true
                        });
                    } else {
                        return interaction.reply({
                            embeds: [errorEmbed(`${role} is already an admin role`)],
                            ephemeral: true
                        });
                    }
                } else {
                    const index = settings.adminRoles.indexOf(role.id);
                    if (index > -1) {
                        settings.adminRoles.splice(index, 1);
                        await settings.save();
                        return interaction.reply({
                            embeds: [successEmbed(`Removed ${role} from admin roles`)],
                            ephemeral: true
                        });
                    } else {
                        return interaction.reply({
                            embeds: [errorEmbed(`${role} is not an admin role`)],
                            ephemeral: true
                        });
                    }
                }
            }

            case 'color': {
                const hex = interaction.options.getString('hex');
                const hexRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

                if (!hexRegex.test(hex)) {
                    return interaction.reply({
                        embeds: [errorEmbed('Invalid hex color. Use format: #5865F2')],
                        ephemeral: true
                    });
                }

                settings.embedColor = hex.startsWith('#') ? hex : `#${hex}`;
                await settings.save();
                return interaction.reply({
                    embeds: [successEmbed(`Embed color set to ${settings.embedColor}`)],
                    ephemeral: true
                });
            }

            case 'name': {
                const name = interaction.options.getString('name');
                settings.serverName = name;
                await settings.save();
                return interaction.reply({
                    embeds: [successEmbed(`Server name set to "${name}"`)],
                    ephemeral: true
                });
            }

            case 'toggle': {
                const feature = interaction.options.getString('feature');
                let featureName, currentValue;

                switch (feature) {
                    case 'transcripts':
                        settings.transcriptsEnabled = !settings.transcriptsEnabled;
                        featureName = 'Transcripts';
                        currentValue = settings.transcriptsEnabled;
                        break;
                    case 'dm_transcripts':
                        settings.dmTranscriptsEnabled = !settings.dmTranscriptsEnabled;
                        featureName = 'DM Transcripts';
                        currentValue = settings.dmTranscriptsEnabled;
                        break;
                    case 'auto_tag':
                        settings.autoTagEnabled = !settings.autoTagEnabled;
                        featureName = 'Auto Tag Support';
                        currentValue = settings.autoTagEnabled;
                        break;
                    case 'claim':
                        settings.claimEnabled = !settings.claimEnabled;
                        featureName = 'Claim System';
                        currentValue = settings.claimEnabled;
                        break;
                }

                await settings.save();
                return interaction.reply({
                    embeds: [successEmbed(`${featureName} is now ${currentValue ? '**enabled**' : '**disabled**'}`)],
                    ephemeral: true
                });
            }

            case 'view': {
                const logChannel = settings.logChannelId ? `<#${settings.logChannelId}>` : 'Not set';
                const transcriptChannel = settings.transcriptChannelId ? `<#${settings.transcriptChannelId}>` : 'Not set';
                const supportRoles = settings.supportRoles.length > 0 
                    ? settings.supportRoles.map(r => `<@&${r}>`).join(', ') 
                    : 'None';
                const adminRoles = settings.adminRoles.length > 0 
                    ? settings.adminRoles.map(r => `<@&${r}>`).join(', ') 
                    : 'None';

                const embed = infoEmbed(null, '⚙️ Ticket System Settings')
                    .addFields(
                        { name: 'Server Name', value: settings.serverName, inline: true },
                        { name: 'Embed Color', value: settings.embedColor, inline: true },
                        { name: 'Ticket Counter', value: `#${settings.ticketCounter}`, inline: true },
                        { name: 'Log Channel', value: logChannel, inline: true },
                        { name: 'Transcript Channel', value: transcriptChannel, inline: true },
                        { name: '\u200b', value: '\u200b', inline: true },
                        { name: 'Support Roles', value: supportRoles, inline: false },
                        { name: 'Admin Roles', value: adminRoles, inline: false },
                        { name: 'Features', value: [
                            `Transcripts: ${settings.transcriptsEnabled ? '✅' : '❌'}`,
                            `DM Transcripts: ${settings.dmTranscriptsEnabled ? '✅' : '❌'}`,
                            `Auto Tag: ${settings.autoTagEnabled ? '✅' : '❌'}`,
                            `Claim System: ${settings.claimEnabled ? '✅' : '❌'}`
                        ].join('\n'), inline: false }
                    );

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
        }
    }
};
