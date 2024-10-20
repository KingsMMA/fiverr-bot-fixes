import { AttachmentBuilder, GuildMember, SlashCommandBuilder, userMention } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import checkStaff from "../functions/checkStaff";
import fs from "fs";
import path from "path";

const command: SlashCommand = {
    command: new SlashCommandBuilder().setName("export").setDescription("export all player data as .csv | mods-only"),
    execute: async (interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { teamRoleID } = settings!;

            const member = interaction.member as GuildMember;

            const isStaff = checkStaff(member, teamRoleID);
            if (!isStaff) {
                throw Error(`You are not allowed to use this command!`);
            }

            const players = await prisma.player.findMany();
            const filePath = path.join(__dirname, "../../players.csv");
            const csvWriter = fs.createWriteStream(filePath);
            const headerRow = ["discordID", "discordTag", "dobbyPoints", "checkinStreak", "createdAt", "updatedAt"];
            csvWriter.write(headerRow.join(",") + "\n");
            players.forEach((player) => {
                const row = [
                    player.discordID,
                    player.discordTag,
                    player.dobbyPoints.toString(),
                    player.checkinStreak.toString(),
                    player.createdAt.toISOString(),
                    player.updatedAt.toISOString()
                ];
                csvWriter.write(row.join(",") + "\n");
            });
            csvWriter.end();
            const file = new AttachmentBuilder(filePath);
            const content = `${userMention(interaction.user.id)}, here is the data for ${players.length} players!`;
            await interaction.editReply({ content, files: [file] });
        } catch (err: unknown) {
            const error = err as string;
            await interaction
                .editReply({
                    content: `${error}`
                })
                .catch(console.error);

            await delay(5000);
            await interaction.deleteReply().catch(console.error);
            return;
        }
    }
};

export default command;
