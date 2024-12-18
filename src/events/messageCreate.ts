import { Events, Message, userMention } from "discord.js";
import { BotEvent } from "../types";
import { delay } from "../utils/delay";
import { POINTS_EMOJI } from "../config";
import log from "../utils/log";

const event: BotEvent = {
    name: Events.MessageCreate,
    execute: async (message: Message) => {
        if (message.author.bot || message.webhookId) return;

        if (message.partial) {
            try {
                await message.fetch();
            } catch (error) {
                console.error("Something went wrong when fetching the message:", error);
                return;
            }
        }

        try {
            const checkinChannelID = message.client.cache.get("checkinChannelID") as string;

            if (message.channel.id !== checkinChannelID) return;

            const prisma = message.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { checkinrewards, checkinminimummsglength } = settings!;
            const discordid = message.author.id;
            const discordtag = message.author.tag;

            const player = await prisma.player.upsert({
                where: {
                    discordid,
                    discordtag
                },
                create: {
                    discordid,
                    discordtag
                },
                update: {
                    discordtag
                }
            });

            if (player.ischeckedin) {
                throw Error("You have already checked in today!");
            }

            if (message.content.length < checkinminimummsglength) {
                throw Error(`Your check-in must be at least ${checkinminimummsglength} characters long`);
            }

            const newStreak = player.checkinstreak + 1;

            await prisma.player.update({
                where: {
                    discordid
                },
                data: {
                    ischeckedin: true,
                    dobbypoints: {
                        increment: checkinrewards
                    },
                    checkinstreak: newStreak
                }
            });

            await message.react(POINTS_EMOJI).catch(console.error);

            const content = `${userMention(
                discordid
            )} has checked in for ${newStreak} consecutive day(s) and been awarded ${checkinrewards} ${POINTS_EMOJI} points`;

            await log({ title: "Check-in", content, color: "Orange" });
            const msg = await message.reply({ content: `${content}` });
            await delay(5000);
            await msg.delete().catch(console.error);
        } catch (err) {
            const error = err as string;
            const reply = await message.reply({ content: `${error}` }).catch(console.error);
            await delay(5000);
            await message.delete().catch(console.error);
            if (reply) await reply.delete().catch(console.error);
            return;
        }
    }
};

export default event;
