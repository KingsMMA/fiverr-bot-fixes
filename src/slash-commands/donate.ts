import { channelMention, SlashCommandBuilder, TextChannel, userMention } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import { POINTS_EMOJI } from "../config";
import log from "../utils/log";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("donate")
        .setDescription("donate dobby points to a designated user!")
        .addIntegerOption((option) =>
            option.setName("amount").setDescription("the amount of dobby points").setRequired(true).setMinValue(1)
        )
        .addUserOption((option) => option.setName("user").setDescription("the designated user").setRequired(true)),
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

            const sender = await prisma.player.upsert({
                where: { discordID: interaction.user.id },
                create: { discordID: interaction.user.id, discordTag: interaction.user.tag },
                update: { discordTag: interaction.user.tag }
            });

            const amount = interaction.options.getInteger("amount", true);

            if (sender.dobbyPoints < amount) {
                throw Error(`You don't have enough dobby points to donate \`${amount}\` ${POINTS_EMOJI}!`);
            }

            const user = interaction.options.getUser("user", true);

            await prisma.player.update({
                where: { discordID: interaction.user.id },
                data: { dobbyPoints: { decrement: amount } }
            });

            await prisma.player.upsert({
                where: {
                    discordID: user.id
                },
                create: {
                    discordID: user.id,
                    discordTag: user.tag,
                    dobbyPoints: amount
                },
                update: {
                    discordTag: user.tag,
                    dobbyPoints: { increment: amount }
                }
            });

            const content = `${userMention(interaction.user.id)} donated ${amount} ${POINTS_EMOJI} to ${userMention(
                user.id
            )}!`;
            await interaction.editReply({ content });
            await log({
                title: "Dobby Points Donated",
                content,
                color: "Blue"
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
