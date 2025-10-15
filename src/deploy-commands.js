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
    default_member_permissions: null,
    dm_permission: false,
  },
  {
    name: 'announce',
    description: 'Send an announcement in this channel.',
    default_member_permissions: null,
    dm_permission: false,
    options: [
      {
        name: 'message',
        description: 'Announcement message to post.',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'warn',
    description: 'Warn a member in the current channel.',
    default_member_permissions: null,
    dm_permission: false,
    options: [
      {
        name: 'user',
        description: 'Member to warn.',
        type: 6,
        required: true,
      },
      {
        name: 'reason',
        description: 'Reason for the warning.',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'kick',
    description: 'Kick a member from the server.',
    default_member_permissions: null,
    dm_permission: false,
    options: [
      {
        name: 'user',
        description: 'Member to kick.',
        type: 6,
        required: true,
      },
      {
        name: 'reason',
        description: 'Reason for the kick.',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'ban',
    description: 'Ban a member from the server.',
    default_member_permissions: null,
    dm_permission: false,
    options: [
      {
        name: 'user',
        description: 'Member to ban.',
        type: 6,
        required: true,
      },
      {
        name: 'reason',
        description: 'Reason for the ban.',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'mute',
    description: 'Mute a member in the server.',
    default_member_permissions: null,
    dm_permission: false,
    options: [
      {
        name: 'user',
        description: 'Member to mute.',
        type: 6,
        required: true,
      },
      {
        name: 'reason',
        description: 'Reason for the mute.',
        type: 3,
        required: false,
      },
      {
        name: 'duration',
        description: 'Duration of the mute in minutes (optional, indefinite if not provided).',
        type: 4,
        required: false,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('Registering all application commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('All slash commands registered successfully!');
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exitCode = 1;
  }
}

registerCommands();
