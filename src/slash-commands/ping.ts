import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";

const command: SlashCommand = {
    command: new SlashCommandBuilder().setName("ping").setDescription("replies with pong!"),
    execute: async (interaction) => {
        await interaction.deferReply();
        const reply = await interaction.fetchReply();
        const clientPing = reply.createdTimestamp - interaction.createdTimestamp;
        const websocketPing = interaction.client.ws.ping;

        await interaction.editReply({
            content: `Pong!\n**Client: **\`${clientPing}\` ms\n**Websocket: **\`${websocketPing}\` ms`
        });
    }
};

export default command;
