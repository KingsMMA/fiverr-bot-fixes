import { PrismaClient } from "@prisma/client";
import { ActionRowBuilder, APIEmbedField, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild } from "discord.js";
import { POINTS_EMOJI } from "../config";

export function emojiStackBuilder(count: number): string {
    if (count > 0) return new Array(count).fill(POINTS_EMOJI).join("");
    else return "";
}

export default async function buildBetMessage(betID: number, prisma: PrismaClient, guild: Guild) {
    return new Promise<{ embed: EmbedBuilder; component: ActionRowBuilder<ButtonBuilder> }>(async (resolve) => {
        const bet = await prisma.bet.findUnique({ where: { id: betID }, include: { bets: true } });
        const {
            title,
            description,
            createdat,
            options,
            bets,
            amounts,
            creatorid,
            isopen,
            winningoptionsindices,
            winningoptionsamounts,
            winnerstext
        } = bet!;

        let totalPoolAmount = 0;
        let maxAmount = 0;

        const betData: { option: string; totalAmount: number; totalCount: number }[] = [];
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const validBets = bets.filter((bet) => bet.optionIndex == i);
            const totalCount = validBets.length;
            const totalAmount = validBets.reduce((acc, bet) => acc + bet.amount, 0);
            if (totalAmount > maxAmount) {
                maxAmount = totalAmount;
            }
            totalPoolAmount += totalAmount;
            betData.push({ option, totalAmount, totalCount });
        }

        const fields: APIEmbedField[] = betData.map((betData, i) => {
            const emojiCount = Math.floor((betData.totalCount / maxAmount) * 10);
            const isWinner = winningoptionsindices.includes(i);
            const winningAmount = winningoptionsamounts[winningoptionsindices.indexOf(i)];
            return {
                name: `\`[${i + 1}]\` ${betData.option} - ${betData.totalCount} bets ${
                    isWinner ? `✅ ${winningAmount.toFixed(2)} ${POINTS_EMOJI}` : ""
                }`,
                value: `\`Total Bets: ${betData.totalAmount}\` ${POINTS_EMOJI}\n${emojiStackBuilder(emojiCount)}`,
                inline: false
            };
        });

        const amountsText = amounts.map((amount) => `${amount} ${POINTS_EMOJI}`).join(" | ");

        const member = await guild.members.fetch(creatorid);

        let embedDescription = `${description}`;

        embedDescription += `\n\n**Bet Amounts:**\n${amountsText}`;
        embedDescription += `\n\n**Total Pool Amount:** ${totalPoolAmount} ${POINTS_EMOJI}`;

        if (!isopen) {
            embedDescription += `\n\n**Top Winners:**\n${winnerstext}`;
        }

        const embed = new EmbedBuilder()
            .setColor(isopen ? "Green" : "Red")
            .setTitle(title)
            .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
            .setFooter({ text: `Bet ID: #${betID}`, iconURL: guild.iconURL()! })
            .setDescription(embedDescription)
            .setTimestamp(createdat)
            .setFields(fields)
            .setThumbnail(guild.iconURL());

        const component = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`bet`).setLabel("Bet").setStyle(ButtonStyle.Success).setEmoji(POINTS_EMOJI)
        );

        return resolve({ embed, component });
    });
}
