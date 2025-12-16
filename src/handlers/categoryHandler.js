const { TicketCategory } = require('../models');
const { successEmbed, errorEmbed } = require('../utils/embeds');

/**
 * Handle category edit modal submission
 */
async function handleCategoryEdit(interaction, categoryId) {
    const category = await TicketCategory.findOne({
        guildId: interaction.guild.id,
        categoryId
    });

    if (!category) {
        return interaction.reply({
            embeds: [errorEmbed('Category not found.')],
            ephemeral: true
        });
    }

    const name = interaction.fields.getTextInputValue('name');
    const description = interaction.fields.getTextInputValue('description');
    const emoji = interaction.fields.getTextInputValue('emoji') || category.emoji;

    category.name = name;
    category.description = description;
    category.emoji = emoji;
    await category.save();

    return interaction.reply({
        embeds: [successEmbed(`Updated category **${emoji} ${name}**\n\nUse \`/panel update\` to refresh the ticket panel.`)],
        ephemeral: true
    });
}

/**
 * Handle add form field modal submission
 */
async function handleAddFormField(interaction, categoryId) {
    const category = await TicketCategory.findOne({
        guildId: interaction.guild.id,
        categoryId
    });

    if (!category) {
        return interaction.reply({
            embeds: [errorEmbed('Category not found.')],
            ephemeral: true
        });
    }

    if (category.formFields.length >= 5) {
        return interaction.reply({
            embeds: [errorEmbed('Maximum 5 form fields allowed.')],
            ephemeral: true
        });
    }

    const label = interaction.fields.getTextInputValue('label');
    const placeholder = interaction.fields.getTextInputValue('placeholder') || '';
    const styleInput = interaction.fields.getTextInputValue('style').toLowerCase();
    const requiredInput = interaction.fields.getTextInputValue('required').toLowerCase();

    const style = styleInput === 'paragraph' ? 'paragraph' : 'short';
    const required = requiredInput === 'yes' || requiredInput === 'true';

    category.formFields.push({
        label,
        placeholder,
        style,
        required,
        minLength: 1,
        maxLength: style === 'paragraph' ? 1000 : 100
    });

    await category.save();

    return interaction.reply({
        embeds: [successEmbed(`Added form field **${label}** to **${category.name}**\n\nTotal fields: ${category.formFields.length}/5`)],
        ephemeral: true
    });
}

module.exports = {
    handleCategoryEdit,
    handleAddFormField
};
