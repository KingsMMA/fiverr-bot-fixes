import { PrismaClient } from "@prisma/client";
import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { POINTS_EMOJI } from "../config";

export async function buildBetOptionsMenu(betID: number, prisma: PrismaClient) {
    return new Promise<ActionRowBuilder<StringSelectMenuBuilder>>(async (resolve) => {
        const bet = await prisma.bet.findUnique({ where: { id: betID } });
        const { options } = bet!;
        const selectOptions = options.map((v, i) => {
            return new StringSelectMenuOptionBuilder()
                .setLabel(`[${i + 1}] ${v}`)
                .setValue(`${i}`)
                .setEmoji(POINTS_EMOJI);
        });
        const select = new StringSelectMenuBuilder()
            .setCustomId("selectoption")
            .setPlaceholder("Select an option!")
            .addOptions(...selectOptions);

        const component = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        resolve(component);
    });
}

export async function buildBetAmountsMenu(betID: number, prisma: PrismaClient) {
    return new Promise<ActionRowBuilder<StringSelectMenuBuilder>>(async (resolve) => {
        const bet = await prisma.bet.findUnique({ where: { id: betID } });
        const { amounts } = bet!;
        const selectOptions = amounts.map((v) => {
            return new StringSelectMenuOptionBuilder().setLabel(`${v}`).setValue(`${v}`).setEmoji(POINTS_EMOJI);
        });
        const select = new StringSelectMenuBuilder()
            .setCustomId("selectoption")
            .setPlaceholder("Select a bet amount!")
            .addOptions(...selectOptions);

        const component = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        resolve(component);
    });
}
