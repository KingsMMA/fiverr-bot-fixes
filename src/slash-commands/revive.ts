import { channelMention, SlashCommandBuilder, TextChannel, userMention } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import { POINTS_EMOJI } from "../config";
import log from "../utils/log";

const POINTS_PER_DAY = 50;

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("revive")
        .setDescription("revive your lost check-in streak at 50% (costs 50 points per day)"),
    execute: async (interaction) => {
        try {
            await interaction.deferReply();
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { commandsChannelID } = settings!;
            const channel = interaction.channel as TextChannel;

            if (channel.id !== commandsChannelID) {
                throw Error(`You can only use this command in ${channelMention(commandsChannelID)}!`);
            }

            const discordID = interaction.user.id;
            const discordTag = interaction.user.tag;

            const player = await prisma.player.findUnique({
                where: { discordID }
            });

            if (!player) {
                throw Error("You don't have any streak history to revive!");
            }

            if (player.checkinStreak > 0) {
                throw Error("You can only revive a lost streak (current streak must be 0)!");
            }

            const previousStreak = player.previousStreak || 0;
            if (previousStreak === 0) {
                throw Error("You don't have any previous streak to revive!");
            }

            const revivedStreak = Math.floor(previousStreak / 2);
            const reviveCost = revivedStreak * POINTS_PER_DAY;

            if (player.dobbyPoints < reviveCost) {
                throw Error(
                    `You need ${reviveCost} ${POINTS_EMOJI} to revive ${revivedStreak} days of your ${previousStreak}-day streak!`
                );
            }

            await prisma.player.update({
                where: { discordID },
                data: {
                    checkinStreak: revivedStreak,
                    dobbyPoints: { decrement: reviveCost },
                    previousStreak: 0
                }
            });

            const content = `${userMention(
                discordID
            )} spent ${reviveCost} ${POINTS_EMOJI} to revive their streak from 0 to ${revivedStreak} days!`;
            await interaction.editReply({ content });
            await log({
                title: "Streak Revived",
                content,
                color: "Purple"
            });
        } catch (err: unknown) {
            const error = err as string;
            await interaction.editReply({ content: `${error}` }).catch(console.error);
            await delay(5000);
            await interaction.deleteReply().catch(console.error);
            return;
        }
    }
};

export default command;
