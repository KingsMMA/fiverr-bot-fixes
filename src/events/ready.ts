import { Client, Guild, TextChannel } from "discord.js";
import { BotEvent } from "../types";
import setActivity from "../functions/setActivity";
import cron from "node-cron";
import { buildCheckinLeaderboardEmbed, buildPointsLeaderboardEmbed } from "../functions/buildLeaderboardEmbed";
import { PrismaClient } from "@prisma/client";
import resetCheckins from "../functions/resetCheckins";

// export async function updateLeaderboard(prisma: PrismaClient, guild: Guild) {
//     const settings = await prisma.setting.findFirst();
//     const { leaderboardChannelID, leaderboardMessageID } = settings!;
//     const channel = (await guild.channels.fetch(leaderboardChannelID)) as TextChannel;
//     const message = await channel.messages.fetch(leaderboardMessageID);
//     const pointsEmbed = await buildPointsLeaderboardEmbed(prisma);
//     const checkinEmbed = await buildCheckinLeaderboardEmbed(prisma);
//     await message.edit({ embeds: [pointsEmbed, checkinEmbed] }).catch(console.error);
// }

const event: BotEvent = {
    name: "ready",
    once: true,
    execute: async (client: Client) => {
        console.log(`${client.chalk.green("[events/ready]:")} ready! logged in as ` + client.user!.tag);
        console.log(
            `${client.chalk.green("[events/ready]:")} currently online at ` + client.guilds.cache.size + ` servers`
        );
        await setActivity(client);

        const prisma = client.prisma;
        const guild = await client.guilds.fetch(process.env.GUILD_ID);

        const settings = await prisma.setting.findFirst();
        const { checkinChannelID, shopMessageID } = settings!;
        client.cache.set("checkinChannelID", checkinChannelID);
        client.cache.set("shopMessageID", shopMessageID);

        // await updateLeaderboard(prisma, guild);

        // cron.schedule("*/10 * * * *", async () => {
        //     await updateLeaderboard(prisma, guild);
        // });

        // run a cron job to reset checkins every day at 8am
        cron.schedule(
            "0 8 * * *",
            async () => {
                const settings = await prisma.setting.findFirst();
                if (settings!.resetCheckins) await resetCheckins(prisma, guild);
            },
            { timezone: "America/New_York" }
        );
    }
};

export default event;
