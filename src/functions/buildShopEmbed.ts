import { PrismaClient } from "@prisma/client";
import { POINTS_EMOJI, COUNT_EMOJI } from "./../config";
import { EmbedBuilder, Guild } from "discord.js";

export default async function buildShopEmbed(guild: Guild, prisma: PrismaClient) {
    return new Promise<{ embed: EmbedBuilder }>(async (resolve) => {
        const items = await prisma.item.findMany({ orderBy: { id: "asc" } });

        let itemsText = ``;
        for (const item of items) {
            itemsText += `\n${COUNT_EMOJI[item.id]} - ${item.name} - **${item.price} ${POINTS_EMOJI}**`;
        }
        const embed = new EmbedBuilder()
            .setColor("Random")
            .setThumbnail(guild.iconURL())
            .setTitle("GigaRick Bazaar - Items & Prices")
            .setDescription(itemsText);
        resolve({ embed });
    });
}
