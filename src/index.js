import 'dotenv/config';
import {
  ActionRowBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  GuildMember,
  Partials,
  REST,
  Routes,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  VERIFIED_ROLE_ID,
  VERIFICATION_CHANNEL_ID,
  RULES_CHANNEL_ID,
  UNVERIFIED_ROLE_ID: ENV_UNVERIFIED_ROLE_ID,
} = process.env;

if (!DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_TOKEN in the environment.');
}

if (!CLIENT_ID) {
  throw new Error('Missing CLIENT_ID in the environment.');
}

if (!GUILD_ID) {
  throw new Error('Missing GUILD_ID in the environment.');
}

if (!VERIFIED_ROLE_ID) {
  throw new Error('Missing VERIFIED_ROLE_ID in the environment.');
}

if (!VERIFICATION_CHANNEL_ID) {
  throw new Error('Missing VERIFICATION_CHANNEL_ID in the environment.');
}

if (!RULES_CHANNEL_ID) {
  throw new Error('Missing RULES_CHANNEL_ID in the environment.');
}

const UNVERIFIED_ROLE_ID = ENV_UNVERIFIED_ROLE_ID ?? '1425824087829381151';

if (!ENV_UNVERIFIED_ROLE_ID) {
  console.warn('UNVERIFIED_ROLE_ID not set. Using default role ID 1425824087829381151.');
}

const commands = [
  {
    name: 'verify',
    description: 'Gain access to the server by receiving the verification role.',
    default_member_permissions: null,
    dm_permission: false,
  },
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('Registering /verify command on startup...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('Slash command ready!');
  } catch (error) {
    console.error('Failed to register commands on startup:', error);
  }
}

async function sendVerificationPrompt(clientInstance) {
  try {
    const guild = await clientInstance.guilds.fetch(GUILD_ID).catch(() => null);

    if (!guild) {
      console.warn('Unable to find guild for verification prompt.');
      return;
    }

    const channel = guild.channels.cache.get(VERIFICATION_CHANNEL_ID)
      ?? await guild.channels.fetch(VERIFICATION_CHANNEL_ID).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText) {
      console.warn('Verification channel missing or not a text channel.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Vintra Verification')
      .setDescription('Click the **Verify Me** button below to unlock the server. If you have issues, contact a moderator.')
      .setColor(0x5865F2)
      .setFooter({ text: 'Vintra Verification System' })
      .setTimestamp();

    const verifyButton = new ButtonBuilder()
      .setCustomId('vintra_verify_button')
      .setLabel('Verify Me')
      .setStyle(ButtonStyle.Primary);

    await channel.send({
      content: '📩 **Verification**\nClick the button below to gain access to the server.',
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(verifyButton)],
    });
  } catch (error) {
    console.error('Failed to send verification prompt:', error);
  }
}

async function sendRules(clientInstance) {
  try {
    const guild = await clientInstance.guilds.fetch(GUILD_ID).catch(() => null);

    if (!guild) {
      console.warn('Unable to find guild for rules message.');
      return;
    }

    const channel = guild.channels.cache.get(RULES_CHANNEL_ID)
      ?? await guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText) {
      console.warn('Rules channel missing or not a text channel.');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Server Rules')
      .setColor(0xED4245)
      .addFields(
        { name: '1. Be respectful', value: 'Treat everyone with respect. No harassment, hate speech, or discrimination.' },
        { name: '2. Keep it appropriate', value: 'Avoid NSFW content and follow Discord Terms of Service.' },
        { name: '3. No spam or advertising', value: 'Do not spam channels or advertise without permission.' },
        { name: '4. Use channels correctly', value: 'Post topics in the appropriate channels and follow channel descriptions.' },
        { name: '5. Listen to staff', value: 'Moderators have the final say. Follow their instructions.' },
      )
      .setFooter({ text: 'Vintra Community Guidelines' })
      .setTimestamp();

    await channel.send({
      content: '📜 **Please read the rules carefully.**'
        + '\nReacting appropriately or verifying signifies that you accept these rules.',
      embeds: [embed],
    });
  } catch (error) {
    console.error('Failed to send rules message:', error);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember],
});

client.once('ready', (readyClient) => {
  console.log(`Vintra is online as ${readyClient.user.tag}`);
  readyClient.user.setPresence({
    activities: [{ name: 'verification requests', type: 3 }],
    status: 'online',
  });

  registerCommands();
  sendVerificationPrompt(readyClient);
  sendRules(readyClient);
});

async function verifyMember(member) {
  if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
    return { status: 'already' };
  }

  try {
    if (member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
      await member.roles.remove(UNVERIFIED_ROLE_ID, 'Verification completed via Vintra');
    }

    await member.roles.add(VERIFIED_ROLE_ID, 'Verification completed via Vintra');
    return { status: 'success' };
  } catch (error) {
    console.error('Failed to adjust roles during verification:', error);
    return { status: 'error', error };
  }
}

client.on('guildMemberAdd', async (member) => {
  try {
    if (!member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
      await member.roles.add(UNVERIFIED_ROLE_ID, 'Assign unverified role on join');
    }

    const embed = new EmbedBuilder()
      .setTitle('Welcome to the server!')
      .setDescription('To gain access, go to the verification channel and click the **Verify Me** button.')
      .setColor(0x5865F2)
      .setFooter({ text: 'Vintra Verification System' })
      .setTimestamp();

    await member.send({
      content: 'Hi! Thanks for joining. Follow the instructions below to unlock the server.',
      embeds: [embed],
    });
  } catch (error) {
    console.error('Failed to deliver welcome instructions to new member:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId !== 'vintra_verify_button') return;

    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Please use this button inside the server.',
        ephemeral: true,
      });
      return;
    }

    let member = interaction.member;

    if (!member || !(member instanceof GuildMember)) {
      try {
        member = await interaction.guild.members.fetch(interaction.user.id);
      } catch (error) {
        console.error('Failed to resolve guild member for button verification:', error);
        await interaction.reply({
          content: 'Could not load your server profile. Please try again in a moment.',
          ephemeral: true,
        });
        return;
      }
    }

    const result = await verifyMember(member);

    if (result.status === 'already') {
      await interaction.reply({
        content: 'You are already verified! ⚡',
        ephemeral: true,
      });
      return;
    }

    if (result.status === 'success') {
      await interaction.reply({
        content: 'You are now verified! Welcome in! ✅',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: 'Could not verify you. Please contact an administrator.',
      ephemeral: true,
    });
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'verify') return;

  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'This command can only be used inside the server.',
      ephemeral: true,
    });
    return;
  }

  let member = interaction.member;

  if (!member || !(member instanceof GuildMember)) {
    try {
      member = await interaction.guild.members.fetch(interaction.user.id);
    } catch (error) {
      console.error('Failed to resolve guild member for verification:', error);
      await interaction.reply({
        content: 'Could not load your server profile. Please try again in a moment.',
        ephemeral: true,
      });
      return;
    }
  }

  const result = await verifyMember(member);

  if (result.status === 'already') {
    await interaction.reply({
      content: 'You are already verified! ⚡',
      ephemeral: true,
    });
    return;
  }

  if (result.status === 'success') {
    await interaction.reply({
      content: 'You are now verified! Welcome in! ✅',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: 'Could not verify you. Please contact an administrator.',
    ephemeral: true,
  });
});

client.login(DISCORD_TOKEN);
