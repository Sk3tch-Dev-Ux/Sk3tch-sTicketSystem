const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const { TicketCategory } = require('../models');
const { successEmbed, errorEmbed, infoEmbed, createEmbed } = require('../utils/embeds');
const { randomUUID } = require('crypto');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('category')
        .setDescription('Manage ticket categories')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new ticket category')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Category name')
                        .setRequired(true)
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Category description')
                        .setRequired(true)
                        .setMaxLength(500)
                )
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('Emoji for the button')
                        .setRequired(false)
                )
                .addChannelOption(option =>
                    option
                        .setName('ticket-category')
                        .setDescription('Discord category for tickets')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('button-style')
                        .setDescription('Button color style')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Blue (Primary)', value: 'Primary' },
                            { name: 'Grey (Secondary)', value: 'Secondary' },
                            { name: 'Green (Success)', value: 'Success' },
                            { name: 'Red (Danger)', value: 'Danger' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a ticket category')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Category to delete')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a ticket category')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Category to edit')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all ticket categories')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-role')
                .setDescription('Add a support role to a category')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Category to modify')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-role')
                .setDescription('Remove a support role from a category')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Category to modify')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-form-field')
                .setDescription('Add a form field to a category')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Category to modify')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear-form')
                .setDescription('Clear all form fields from a category')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Category to modify')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('welcome-message')
                .setDescription('Set welcome message for a category')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Category to modify')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Welcome message')
                        .setRequired(true)
                        .setMaxLength(1000)
                )
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const categories = await TicketCategory.find({ 
            guildId: interaction.guild.id 
        });

        const filtered = categories
            .filter(cat => cat.name.toLowerCase().includes(focusedValue.toLowerCase()))
            .slice(0, 25);

        await interaction.respond(
            filtered.map(cat => ({ name: cat.name, value: cat.categoryId }))
        );
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create': {
                const name = interaction.options.getString('name');
                const description = interaction.options.getString('description');
                const emoji = interaction.options.getString('emoji') || '🎫';
                const ticketCategoryChannel = interaction.options.getChannel('ticket-category');
                const buttonStyle = interaction.options.getString('button-style') || 'Primary';

                // Generate unique category ID
                const categoryId = randomUUID().slice(0, 8);

                // Count existing categories for order
                const existingCount = await TicketCategory.countDocuments({ 
                    guildId: interaction.guild.id 
                });

                const category = await TicketCategory.create({
                    guildId: interaction.guild.id,
                    categoryId,
                    name,
                    description,
                    emoji,
                    buttonStyle,
                    ticketCategoryChannelId: ticketCategoryChannel?.id || null,
                    order: existingCount
                });

                return interaction.reply({
                    embeds: [successEmbed(`Created category **${emoji} ${name}**\n\nUse \`/panel send\` to update your ticket panel.`)],
                    ephemeral: true
                });
            }

            case 'delete': {
                const categoryId = interaction.options.getString('category');
                const category = await TicketCategory.findOne({
                    guildId: interaction.guild.id,
                    categoryId
                });

                if (!category) {
                    return interaction.reply({
                        embeds: [errorEmbed('Category not found')],
                        ephemeral: true
                    });
                }

                await TicketCategory.deleteOne({ _id: category._id });

                return interaction.reply({
                    embeds: [successEmbed(`Deleted category **${category.emoji} ${category.name}**`)],
                    ephemeral: true
                });
            }

            case 'edit': {
                const categoryId = interaction.options.getString('category');
                const category = await TicketCategory.findOne({
                    guildId: interaction.guild.id,
                    categoryId
                });

                if (!category) {
                    return interaction.reply({
                        embeds: [errorEmbed('Category not found')],
                        ephemeral: true
                    });
                }

                // Create modal for editing
                const modal = new ModalBuilder()
                    .setCustomId(`edit_category_${categoryId}`)
                    .setTitle(`Edit ${category.name}`);

                const nameInput = new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('Category Name')
                    .setStyle(TextInputStyle.Short)
                    .setValue(category.name)
                    .setMaxLength(100)
                    .setRequired(true);

                const descInput = new TextInputBuilder()
                    .setCustomId('description')
                    .setLabel('Description')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(category.description)
                    .setMaxLength(500)
                    .setRequired(true);

                const emojiInput = new TextInputBuilder()
                    .setCustomId('emoji')
                    .setLabel('Emoji')
                    .setStyle(TextInputStyle.Short)
                    .setValue(category.emoji)
                    .setMaxLength(50)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(nameInput),
                    new ActionRowBuilder().addComponents(descInput),
                    new ActionRowBuilder().addComponents(emojiInput)
                );

                return interaction.showModal(modal);
            }

            case 'list': {
                const categories = await TicketCategory.find({ 
                    guildId: interaction.guild.id 
                }).sort({ order: 1 });

                if (categories.length === 0) {
                    return interaction.reply({
                        embeds: [infoEmbed('No ticket categories configured. Use `/category create` to add one.')],
                        ephemeral: true
                    });
                }

                const categoryList = categories.map((cat, index) => {
                    const roles = cat.supportRoles.length > 0 
                        ? cat.supportRoles.map(r => `<@&${r}>`).join(', ')
                        : 'Global roles';
                    const fields = cat.formFields.length > 0 
                        ? `${cat.formFields.length} field(s)`
                        : 'No form';
                    const channel = cat.ticketCategoryChannelId 
                        ? `<#${cat.ticketCategoryChannelId}>`
                        : 'Default';

                    return `**${index + 1}. ${cat.emoji} ${cat.name}**\n` +
                           `> ${cat.description}\n` +
                           `> Roles: ${roles}\n` +
                           `> Form: ${fields} | Channel: ${channel}\n` +
                           `> Status: ${cat.enabled ? '✅ Enabled' : '❌ Disabled'}`;
                }).join('\n\n');

                const embed = createEmbed({
                    title: '📋 Ticket Categories',
                    description: categoryList,
                    footer: { text: `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} configured` }
                });

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            case 'add-role': {
                const categoryId = interaction.options.getString('category');
                const role = interaction.options.getRole('role');

                const category = await TicketCategory.findOne({
                    guildId: interaction.guild.id,
                    categoryId
                });

                if (!category) {
                    return interaction.reply({
                        embeds: [errorEmbed('Category not found')],
                        ephemeral: true
                    });
                }

                if (category.supportRoles.includes(role.id)) {
                    return interaction.reply({
                        embeds: [errorEmbed(`${role} is already a support role for this category`)],
                        ephemeral: true
                    });
                }

                category.supportRoles.push(role.id);
                await category.save();

                return interaction.reply({
                    embeds: [successEmbed(`Added ${role} to **${category.name}**`)],
                    ephemeral: true
                });
            }

            case 'remove-role': {
                const categoryId = interaction.options.getString('category');
                const role = interaction.options.getRole('role');

                const category = await TicketCategory.findOne({
                    guildId: interaction.guild.id,
                    categoryId
                });

                if (!category) {
                    return interaction.reply({
                        embeds: [errorEmbed('Category not found')],
                        ephemeral: true
                    });
                }

                const index = category.supportRoles.indexOf(role.id);
                if (index === -1) {
                    return interaction.reply({
                        embeds: [errorEmbed(`${role} is not a support role for this category`)],
                        ephemeral: true
                    });
                }

                category.supportRoles.splice(index, 1);
                await category.save();

                return interaction.reply({
                    embeds: [successEmbed(`Removed ${role} from **${category.name}**`)],
                    ephemeral: true
                });
            }

            case 'add-form-field': {
                const categoryId = interaction.options.getString('category');
                const category = await TicketCategory.findOne({
                    guildId: interaction.guild.id,
                    categoryId
                });

                if (!category) {
                    return interaction.reply({
                        embeds: [errorEmbed('Category not found')],
                        ephemeral: true
                    });
                }

                if (category.formFields.length >= 5) {
                    return interaction.reply({
                        embeds: [errorEmbed('Maximum 5 form fields allowed per category (Discord limit)')],
                        ephemeral: true
                    });
                }

                // Create modal for adding form field
                const modal = new ModalBuilder()
                    .setCustomId(`add_form_field_${categoryId}`)
                    .setTitle('Add Form Field');

                const labelInput = new TextInputBuilder()
                    .setCustomId('label')
                    .setLabel('Field Label (Question)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., What is your in-game name?')
                    .setMaxLength(45)
                    .setRequired(true);

                const placeholderInput = new TextInputBuilder()
                    .setCustomId('placeholder')
                    .setLabel('Placeholder Text')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., Enter your username...')
                    .setMaxLength(100)
                    .setRequired(false);

                const styleInput = new TextInputBuilder()
                    .setCustomId('style')
                    .setLabel('Field Style (short or paragraph)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('short')
                    .setValue('short')
                    .setMaxLength(10)
                    .setRequired(true);

                const requiredInput = new TextInputBuilder()
                    .setCustomId('required')
                    .setLabel('Required? (yes or no)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('yes')
                    .setValue('yes')
                    .setMaxLength(3)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(labelInput),
                    new ActionRowBuilder().addComponents(placeholderInput),
                    new ActionRowBuilder().addComponents(styleInput),
                    new ActionRowBuilder().addComponents(requiredInput)
                );

                return interaction.showModal(modal);
            }

            case 'clear-form': {
                const categoryId = interaction.options.getString('category');
                const category = await TicketCategory.findOne({
                    guildId: interaction.guild.id,
                    categoryId
                });

                if (!category) {
                    return interaction.reply({
                        embeds: [errorEmbed('Category not found')],
                        ephemeral: true
                    });
                }

                category.formFields = [];
                await category.save();

                return interaction.reply({
                    embeds: [successEmbed(`Cleared all form fields from **${category.name}**`)],
                    ephemeral: true
                });
            }

            case 'welcome-message': {
                const categoryId = interaction.options.getString('category');
                const message = interaction.options.getString('message');

                const category = await TicketCategory.findOne({
                    guildId: interaction.guild.id,
                    categoryId
                });

                if (!category) {
                    return interaction.reply({
                        embeds: [errorEmbed('Category not found')],
                        ephemeral: true
                    });
                }

                category.welcomeMessage = message;
                await category.save();

                return interaction.reply({
                    embeds: [successEmbed(`Updated welcome message for **${category.name}**`)],
                    ephemeral: true
                });
            }
        }
    }
};
