import 'dotenv/config';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  GuildMember,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
} from 'discord.js';

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  VERIFIED_ROLE_ID,
  VERIFICATION_CHANNEL_ID,
  RULES_CHANNEL_ID,
  SUPPORT_CHANNEL_ID: ENV_SUPPORT_CHANNEL_ID,
  UNVERIFIED_ROLE_ID: ENV_UNVERIFIED_ROLE_ID,
  ADMIN_ROLE_ID: ENV_ADMIN_ROLE_ID,
} = process.env;

if (!DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_TOKEN in the environment.');
}

async function addAdminsToThread(thread, guild) {
  try {
    const role = guild.roles.cache.get(ADMIN_ROLE_ID)
      ?? await guild.roles.fetch(ADMIN_ROLE_ID).catch(() => null);

    if (!role) {
      console.warn('Admin role not found. Skipping admin thread invitations.');
      return;
    }

    if (!role.members.size) {
      console.warn('Admin role has no members to invite into ticket.');
      return;
    }

    const invitations = Array.from(role.members.values()).map(async (member) => {
      try {
        await thread.members.add(member.id);
      } catch (error) {
        console.warn(`Failed to add admin ${member.user.tag} to ticket thread:`, error);
      }
    });

    await Promise.allSettled(invitations);
  } catch (error) {
    console.error('Unexpected error while inviting admins to ticket thread:', error);
  }
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

const SUPPORT_CHANNEL_ID = ENV_SUPPORT_CHANNEL_ID ?? '1426147549143634081';

if (!ENV_SUPPORT_CHANNEL_ID) {
  console.warn('SUPPORT_CHANNEL_ID not set. Using default channel ID 1426147549143634081.');
}

const ADMIN_ROLE_ID = ENV_ADMIN_ROLE_ID ?? '1425815446187278367';

if (!ENV_ADMIN_ROLE_ID) {
  console.warn('ADMIN_ROLE_ID not set. Using default role ID 1425815446187278367.');
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
    console.log('Registering application commands on startup...');
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

async function sendSupportPrompt(clientInstance) {
  try {
    const guild = await clientInstance.guilds.fetch(GUILD_ID).catch(() => null);

    if (!guild) {
      console.warn('Unable to find guild for support prompt.');
      return;
    }

    const channel = guild.channels.cache.get(SUPPORT_CHANNEL_ID)
      ?? await guild.channels.fetch(SUPPORT_CHANNEL_ID).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText) {
      console.warn('Support channel missing or not a text channel.');
      return;
    }

    await channel.messages.fetch({ limit: 20 }).catch(() => null);

    const alreadyPosted = channel.messages.cache.find((message) => (
      message.author.id === clientInstance.user.id
      && message.components.some((row) => row.components.some((component) => component.customId === 'vintra_open_ticket'))
    ));

    if (alreadyPosted) {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Need help?')
      .setDescription('Click the button below to open a private support ticket with the Vintra team.')
      .setColor(0x2ECC71)
      .setFooter({ text: 'Vintra Support' })
      .setTimestamp();

    const openTicketButton = new ButtonBuilder()
      .setCustomId('vintra_open_ticket')
      .setLabel('Open Ticket')
      .setStyle(ButtonStyle.Primary);

    await channel.send({
      content: '🆘 **Support Desk**\nNeed assistance? Click below to contact the team.',
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(openTicketButton)],
    });
  } catch (error) {
    console.error('Failed to send support prompt:', error);
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
  sendSupportPrompt(readyClient);
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
    if (interaction.customId === 'vintra_open_ticket') {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: 'Please use this button inside the server.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const supportChannel = interaction.guild.channels.cache.get(SUPPORT_CHANNEL_ID)
        ?? await interaction.guild.channels.fetch(SUPPORT_CHANNEL_ID).catch(() => null);

      if (!supportChannel || supportChannel.type !== ChannelType.GuildText) {
        await interaction.editReply({
          content: 'Support channel is unavailable. Please contact a moderator.',
        });
        return;
      }

      await supportChannel.threads.fetchActive().catch(() => null);

      const existingThread = supportChannel.threads.cache.find((thread) => (
        !thread.archived && thread.name.includes(interaction.user.id)
      ));

      if (existingThread) {
        await interaction.editReply({
          content: `You already have an open ticket: ${existingThread}.`,
        });
        return;
      }

      const baseName = `ticket-${interaction.user.username}`
        .replace(/[^a-zA-Z0-9-]/g, '-')
        .substring(0, 50);
      const threadName = `${baseName}-${interaction.user.id}`.substring(0, 90);

      let thread;

      try {
        thread = await supportChannel.threads.create({
          name: threadName,
          autoArchiveDuration: 1440,
          type: ChannelType.PrivateThread,
          reason: `Support ticket for ${interaction.user.tag}`,
        });

        await thread.members.add(interaction.user.id);
        await addAdminsToThread(thread, interaction.guild);
      } catch (error) {
        console.warn('Private thread creation failed, falling back to public thread:', error);
        thread = await supportChannel.threads.create({
          name: threadName,
          autoArchiveDuration: 1440,
          reason: `Support ticket for ${interaction.user.tag}`,
        });

        await addAdminsToThread(thread, interaction.guild);
      }

      const closeButton = new ButtonBuilder()
        .setCustomId('vintra_close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Secondary);

      const ticketEmbed = new EmbedBuilder()
        .setTitle('Support Ticket')
        .setDescription('A staff member will be with you shortly. Share your issue below so we can help you faster.')
        .setColor(0x2ECC71)
        .setFooter({ text: `Requester: ${interaction.user.tag}` })
        .setTimestamp();

      await thread.send({
        content: `${interaction.user} opened a ticket.`,
        embeds: [ticketEmbed],
        components: [new ActionRowBuilder().addComponents(closeButton)],
      });

      await interaction.editReply({
        content: `Your ticket has been created: ${thread}.`,
      });
      return;
    }

    if (interaction.customId === 'vintra_close_ticket') {
      if (!interaction.inGuild()) {
        await interaction.reply({
          content: 'Please use this button inside the server.',
          ephemeral: true,
        });
        return;
      }

      const { channel } = interaction;

      if (!channel?.isThread()) {
        await interaction.reply({
          content: 'This button only works inside ticket threads.',
          ephemeral: true,
        });
        return;
      }

      const member = interaction.member instanceof GuildMember
        ? interaction.member
        : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

      if (!member) {
        await interaction.reply({
          content: 'Could not load your server profile. Please try again later.',
          ephemeral: true,
        });
        return;
      }

      const hasStaffPermission = member.permissions.has(PermissionFlagsBits.ManageThreads, true);
      const isTicketOwner = channel.name.includes(interaction.user.id);

      if (!hasStaffPermission && !isTicketOwner) {
        await interaction.reply({
          content: 'Only staff or the ticket creator can close this ticket.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      await channel.send(`Ticket closed by ${interaction.user}.`);
      await channel.setArchived(true, 'Ticket closed');

      await interaction.editReply({
        content: 'Ticket closed. Thank you!',
      });
      return;
    }

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

  if (interaction.commandName === 'announce') {
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
        console.error('Failed to resolve guild member for announcement:', error);
        await interaction.reply({
          content: 'Could not load your server profile. Please try again in a moment.',
          ephemeral: true,
        });
        return;
      }
    }

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      await interaction.reply({
        content: 'Only administrators can use this command.',
        ephemeral: true,
      });
      return;
    }

    const announcement = interaction.options.getString('message', true);
    const targetChannel = interaction.channel;

    if (!targetChannel?.isTextBased()) {
      await interaction.reply({
        content: 'Announcements can only be sent in text channels.',
        ephemeral: true,
      });
      return;
    }

    await targetChannel.send({ content: announcement });
    await interaction.reply({
      content: 'Announcement sent.',
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === 'warn') {
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
        console.error('Failed to resolve guild member for warning:', error);
        await interaction.reply({
          content: 'Could not load your server profile. Please try again in a moment.',
          ephemeral: true,
        });
        return;
      }
    }

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      await interaction.reply({
        content: 'Only administrators can use this command.',
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided.';

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: 'You cannot warn yourself.',
        ephemeral: true,
      });
      return;
    }

    const targetMember = interaction.guild.members.cache.get(targetUser.id)
      ?? await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        content: 'Could not find that member in the server.',
        ephemeral: true,
      });
      return;
    }

    await interaction.channel.send({
      content: `${targetMember}, you have received a warning from ${interaction.user}. Reason: ${reason}`,
    });

    await interaction.reply({
      content: 'Warning delivered.',
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === 'kick') {
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
        console.error('Failed to resolve guild member for kick:', error);
        await interaction.reply({
          content: 'Could not load your server profile. Please try again in a moment.',
          ephemeral: true,
        });
        return;
      }
    }

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      await interaction.reply({
        content: 'Only administrators can use this command.',
        ephemeral: true,
      });
      return;
    }

    if (!member.permissions.has(PermissionFlagsBits.KickMembers, true)) {
      await interaction.reply({
        content: 'You are missing the Kick Members permission.',
        ephemeral: true,
      });
      return;
    }

    const botMember = interaction.guild.members.me;

    if (!botMember?.permissions.has(PermissionFlagsBits.KickMembers, true)) {
      await interaction.reply({
        content: 'I do not have permission to kick members.',
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided.';

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: 'You cannot kick yourself.',
        ephemeral: true,
      });
      return;
    }

    const targetMember = interaction.guild.members.cache.get(targetUser.id)
      ?? await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        content: 'Could not find that member in the server.',
        ephemeral: true,
      });
      return;
    }

    if (member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
      await interaction.reply({
        content: 'You cannot kick a member with an equal or higher role.',
        ephemeral: true,
      });
      return;
    }

    if (botMember.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
      await interaction.reply({
        content: 'I cannot kick a member with an equal or higher role than mine.',
        ephemeral: true,
      });
      return;
    }

    await targetMember.kick(reason).catch(async (error) => {
      console.error('Failed to kick member:', error);
      await interaction.reply({
        content: 'Failed to kick that member. Please check my permissions and role hierarchy.',
        ephemeral: true,
      });
    });

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `Kicked ${targetUser.tag}. Reason: ${reason}`,
        ephemeral: true,
      });
    }
    return;
  }

  if (interaction.commandName === 'mute') {
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
        console.error('Failed to resolve guild member for mute:', error);
        await interaction.reply({
          content: 'Could not load your server profile. Please try again in a moment.',
          ephemeral: true,
        });
        return;
      }
    }

    if (!member.roles.cache.has(ADMIN_ROLE_ID)) {
      await interaction.reply({
        content: 'Only administrators can use this command.',
        ephemeral: true,
      });
      return;
    }

    if (!member.permissions.has(PermissionFlagsBits.MuteMembers, true)) {
      await interaction.reply({
        content: 'You are missing the Mute Members permission.',
        ephemeral: true,
      });
      return;
    }

    const botMember = interaction.guild.members.me;

    if (!botMember?.permissions.has(PermissionFlagsBits.MuteMembers, true)) {
      await interaction.reply({
        content: 'I do not have permission to mute members.',
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided.';
    const durationMinutes = interaction.options.getInteger('duration');

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: 'You cannot mute yourself.',
        ephemeral: true,
      });
      return;
    }

    const targetMember = interaction.guild.members.cache.get(targetUser.id)
      ?? await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        content: 'Could not find that member in the server.',
        ephemeral: true,
      });
      return;
    }

    if (member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
      await interaction.reply({
        content: 'You cannot mute a member with an equal or higher role.',
        ephemeral: true,
      });
      return;
    }

    if (botMember.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0) {
      await interaction.reply({
        content: 'I cannot mute a member with an equal or higher role than mine.',
        ephemeral: true,
      });
      return;
    }

    const timeoutDuration = durationMinutes ? durationMinutes * 60 * 1000 : null; // Null for indefinite

    await targetMember.timeout(timeoutDuration, reason).catch(async (error) => {
      console.error('Failed to mute member:', error);
      await interaction.reply({
        content: 'Failed to mute that member. Please check my permissions and role hierarchy.',
        ephemeral: true,
      });
    });

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `Muted ${targetUser.tag}${durationMinutes ? ` for ${durationMinutes} minutes` : ' indefinitely'}. Reason: ${reason}`,
        ephemeral: true,
      });
    }
    return;
  }

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
