import { Client, GuildTextBasedChannel, Interaction } from "discord.js";
import { BotEvent } from "../types";

const event: BotEvent = {
    name: "interactionCreate",
    execute: async (interaction: Interaction, client: Client) => {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.slashCommands.get(interaction.commandName);
            if (!command) return;

            const channel = interaction.channel as GuildTextBasedChannel;

            console.log(
                `[interactionCreate]: ${interaction.user.tag} triggered a $${command.command.name} in #${channel.name}`
            );
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: `There was an error while executing this command!`,
                    ephemeral: true
                });
            }
        } else if (interaction.isButton()) {
            const query = interaction.customId;
            const button = client.buttons.get(query);
            if (!button) return;
            const channel = interaction.channel as GuildTextBasedChannel;
            console.log(`[interactionCreate]: ${interaction.user.tag} triggered a $${button.name} in #${channel.name}`);
            try {
                await button.execute(interaction, client);
            } catch (error) {
                console.error(error);
                await interaction.followUp({
                    content: `something went wrong with this button!`,
                    ephemeral: true
                });
            }
        } else if (interaction.isAutocomplete()) {
            const command = interaction.client.slashCommands.get(interaction.commandName);
            if (!command) {
                return;
            }
            try {
                if (!command.autocomplete) return;
                command.autocomplete(interaction);
            } catch (error) {
                console.error(error);
            }
        }
    }
};

export default event;
