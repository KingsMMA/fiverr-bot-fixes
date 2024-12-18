import { Client, Guild, TextChannel } from "discord.js";
import { BotEvent } from "../types";
import setActivity from "../functions/setActivity";
import cron from "node-cron";
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
        const { checkinchannelid, shopmessageid } = settings!;
        client.cache.set("checkinChannelID", checkinchannelid);
        client.cache.set("shopMessageID", shopmessageid);

        cron.schedule(
            "0 8 * * *",
            async () => {
                const settings = await prisma.setting.findFirst();
                if (settings!.resetcheckins) await resetCheckins(prisma, guild);
            },
            { timezone: "America/New_York" }
        );
    }
};

export default event;
