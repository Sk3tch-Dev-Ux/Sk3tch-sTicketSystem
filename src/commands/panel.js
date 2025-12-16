const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { GuildSettings, TicketCategory } = require('../models');
const { successEmbed, errorEmbed, ticketPanelEmbed } = require('../utils/embeds');

const ButtonStyles = {
    'Primary': ButtonStyle.Primary,
    'Secondary': ButtonStyle.Secondary,
    'Success': ButtonStyle.Success,
    'Danger': ButtonStyle.Danger
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Manage the ticket panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Send or update the ticket panel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to send the panel to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Update the existing ticket panel')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const settings = await GuildSettings.getOrCreate(interaction.guild.id);
        const categories = await TicketCategory.getByGuild(interaction.guild.id);

        if (categories.length === 0) {
            return interaction.reply({
                embeds: [errorEmbed('No ticket categories configured. Use `/category create` first.')],
                ephemeral: true
            });
        }

        // Build buttons for each category
        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;

        for (const category of categories) {
            if (buttonCount >= 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }

            const button = new ButtonBuilder()
                .setCustomId(`ticket_create_${category.categoryId}`)
                .setLabel(category.name)
                .setStyle(ButtonStyles[category.buttonStyle] || ButtonStyle.Primary);

            // Add emoji if it's not a custom emoji ID
            if (category.emoji) {
                try {
                    button.setEmoji(category.emoji);
                } catch (e) {
                    // Skip emoji if invalid
                }
            }

            currentRow.addComponents(button);
            buttonCount++;
        }

        if (buttonCount > 0) {
            rows.push(currentRow);
        }

        // Limit to 5 rows (Discord limit)
        const actionRows = rows.slice(0, 5);

        // Create panel embed
        const embed = ticketPanelEmbed(settings, categories, interaction.guild);

        switch (subcommand) {
            case 'send': {
                const channel = interaction.options.getChannel('channel') || interaction.channel;

                // Delete old panel if exists
                if (settings.panelMessageId && settings.panelChannelId) {
                    try {
                        const oldChannel = await interaction.guild.channels.fetch(settings.panelChannelId);
                        if (oldChannel) {
                            const oldMessage = await oldChannel.messages.fetch(settings.panelMessageId);
                            if (oldMessage) {
                                await oldMessage.delete();
                            }
                        }
                    } catch (e) {
                        // Old message already deleted or not found
                    }
                }

                // Send new panel
                const message = await channel.send({
                    embeds: [embed],
                    components: actionRows
                });

                // Save panel reference
                settings.panelMessageId = message.id;
                settings.panelChannelId = channel.id;
                await settings.save();

                return interaction.reply({
                    embeds: [successEmbed(`Ticket panel sent to ${channel}`)],
                    ephemeral: true
                });
            }

            case 'update': {
                if (!settings.panelMessageId || !settings.panelChannelId) {
                    return interaction.reply({
                        embeds: [errorEmbed('No panel found. Use `/panel send` first.')],
                        ephemeral: true
                    });
                }

                try {
                    const channel = await interaction.guild.channels.fetch(settings.panelChannelId);
                    const message = await channel.messages.fetch(settings.panelMessageId);

                    await message.edit({
                        embeds: [embed],
                        components: actionRows
                    });

                    return interaction.reply({
                        embeds: [successEmbed('Ticket panel updated successfully')],
                        ephemeral: true
                    });
                } catch (e) {
                    return interaction.reply({
                        embeds: [errorEmbed('Could not find the panel message. Use `/panel send` to create a new one.')],
                        ephemeral: true
                    });
                }
            }
        }
    }
};
