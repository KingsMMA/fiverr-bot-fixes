import {
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Client,
    Collection,
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from "discord.js";
import { type Chalk } from "chalk";
import NodeCache from "node-cache";
import { PrismaClient } from "@prisma/client";

export interface SlashCommand {
    command: Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand"> | SlashCommandSubcommandsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction, client: Client) => void;
    autocomplete?: (interaction: AutocompleteInteraction) => void;
}

export interface Button {
    name: string;
    execute: (interaction: ButtonInteraction, client: Client) => void;
}

export interface Command {
    name: string;
    command: SlashCommandBuilder;
}

export interface BotEvent {
    name: string;
    once?: boolean | false;

    execute: (...args: any) => void;
}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            TOKEN: string;
            DATABASE_URL: string;
            LOGS_URL: string;
            CLIENT_ID: string;
            GUILD_ID: string;
            OWNER_ID: string;
            DEVELOPER_ID: string;
        }
    }
}

declare module "discord.js" {
    export interface Client {
        slashCommands: Collection<string, SlashCommand>;
        buttons: Collection<string, Button>;
        chalk: Chalk;
        cache: NodeCache;
        prisma: PrismaClient;
    }
}
