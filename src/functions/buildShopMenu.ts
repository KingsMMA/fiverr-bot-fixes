import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

import { POINTS_EMOJI } from "../config";
import { PrismaClient } from "@prisma/client";

export default function buildShopMenu(prisma: PrismaClient) {
    return new Promise<ActionRowBuilder<StringSelectMenuBuilder>>(async (resolve) => {
        const items = await prisma.item.findMany({ orderBy: { id: "asc" } });
        const options = items.map((v) => {
            return new StringSelectMenuOptionBuilder()
                .setLabel(v.title)
                .setDescription(`Price: ${v.price}`)
                .setEmoji(POINTS_EMOJI)
                .setValue(`${v.id}`);
        });

        const select = new StringSelectMenuBuilder()
            .setCustomId("shop_select")
            .setPlaceholder("Select an item to purchase!")
            .addOptions(...options);

        const component = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents([select]);

        return resolve(component);
    });
}
