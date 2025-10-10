import 'dotenv/config';
import { REST, Routes } from 'discord.js';

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_TOKEN in the environment.');
}

if (!CLIENT_ID) {
  throw new Error('Missing CLIENT_ID in the environment.');
}

if (!GUILD_ID) {
  throw new Error('Missing GUILD_ID in the environment.');
}

const commands = [
  {
    name: 'verify',
    description: 'Gain access to the server by receiving the verification role.',
  },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('Updating /verify command...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('Slash command registered!');
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exitCode = 1;
  }
}

registerCommands();
