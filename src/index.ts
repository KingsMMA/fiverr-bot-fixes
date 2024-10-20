/* eslint-disable @typescript-eslint/no-var-requires */
import { config } from "dotenv";
import {
    REST,
    Client,
    Collection,
    GatewayIntentBits,
    Routes,
    RESTPostAPIApplicationCommandsJSONBody,
    Partials
} from "discord.js";
import { BotEvent, Button, SlashCommand } from "./types";
config();
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { PrismaClient } from "@prisma/client";
import NodeCache from "node-cache";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// handle chalk
client.chalk = chalk;

// handle cache
client.cache = new NodeCache();

// handle prisma
client.prisma = new PrismaClient();

// handle slash commands
client.slashCommands = new Collection<string, SlashCommand>();
const slashCommandsPath = path.join(__dirname, `slash-commands`);
const slashCommandFiles = fs.readdirSync(slashCommandsPath).filter((file) => file.endsWith(`.js`));
const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
for (const file of slashCommandFiles) {
    const filePath = path.join(slashCommandsPath, file);
    const command: SlashCommand = require(filePath).default;
    client.slashCommands.set(command.command.name, command);
    commands.push(command.command.toJSON());
}

// handle buttons
client.buttons = new Collection<string, Button>();
const buttonsPath = path.join(__dirname, `buttons`);
const buttonsFiles = fs.readdirSync(buttonsPath).filter((file) => file.endsWith(`.js`));
for (const file of buttonsFiles) {
    const filePath = path.join(buttonsPath, file);
    const button: Button = require(filePath).default;
    client.buttons.set(button.name, button);
}

const rest = new REST().setToken(process.env.TOKEN);
(async () => {
    try {
        console.log(
            `${client.chalk.magenta("[index]:")} started refreshing ${commands.length} application (/) commands.`
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
            body: commands
        });
        console.log(
            `${client.chalk.magenta("[index]:")} successfully reloaded ${data.length} application (/) commands.`
        );
    } catch (error) {
        console.error(error);
    }
})();

// handle events
const eventsPath = path.join(__dirname, `events`);
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(`.js`));
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event: BotEvent = require(filePath).default;
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

client.login(process.env.TOKEN);
