import { GuildMember, SlashCommandBuilder, SlashCommandSubcommandBuilder, TextChannel, userMention } from "discord.js";
import { SlashCommand } from "../types";
import { delay } from "../utils/delay";
import checkStaff from "../functions/checkStaff";
import buildBetMessage from "../functions/buildBetMessage";
import log from "../utils/log";
import { POINTS_EMOJI } from "../config";

const command: SlashCommand = {
    command: new SlashCommandBuilder()
        .setName("bet")
        .setDescription("manage server bets | mods-only")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName(`create`)
                .setDescription(`create a bet | mods-only`)
                .addStringOption((option) => option.setName("title").setDescription("the bet title").setRequired(true))
                .addStringOption((option) =>
                    option.setName("description").setDescription("the bet description").setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("options")
                        .setDescription("comma-separated options (don't include commas in the actual option!)")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("amounts")
                        .setDescription("comma-separated bet amounts e.g. (10,25,50,100)")
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName(`close`)
                .setDescription(`close a bet | mods-only`)
                .addIntegerOption((option) =>
                    option.setName("id").setDescription("the bet id").setMinValue(1).setRequired(true)
                )
                .addStringOption((option) =>
                    option.setName("options").setDescription("the comma-separated winning option ids").setRequired(true)
                )
        ),
    execute: async (interaction) => {
        try {
            await interaction.deferReply();
            const prisma = interaction.client.prisma;
            const settings = await prisma.setting.findFirst();
            const { teamRoleID } = settings!;
            const member = interaction.member as GuildMember;

            // check if user is staff
            const isStaff = checkStaff(member, teamRoleID);
            if (!isStaff) {
                throw Error(`You are not allowed to use this command!`);
            }

            const subcommand = interaction.options.getSubcommand(true);

            const channel = interaction.channel as TextChannel;

            if (subcommand === "create") {
                const title = interaction.options.getString("title", true);
                const description = interaction.options.getString("description", true);
                const optionsRaw = interaction.options.getString("options", true);
                const optionsArgs = optionsRaw.split(",");
                const options: string[] = [];
                let invalid = false;
                for (const optionsArg of optionsArgs) {
                    const trimmedValue = optionsArg.trim();
                    if (trimmedValue === "") {
                        invalid = true;
                        break;
                    }
                    options.push(trimmedValue);
                }
                const amountsRaw = interaction.options.getString("amounts", true);
                const amountsArgs = amountsRaw.split(",");
                const amounts: number[] = [];

                for (const amountsArg of amountsArgs) {
                    const trimmedValue = amountsArg.trim();
                    if (trimmedValue === "") {
                        invalid = true;
                        break;
                    }
                    const parsedValue = parseInt(trimmedValue, 10);
                    if (isNaN(parsedValue)) {
                        invalid = true;
                        break;
                    }
                    amounts.push(parsedValue);
                }

                if (invalid || amounts.length == 0 || options.length == 0) {
                    await interaction.editReply({
                        content: `Invalid input! Pleas ensure that you are following the correct format.`
                    });
                    return;
                }

                if (amounts.length > 25) {
                    await interaction.editReply({
                        content: `You may only enter up to 25 bet amounts!`
                    });
                    return;
                }

                if (options.length > 22) {
                    await interaction.editReply({
                        content: `You may only enter up to 22 bet options!`
                    });
                    return;
                }

                // store in database
                const bet = await prisma.bet.create({
                    data: {
                        creatorID: member.id,
                        title,
                        description,
                        amounts,
                        options
                    }
                });

                // create the embed
                const { embed, component } = await buildBetMessage(bet.id, prisma, interaction.guild!);
                const message = await channel.send({ embeds: [embed], components: [component] });
                await prisma.bet.update({
                    where: { id: bet.id },
                    data: { messageID: message.id, channelID: channel.id, messageUrl: message.url }
                });

                const content = `${userMention(member.id)} opened a bet in ${
                    message.url
                }!\nTitle: ${title}\nDescription: ${description}\nOptions: ${options.join(
                    ", "
                )}\nAmounts: ${amounts.join(", ")}`;
                await interaction.editReply({ content });
                await log({ title: "Bet Opened", content, color: "Green" });
            } else if (subcommand == "close") {
                const betID = interaction.options.getInteger("id", true);
                const bet = await prisma.bet.findFirst({ where: { id: betID }, include: { bets: true } });
                if (!bet) {
                    throw Error(`No bet with that ID exists!`);
                }
                const winningOptionsRaw = interaction.options.getString("options", true);
                const winningOptionsArgs = winningOptionsRaw.split(",");
                const winningOptions: number[] = [];
                let invalid = false;
                for (const winningOptionsArg of winningOptionsArgs) {
                    const trimmedValue = winningOptionsArg.trim();
                    if (trimmedValue === "") {
                        invalid = true;
                        break;
                    }
                    const parsedValue = parseInt(trimmedValue, 10);
                    if (isNaN(parsedValue)) {
                        invalid = true;
                        break;
                    }
                    winningOptions.push(parsedValue);
                }

                winningOptions.sort();

                if (invalid || winningOptions.length == 0) {
                    await interaction.editReply({
                        content: `Invalid input! Pleas ensure that you are following the correct format.`
                    });
                    return;
                }

                const { options, bets, title, description, amounts } = bet;
                let totalPoolAmount = 0;
                let totalWinningPoolAmount = 0;

                const betData: {
                    option: string;
                    optionId: number;
                    optionIndex: number;
                    totalAmount: number;
                    totalCount: number;
                }[] = [];
                for (let i = 0; i < options.length; i++) {
                    const option = options[i];
                    const optionIndex = i;
                    const optionId = i + 1;
                    const validBets = bets.filter((bet) => bet.optionIndex == i);
                    const totalCount = validBets.length;
                    const totalAmount = validBets.reduce((acc, bet) => acc + bet.amount, 0);
                    totalPoolAmount += totalAmount;
                    if (winningOptions.includes(optionId)) {
                        totalWinningPoolAmount += totalAmount;
                    }
                    betData.push({
                        option,
                        totalAmount,
                        totalCount,
                        optionIndex,
                        optionId
                    });
                }

                console.log("betData", betData);

                const promises = [];
                const winningOptionsIndices = [];
                const winningOptionsAmounts = [];
                const winners: { discordID: string; winnings: number }[] = [];
                for (let i = 0; i < winningOptions.length; i++) {
                    // compute total winnings for this option pool given their contribution to the total pool
                    const winningOptionId = winningOptions[i];
                    const winningOption = betData.find((j) => j.optionId == winningOptionId)!;
                    const totalOptionWinnings = (winningOption.totalAmount / totalWinningPoolAmount) * totalPoolAmount;
                    winningOptionsAmounts.push(totalOptionWinnings);
                    winningOptionsIndices.push(winningOption.optionIndex);

                    console.log(winningOption.optionIndex, totalOptionWinnings);

                    // distribute winnings to users with valid bets
                    const validBets = bets.filter((bet) => bet.optionIndex == winningOption.optionIndex);
                    promises.push(
                        validBets.map((validBet) => {
                            return new Promise<void>(async (resolve) => {
                                const totalPlayerWinnings =
                                    (validBet.amount / winningOption.totalAmount) * totalOptionWinnings;
                                await prisma.player.update({
                                    where: { discordID: validBet.playerID },
                                    data: { dobbyPoints: { increment: totalPlayerWinnings } }
                                });
                                winners.push({ discordID: validBet.playerID, winnings: totalPlayerWinnings });
                                return resolve();
                            });
                        })
                    );
                }

                await Promise.allSettled(promises);

                winners.sort((a, b) => a.winnings - b.winnings);
                const topWinners = winners.slice(0, 5);
                const winnersText = topWinners
                    .map(
                        (winner) =>
                            `- ${userMention(winner.discordID)} won ${winner.winnings.toFixed(2)} ${POINTS_EMOJI}`
                    )
                    .join("\n");

                // update bet
                await prisma.bet.update({
                    where: { id: betID },
                    data: {
                        winningOptionsAmounts,
                        winningOptionsIndices,
                        isOpen: false,
                        winnersText
                    }
                });
                const { embed } = await buildBetMessage(betID, prisma, interaction.guild!);
                const channel = (await interaction.guild!.channels.fetch(bet.channelID!)) as TextChannel;
                const message = await channel.messages.fetch(bet.messageID!);
                await message.edit({ embeds: [embed], components: [] });

                const winningOptionsText = winningOptions.map((option) => options[option]).join(" | ");

                // log event
                const content = `${userMention(member.id)} closed a bet in ${
                    message.url
                }!\nTitle: ${title}\nDescription: ${description}\nOptions: ${options.join(
                    ", "
                )}\nAmounts: ${amounts.join(
                    ", "
                )}\nWinning Options: ${winningOptionsText}\nWinning Amounts: ${winningOptionsAmounts.join(", ")}`;
                await interaction.editReply({ content });
                await log({ title: "Bet Closed", content, color: "Green" });
            }
        } catch (err: unknown) {
            const error = err as string;
            await interaction
                .editReply({
                    content: `${error}`
                })
                .catch(console.error);

            await delay(5000);
            await interaction.deleteReply().catch(console.error);
            return;
        }
    }
};

export default command;
