import { ButtonInteraction, ComponentType, StringSelectMenuInteraction } from "discord.js";
import { buildBetAmountsMenu, buildBetOptionsMenu } from "./buildBetMenus";

export async function waitForBetOption(interaction: ButtonInteraction, betID: number) {
    return new Promise<number>(async (resolve) => {
        const prisma = interaction.client.prisma;
        const optionsMenu = await buildBetOptionsMenu(betID, prisma);
        const message = await interaction.editReply({ components: [optionsMenu] });

        const filter = (i: StringSelectMenuInteraction) => i.user.id == interaction.user.id;
        const collector = message.createMessageComponentCollector({
            filter,
            time: 15000,
            componentType: ComponentType.StringSelect
        });

        collector.on("collect", async (i: StringSelectMenuInteraction) => {
            await i.deferUpdate();
            const value = i.values[0];
            const optionIndex = parseInt(value);
            collector.stop();
            return resolve(optionIndex);
        });
    });
}

export async function waitForBetAmount(interaction: ButtonInteraction, betID: number) {
    return new Promise<number>(async (resolve) => {
        const prisma = interaction.client.prisma;
        const amountsMenu = await buildBetAmountsMenu(betID, prisma);
        const message = await interaction.editReply({ components: [amountsMenu] });

        const filter = (i: StringSelectMenuInteraction) => i.user.id == interaction.user.id;
        const collector = message.createMessageComponentCollector({
            filter,
            time: 15000,
            componentType: ComponentType.StringSelect
        });

        collector.on("collect", async (i: StringSelectMenuInteraction) => {
            await i.deferUpdate();
            const value = i.values[0];
            const betAmount = parseInt(value);
            collector.stop();
            return resolve(betAmount);
        });
    });
}
