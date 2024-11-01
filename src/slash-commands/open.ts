import { channelMention, EmbedBuilder, GuildMember, SlashCommandBuilder, TextChannel, userMention } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import { POINTS_EMOJI } from "../config";
import log from "../utils/log";
import checkStaff from "../functions/checkStaff";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("open")
        .setDescription("open a lecture | mods-only")
        .addStringOption((option) => option.setName("title").setDescription("the message title").setRequired(true))
        .addStringOption((option) =>
            option.setName("description").setDescription("the message description").setRequired(true)
        ),
    execute: async (interaction) => {
        try {
            await interaction.deferReply();
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { lectureChannelID, teamRoleID, isLectureOngoing } = settings!;
            const channel = interaction.channel as TextChannel;
            const member = interaction.member as GuildMember;

            if (channel.id !== lectureChannelID) {
                throw Error(`You can only use this command in ${channelMention(lectureChannelID)}!`);
            }

            const isStaff = checkStaff(member, teamRoleID);
            if (!isStaff) {
                throw Error(`You are not allowed to use this command!`);
            }

            if (isLectureOngoing) {
                throw Error(`Lecture is currently ongoing! Please \`/close\` the lecture first!`);
            }

            await prisma.setting.update({ where: { id: 1 }, data: { isLectureOngoing: true } });
            await prisma.player.updateMany({ data: { isClaimed: false } });

            const title = interaction.options.getString("title", true);
            const description = interaction.options.getString("description", true);
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor("Random")
                .setTimestamp();
            await interaction.editReply({
                embeds: [embed],
                content: `-# Do not forget to \`/claim\` your ${POINTS_EMOJI} points!`
            });
            await log({
                title: "Lecture Opened",
                content: `${userMention(
                    interaction.user.id
                )} opened a lecture!\nTitle: ${title}\nDescription: ${description}`,
                color: "Green"
            });

            const REMINDER_MSG = `Don't forget to claim your ${POINTS_EMOJI} during the lecture, to do that simply type in \`/claim\` in ${channelMention(
                lectureChannelID
            )}`;

            setTimeout(
                async () => {
                    const settings = await prisma.setting.findFirst();
                    if (settings!.isLectureOngoing)
                        await interaction.followUp({
                            content: REMINDER_MSG
                        });
                },
                30 * 60 * 1000
            );
            setTimeout(
                async () => {
                    const settings = await prisma.setting.findFirst();
                    if (settings!.isLectureOngoing)
                        await interaction.followUp({
                            content: REMINDER_MSG
                        });
                },
                60 * 60 * 1000
            );
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
