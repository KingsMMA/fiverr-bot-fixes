import { EmbedBuilder, GuildMember, SlashCommandBuilder, inlineCode } from "discord.js";
import { SlashCommand } from "../types";
import fs from "fs";
import path from "path";
import checkStaff from "../functions/checkStaff";

const command: SlashCommand = {
    command: new SlashCommandBuilder().setName("help").setDescription("view bot commands"),
    execute: async (interaction) => {
        const prisma = interaction.client.prisma;
        const settings = await prisma.setting.findFirst();
        const { teamRoleID } = settings!;
        const member = interaction.member as GuildMember;

        const isStaff = checkStaff(member, teamRoleID);

        const commandsPath = __dirname;
        const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(`.js`));

        const embed = new EmbedBuilder()
            .setTitle(`Help`)
            .setDescription(`this is a list of all of this bot's slash commands`)
            .setColor(`Random`);
        const fields = [];

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);

            const command: SlashCommand = require(filePath).default;

            const commandName = command.command.name.toString();
            const commandDescription = command.command.description.toString();

            if (isStaff || (!isStaff && !commandName.includes("mods-only")))
                fields.push({
                    name: inlineCode(`/` + commandName),
                    value: commandDescription,
                    inline: false
                });
        }
        embed.addFields(fields);
        await interaction.reply({ embeds: [embed] });
    }
};

export default command;
