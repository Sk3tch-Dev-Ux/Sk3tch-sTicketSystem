const { REST, Routes } = require('discord.js');
const commands = require('../commands');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);

        // Register slash commands
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            console.log('🔄 Registering slash commands...');

            const commandData = commands.map(cmd => cmd.data.toJSON());

            if (process.env.GUILD_ID) {
                // Guild-specific commands (instant update)
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
                    { body: commandData }
                );
                console.log(`✅ Registered ${commandData.length} guild commands`);
            } else {
                // Global commands (up to 1 hour to update)
                await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: commandData }
                );
                console.log(`✅ Registered ${commandData.length} global commands`);
            }
        } catch (error) {
            console.error('❌ Error registering commands:', error);
        }

        // Set activity
        client.user.setActivity('tickets | /setup', { type: 3 }); // Watching
    }
};
