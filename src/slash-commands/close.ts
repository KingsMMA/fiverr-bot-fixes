import {
    channelMention,
    EmbedBuilder,
    GuildMember,
    roleMention,
    SlashCommandBuilder,
    TextChannel,
    userMention
} from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import { POINTS_EMOJI } from "../config";
import log from "../utils/log";
import checkStaff from "../functions/checkStaff";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("close")
        .setDescription("close the lecture | mods-only")
        .addStringOption((option) =>
            option.setName("description").setDescription("the message description").setRequired(true)
        ),
    execute: async (interaction) => {
        try {
            await interaction.deferReply();
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { lectureChannelID, teamRoleID, moderatorRoleID, isLectureOngoing } = settings!;
            const channel = interaction.channel as TextChannel;
            const member = interaction.member as GuildMember;

            // checks if channel is valid
            if (channel.id !== lectureChannelID) {
                throw Error(`You can only use this command in ${channelMention(lectureChannelID)}!`);
            }

            const isStaff = checkStaff(member, teamRoleID);
            if (!isStaff) {
                throw Error(`You are not allowed to use this command!`);
            }

            // checks if lecture is currently open
            if (!isLectureOngoing) {
                throw Error(`No lecture is currently ongoing! Please \`/open\` one lecture first!`);
            }

            await prisma.setting.update({ where: { id: 1 }, data: { isLectureOngoing: false } });
            await prisma.player.updateMany({ data: { isClaimed: false } });

            const description = interaction.options.getString("description", true);
            const embed = new EmbedBuilder().setDescription(description).setColor("Random").setTimestamp();
            await interaction.editReply({
                embeds: [embed],
                content: `-# If you forgot to \`/claim\` your ${POINTS_EMOJI} points, please reach out to ${roleMention(
                    moderatorRoleID
                )}!`
            });
            await log({
                title: "Lecture Closed",
                content: `${userMention(interaction.user.id)} closed a lecture!\nDescription: ${description}`,
                color: "Red"
            });
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
