import { channelMention, GuildMember, SlashCommandBuilder, TextChannel } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import resetCheckins from "../functions/resetCheckins";
import checkStaff from "../functions/checkStaff";

const command: SlashCommand = {
    command: new SlashCommandBuilder().setName("reset").setDescription("manually reset daily-checkin | mods-only"),
    execute: async (interaction) => {
        try {
            await interaction.deferReply();
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { checkinChannelID, teamRoleID } = settings!;
            const channel = interaction.channel as TextChannel;
            const guild = interaction.guild!;
            const member = interaction.member as GuildMember;

            // checks if channel is valid
            if (channel.id !== checkinChannelID) {
                throw Error(`You can only use this command in ${channelMention(checkinChannelID)}!`);
            }

            const isStaff = checkStaff(member, teamRoleID);
            if (!isStaff) {
                throw Error(`You are not allowed to use this command!`);
            }

            await interaction.editReply({ content: "Resetting checkins..." });
            await resetCheckins(prisma, guild);
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
