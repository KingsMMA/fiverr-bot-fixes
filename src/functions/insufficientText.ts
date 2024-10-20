import { channelMention, userMention } from "discord.js";
import { POINTS_EMOJI } from "../config";

export default function insufficientText(discordID: string, checkinChannelID: string, lectureChannelID: string) {
    return `${userMention(discordID)},Insufficient funds. Get more ${POINTS_EMOJI} points through ${channelMention(
        checkinChannelID
    )}, attending ${channelMention(lectureChannelID)}, creating/joining a team, or gambling >:)`;
}
