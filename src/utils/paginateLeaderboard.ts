import { ComponentType, CommandInteraction, EmbedBuilder } from "discord.js";
import { ENABLED_PAGINATION_ROW, FIRSTPAGE_ROW, LASTPAGE_ROW } from "../components/buttons";

export default async function paginateLeaderboard(interaction: CommandInteraction, embeds: EmbedBuilder[]) {
    return new Promise<void>(async (resolve) => {
        let currentIndex = 0;
        const components = [];

        if (embeds.length > 1) {
            if (currentIndex == 0) {
                components.push(FIRSTPAGE_ROW);
            } else if (currentIndex == embeds.length - 1) {
                components.push(LASTPAGE_ROW);
            } else {
                components.push(ENABLED_PAGINATION_ROW);
            }
        }
        const message = await interaction.editReply({
            embeds: [embeds[currentIndex]],
            components: components
        });
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60 * 1000
        });
        collector.on(`collect`, async (i) => {
            i.deferUpdate();
            const move = i.customId;
            if (move == `nextpage`) {
                if (currentIndex == embeds.length - 1) {
                    currentIndex = 0;
                } else {
                    currentIndex += 1;
                }
            } else if (move == `previouspage`) {
                if (currentIndex == 0) {
                    currentIndex = embeds.length - 1;
                } else {
                    currentIndex -= 1;
                }
            }

            const components = [];

            if (currentIndex == 0) {
                components.push(FIRSTPAGE_ROW);
            } else if (currentIndex == embeds.length - 1) {
                components.push(LASTPAGE_ROW);
            } else {
                components.push(ENABLED_PAGINATION_ROW);
            }

            if (!message.editable) {
                collector.stop("delete");
                return;
            } else {
                await message
                    .edit({
                        embeds: [embeds[currentIndex]],
                        components: components
                    })
                    .catch(console.error);
            }
        });
        collector.on(`end`, async (collected, reason) => {
            if (reason == "time") await message.edit({ components: [] });
        });
        resolve();
    });
}
