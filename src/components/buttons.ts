import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const ENABLED_PAGINATION_ROW = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`previouspage`).setLabel(`Previous`).setStyle(ButtonStyle.Danger).setEmoji(`⬅`),
    new ButtonBuilder().setCustomId(`nextpage`).setLabel(`Next`).setStyle(ButtonStyle.Success).setEmoji(`➡`)
);

export const DISABLED_PAGINATION_ROW = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
        .setCustomId(`previouspage`)
        .setLabel(`Previous`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji(`⬅`)
        .setDisabled(true),
    new ButtonBuilder()
        .setCustomId(`nextpage`)
        .setLabel(`Next`)
        .setStyle(ButtonStyle.Success)
        .setEmoji(`➡`)
        .setDisabled(true)
);

export const FIRSTPAGE_ROW = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
        .setCustomId(`previouspage`)
        .setLabel(`Previous`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji(`⬅`)
        .setDisabled(true),
    new ButtonBuilder()
        .setCustomId(`nextpage`)
        .setLabel(`Next`)
        .setStyle(ButtonStyle.Success)
        .setEmoji(`➡`)
        .setDisabled(false)
);

export const LASTPAGE_ROW = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
        .setCustomId(`previouspage`)
        .setLabel(`Previous`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji(`⬅`)
        .setDisabled(false),
    new ButtonBuilder()
        .setCustomId(`nextpage`)
        .setLabel(`Next`)
        .setStyle(ButtonStyle.Success)
        .setEmoji(`➡`)
        .setDisabled(true)
);
