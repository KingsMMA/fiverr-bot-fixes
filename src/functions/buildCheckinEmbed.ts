import { EmbedBuilder, roleMention, time } from "discord.js";
import { POINTS_EMOJI } from "../config";
import dayjs from "../utils/dayjs";
import { PrismaClient } from "@prisma/client";

export default function (prisma: PrismaClient) {
    return new Promise<EmbedBuilder>(async (resolve) => {
        const settings = await prisma.setting.findFirst();
        const { checkinTargetRoleID, checkinTargetCount, checkinRewards } = settings!;
        const now = dayjs().tz("America/New_York").hour(8).minute(0).second(0).millisecond(0);
        const next = now.add(1, "day").utc();

        const embed = new EmbedBuilder()
            .setColor("Random")
            .setTimestamp()
            .setTitle(`${POINTS_EMOJI} Check-in for ${now.format("MM/DD z")}`).setDescription(`
If you write one comment underneath this you will gain ${checkinRewards} Dobby Points ${POINTS_EMOJI}.

If you check-in here for ${checkinTargetCount} consecutive periods, you'll earn ${roleMention(
            checkinTargetRoleID
        )} & **1 free month**.

> Replies don't have to be high quality, but we do ask that you refrain from low-quality and if you must post something short that at the very least it's a full sentence. Can be whatever's on your mind or just something positive :)

*Please note: Your check-in must be at least 25 characters long.*

Check-ins will be reset ${time(next.toDate(), "R")}.
`);
        return resolve(embed);
    });
}
