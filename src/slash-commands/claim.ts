import { channelMention, SlashCommandBuilder, TextChannel, userMention } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import { POINTS_EMOJI } from "../config";
import log from "../utils/log";

const command: SlashCommand = {
    command: new SlashCommandBuilder().setName("claim").setDescription("claim your lecture rewards!"),
    execute: async (interaction) => {
        try {
            await interaction.deferReply({ ephemeral: true });
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { lectureChannelID, lectureRewards, isLectureOngoing } = settings!;
            const channel = interaction.channel as TextChannel;

            if (channel.id !== lectureChannelID) {
                throw Error(`You can only use this command in ${channelMention(lectureChannelID)}!`);
            }

            if (!isLectureOngoing) {
                throw Error(`No lecture is currently ongoing!`);
            }

            const discordid = interaction.user.id;
            const discordtag = interaction.user.tag;
            const player = await prisma.player.upsert({
                where: {
                    discordid
                },
                create: { discordid, discordtag },
                update: { discordtag }
            });
            if (player.isClaimed) {
                throw Error(`You have already claimed your ${POINTS_EMOJI} points!`);
            }

            await prisma.player.update({
                where: { discordid },
                data: { isClaimed: true, dobbyPoints: { increment: lectureRewards } }
            });

            const content = `${userMention(discordid)} claimed their \`${lectureRewards}\` ${POINTS_EMOJI} points!`;

            await interaction.editReply({ content });
            await log({
                title: "Lecture Claimed",
                content,
                color: "Grey"
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
