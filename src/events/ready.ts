import { Client, Guild, TextChannel } from "discord.js";
import { BotEvent } from "../types";
import setActivity from "../functions/setActivity";
import { CronJob } from "cron";
import { buildCheckinLeaderboardEmbed, buildPointsLeaderboardEmbed } from "../functions/buildLeaderboardEmbed";
import { PrismaClient } from "@prisma/client";
import resetCheckins from "../functions/resetCheckins";

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

        new CronJob(
            "0 8 * * *",
            async () => {
                const settings = await prisma.setting.findFirst();
                if (settings!.resetCheckins) await resetCheckins(prisma, guild);
            },
            null,
            true,
            "America/New_York"
        );
    }
};

export default event;
