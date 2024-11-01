import { userMention } from "discord.js";
import { POINTS_EMOJI } from "../config";
import { waitForBetAmount, waitForBetOption } from "../functions/buildBetCollectors";
import buildBetMessage from "../functions/buildBetMessage";

import { Button } from "../types";
import log from "../utils/log";
const button: Button = {
    name: `bet`,
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true, fetchReply: true });
        const prisma = interaction.client.prisma;

        const bet = await prisma.bet.findUnique({ where: { messageID: interaction.message.id } });
        if (!bet) {
            await interaction.editReply({ content: `Invalid message!` });
            return;
        }

        const { options } = bet;

        const optionIndex = await waitForBetOption(interaction, bet.id);
        const amount = await waitForBetAmount(interaction, bet.id);

        const betID = bet.id;
        const discordID = interaction.user.id;
        const discordTag = interaction.user.tag;
        const playerID = interaction.user.id;
        const betID_playerID = { betID, playerID };
        const player = await prisma.player.upsert({
            where: { discordID },
            create: { discordID, discordTag },
            update: { discordTag }
        });
        const playerBet = await prisma.playerBet.findUnique({ where: { betID_playerID } });

        if (playerBet) {
            await prisma.player.update({
                where: { discordID },
                data: { dobbyPoints: { increment: playerBet.amount } }
            });

            await prisma.playerBet.delete({ where: { betID_playerID } });

            await log({
                title: "Bet Refunded",
                content: `Refunded ${amount} ${POINTS_EMOJI} to ${userMention(playerID)} for ${
                    options[playerBet.optionIndex]
                } bet in bet #${betID} at ${bet.messageUrl}`,
                color: "Red"
            });

            const { embed } = await buildBetMessage(betID, prisma, interaction.guild!);
            await interaction.message.edit({ embeds: [embed] });
        }

        if (player.dobbyPoints < amount) {
            await interaction.editReply({
                content: `You don't have enough points to bet ${amount} ${POINTS_EMOJI}!`,
                components: []
            });
            return;
        }

        await prisma.player.update({ where: { discordID }, data: { dobbyPoints: { decrement: amount } } });

        await prisma.playerBet.create({ data: { betID, amount, optionIndex, playerID } });

        const { embed } = await buildBetMessage(betID, prisma, interaction.guild!);
        await interaction.message.edit({ embeds: [embed] });

        const content = `${userMention(playerID)} placed ${amount} ${POINTS_EMOJI} for ${
            options[optionIndex]
        } bet in bet #${betID} at ${bet.messageUrl}`;
        await interaction.editReply({ content, components: [] });
        await log({
            title: "Bet Placed",
            content,
            color: "Green"
        });
    }
};

export default button;
