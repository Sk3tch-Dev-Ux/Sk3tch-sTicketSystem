const commands = require('../commands');
const { 
    handleTicketCreate, 
    handleTicketModal, 
    handleQuickClose,
    handleCloseConfirm,
    handleQuickClaim,
    handleUnclaim
} = require('../handlers/ticketHandler');
const { handleCategoryEdit, handleAddFormField } = require('../handlers/categoryHandler');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = commands.find(cmd => cmd.data.name === interaction.commandName);
                
                if (!command) {
                    console.warn(`Unknown command: ${interaction.commandName}`);
                    return;
                }

                await command.execute(interaction);
                return;
            }

            // Handle autocomplete
            if (interaction.isAutocomplete()) {
                const command = commands.find(cmd => cmd.data.name === interaction.commandName);
                
                if (command && command.autocomplete) {
                    await command.autocomplete(interaction);
                }
                return;
            }

            // Handle buttons
            if (interaction.isButton()) {
                const customId = interaction.customId;

                // Ticket creation buttons
                if (customId.startsWith('ticket_create_')) {
                    const categoryId = customId.replace('ticket_create_', '');
                    await handleTicketCreate(interaction, categoryId);
                    return;
                }

                // Quick action buttons
                switch (customId) {
                    case 'ticket_close':
                        await handleQuickClose(interaction);
                        return;
                    case 'ticket_close_confirm':
                        await handleCloseConfirm(interaction);
                        return;
                    case 'ticket_close_cancel':
                        await interaction.update({
                            embeds: [require('../utils/embeds').infoEmbed('Ticket close cancelled.')],
                            components: []
                        });
                        return;
                    case 'ticket_claim':
                        await handleQuickClaim(interaction);
                        return;
                    case 'ticket_unclaim':
                        await handleUnclaim(interaction);
                        return;
                }
            }

            // Handle modals
            if (interaction.isModalSubmit()) {
                const customId = interaction.customId;

                // Ticket form modal
                if (customId.startsWith('ticket_modal_')) {
                    const categoryId = customId.replace('ticket_modal_', '');
                    await handleTicketModal(interaction, categoryId);
                    return;
                }

                // Category edit modal
                if (customId.startsWith('edit_category_')) {
                    const categoryId = customId.replace('edit_category_', '');
                    await handleCategoryEdit(interaction, categoryId);
                    return;
                }

                // Add form field modal
                if (customId.startsWith('add_form_field_')) {
                    const categoryId = customId.replace('add_form_field_', '');
                    await handleAddFormField(interaction, categoryId);
                    return;
                }
            }

        } catch (error) {
            console.error('Interaction error:', error);

            const errorResponse = {
                embeds: [errorEmbed('An error occurred while processing your request.')],
                ephemeral: true
            };

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(errorResponse);
                } else {
                    await interaction.reply(errorResponse);
                }
            } catch (e) {
                // Ignore if we can't respond
            }
        }
    }
};
