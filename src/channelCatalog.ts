import { ChannelDefinition, ChannelDraft, ChannelDraftMap } from './types';

const field = (
  id: string,
  label: string,
  labelZh: string,
  placeholder: string,
  cliFlag?: string,
  required: boolean = false,
  secret: boolean = false
) => ({
  id,
  label,
  labelZh,
  placeholder,
  cliFlag,
  required,
  secret,
});

export const CHANNEL_CATALOG: ChannelDefinition[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    nameZh: 'Telegram',
    setupLabel: 'Bot API',
    setupLabelZh: 'Bot API',
    summary: 'Register a Telegram bot token and let OpenClaw receive direct and group messages.',
    summaryZh: '配置 Telegram Bot Token，让 OpenClaw 可以接收私聊和群消息。',
    docsUrl: 'https://docs.openclaw.ai/channels/telegram',
    commandMode: 'add',
    fields: [field('token', 'Bot token', 'Bot Token', '123456:ABC...', '--token', true, true)],
    steps: ['Create a bot with BotFather.', 'Paste the token below.', 'Save the draft, then let ClawOne write the channel config.'],
    stepsZh: ['先通过 BotFather 创建机器人。', '把 Bot Token 填到下方。', '保存后由 ClawOne 写入渠道配置。'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    nameZh: 'WhatsApp',
    setupLabel: 'QR link',
    setupLabelZh: '二维码绑定',
    summary: 'Link a WhatsApp Web session with the official QR login flow after saving a valid channel stub.',
    summaryZh: '先保存一个有效的渠道配置，再通过官方二维码流程绑定 WhatsApp Web 会话。',
    docsUrl: 'https://docs.openclaw.ai/channels/whatsapp',
    commandMode: 'login',
    fields: [],
    steps: ['Save this channel.', 'Run the official login command shown below.', 'Scan the QR code or login link in the terminal.'],
    stepsZh: ['先保存当前渠道。', '运行下方官方登录命令。', '在终端里扫描二维码或打开登录链接。'],
  },
  {
    id: 'discord',
    name: 'Discord',
    nameZh: 'Discord',
    setupLabel: 'Bot API',
    setupLabelZh: 'Bot API',
    summary: 'Connect a Discord bot token and keep ClawOne aligned with the official gateway channel format.',
    summaryZh: '配置 Discord Bot Token，并按官方网关格式保存渠道配置。',
    docsUrl: 'https://docs.openclaw.ai/channels/discord',
    commandMode: 'add',
    fields: [field('token', 'Bot token', 'Bot Token', 'MTIzN...discord token...', '--token', true, true)],
    steps: ['Create a Discord application and bot.', 'Paste the bot token below.', 'Invite the bot to your server after saving.'],
    stepsZh: ['先创建 Discord Application 和 Bot。', '把 Bot Token 填到下方。', '保存后再把 Bot 邀请进你的服务器。'],
  },
  {
    id: 'irc',
    name: 'IRC',
    nameZh: 'IRC',
    setupLabel: 'Server + Nick',
    setupLabelZh: '服务器 + 昵称',
    summary: 'IRC is supported by OpenClaw, but its connection details are still configured through the official docs and CLI config.',
    summaryZh: 'OpenClaw 支持 IRC，但连接细节仍需按官方文档与 CLI 配置完成。',
    docsUrl: 'https://docs.openclaw.ai/channels/irc',
    commandMode: 'manual',
    fields: [
      field('server', 'Server', '服务器', 'irc.libera.chat'),
      field('nick', 'Nickname', '昵称', 'clawone-bot'),
    ],
    steps: ['Capture the IRC server and nickname here.', 'Open the docs page to finish the remaining config keys.', 'Save the channel stub so the channel appears in OpenClaw config.'],
    stepsZh: ['先记录 IRC 服务器与昵称。', '打开官方文档补齐剩余配置项。', '保存渠道占位，使其进入 OpenClaw 配置。'],
  },
  {
    id: 'googlechat',
    name: 'Google Chat',
    nameZh: 'Google Chat',
    setupLabel: 'Chat API',
    setupLabelZh: 'Chat API',
    summary: 'Use the official Google Chat webhook and audience settings with the OpenClaw channel add flow.',
    summaryZh: '通过官方 Google Chat webhook 与 audience 配置接入 OpenClaw。',
    docsUrl: 'https://docs.openclaw.ai/channels/googlechat',
    commandMode: 'add',
    fields: [
      field('webhookUrl', 'Webhook URL', 'Webhook URL', 'https://chat.googleapis.com/...', '--webhook-url', true),
      field('audience', 'Audience', 'Audience', 'project number or app URL', '--audience'),
      field('audienceType', 'Audience type', 'Audience 类型', 'project-number', '--audience-type'),
    ],
    steps: ['Create the Chat app integration in Google Cloud.', 'Provide the webhook URL and audience information.', 'Save the draft to generate the matching CLI command.'],
    stepsZh: ['先在 Google Cloud 中创建 Chat 应用。', '填写 webhook URL 和 audience 信息。', '保存草稿后生成对应 CLI 配置命令。'],
  },
  {
    id: 'slack',
    name: 'Slack',
    nameZh: 'Slack',
    setupLabel: 'Socket Mode',
    setupLabelZh: 'Socket Mode',
    summary: 'Configure both the app token and bot token required by Slack Socket Mode.',
    summaryZh: '配置 Slack Socket Mode 所需的 App Token 和 Bot Token。',
    docsUrl: 'https://docs.openclaw.ai/channels/slack',
    commandMode: 'add',
    fields: [
      field('appToken', 'App token', 'App Token', 'xapp-...', '--app-token', true, true),
      field('botToken', 'Bot token', 'Bot Token', 'xoxb-...', '--bot-token', true, true),
    ],
    steps: ['Enable Socket Mode in your Slack app.', 'Paste both Slack tokens below.', 'Save the channel draft and complete Slack app permissions in the docs if needed.'],
    stepsZh: ['先在 Slack App 中开启 Socket Mode。', '把两个 Slack Token 填到下方。', '保存后，如有需要再按文档补齐权限设置。'],
  },
  {
    id: 'signal',
    name: 'Signal',
    nameZh: 'Signal',
    setupLabel: 'signal-cli',
    setupLabelZh: 'signal-cli',
    summary: 'Point OpenClaw at a signal-cli install or HTTP daemon and reuse the official Signal setup path.',
    summaryZh: '通过 signal-cli 或 HTTP daemon 接入 Signal，沿用官方配置方式。',
    docsUrl: 'https://docs.openclaw.ai/channels/signal',
    commandMode: 'add',
    fields: [
      field('cliPath', 'CLI path', 'CLI 路径', '/usr/local/bin/signal-cli', '--cli-path'),
      field('httpUrl', 'HTTP URL', 'HTTP URL', 'http://127.0.0.1:8080', '--http-url'),
      field('signalNumber', 'Signal number', 'Signal 号码', '+15551234567', '--signal-number'),
    ],
    steps: ['Install signal-cli or prepare its HTTP bridge.', 'Fill the available runtime details below.', 'Follow the docs for account linking and verification.'],
    stepsZh: ['先安装 signal-cli 或准备 HTTP bridge。', '把你已有的运行参数填到下方。', '再按文档完成账号绑定和验证。'],
  },
  {
    id: 'imessage',
    name: 'iMessage',
    nameZh: 'iMessage',
    setupLabel: 'imsg',
    setupLabelZh: 'imsg',
    summary: 'Use the macOS iMessage bridge with database and service hints stored in the draft.',
    summaryZh: '通过 macOS iMessage bridge 配置，并保存数据库路径与服务参数。',
    docsUrl: 'https://docs.openclaw.ai/channels/imessage',
    commandMode: 'add',
    fields: [
      field('cliPath', 'Bridge path', '桥接路径', '/usr/local/bin/imsg', '--cli-path'),
      field('dbPath', 'Messages DB path', '消息数据库路径', '~/Library/Messages/chat.db', '--db-path'),
      field('service', 'Service', '服务类型', 'imessage', '--service'),
      field('region', 'Region', '地区', 'CN', '--region'),
    ],
    steps: ['Install the iMessage bridge on macOS.', 'Provide the bridge and database paths.', 'Use the docs page if you need SMS fallback or account selection.'],
    stepsZh: ['先在 macOS 上安装 iMessage bridge。', '填写 bridge 路径和消息数据库路径。', '若需要 SMS 回退或账号选择，继续参考文档。'],
  },
  {
    id: 'feishu',
    name: 'Feishu / Lark',
    nameZh: '飞书 / Lark',
    setupLabel: 'Bot API',
    setupLabelZh: 'Bot API',
    summary: 'Feishu/Lark is part of the official channel set. ClawOne keeps the channel stub and links you to the official setup guide.',
    summaryZh: '飞书 / Lark 属于官方渠道列表。ClawOne 会保留有效渠道占位，并引导你进入官方配置指南。',
    docsUrl: 'https://docs.openclaw.ai/channels/feishu',
    commandMode: 'manual',
    fields: [],
    steps: ['Enable the channel in ClawOne.', 'Open the official docs page to finish app credentials and callbacks.', 'Save the draft so the channel is present in OpenClaw config.'],
    stepsZh: ['先在 ClawOne 里启用这个渠道。', '打开官方文档补齐应用凭证与回调。', '保存后该渠道会出现在 OpenClaw 配置中。'],
  },
  {
    id: 'nostr',
    name: 'Nostr',
    nameZh: 'Nostr',
    setupLabel: 'NIP-04 DMs',
    setupLabelZh: 'NIP-04 私信',
    summary: 'Nostr requires relay and key material setup outside the simplified ClawOne form.',
    summaryZh: 'Nostr 需要在简化表单之外完成 relay 与密钥材料配置。',
    docsUrl: 'https://docs.openclaw.ai/channels/nostr',
    commandMode: 'manual',
    fields: [],
    steps: ['Enable the channel stub here.', 'Use the docs page to configure relays and key material.', 'Return to Dashboard after the official setup is complete.'],
    stepsZh: ['先在这里启用渠道占位。', '再按官方文档配置 relay 与密钥材料。', '完成后回到 Dashboard 即可。'],
  },
  {
    id: 'msteams',
    name: 'Microsoft Teams',
    nameZh: 'Microsoft Teams',
    setupLabel: 'Bot Framework',
    setupLabelZh: 'Bot Framework',
    summary: 'Microsoft Teams is extension-backed in OpenClaw. ClawOne keeps the channel visible and points you at the official plugin path.',
    summaryZh: 'Microsoft Teams 在 OpenClaw 中由扩展实现。ClawOne 会保留该渠道，并指向官方插件路径。',
    docsUrl: 'https://docs.openclaw.ai/channels/msteams',
    commandMode: 'plugin',
    fields: [],
    steps: ['Enable the Teams channel stub here.', 'Install the official Teams extension/plugin as documented.', 'Finish Bot Framework credentials in the docs page.'],
    stepsZh: ['先启用 Teams 渠道占位。', '按文档安装官方 Teams 扩展或插件。', '随后在文档页完成 Bot Framework 凭证配置。'],
  },
  {
    id: 'mattermost',
    name: 'Mattermost',
    nameZh: 'Mattermost',
    setupLabel: 'Plugin',
    setupLabelZh: '插件',
    summary: 'Mattermost uses the official plugin path and a valid channel stub in OpenClaw config.',
    summaryZh: 'Mattermost 通过官方插件路径接入，并在 OpenClaw 配置中保留有效渠道占位。',
    docsUrl: 'https://docs.openclaw.ai/channels/mattermost',
    commandMode: 'plugin',
    fields: [],
    steps: ['Enable the Mattermost channel.', 'Install the official Mattermost integration/plugin.', 'Use the docs page to finish server-specific credentials.'],
    stepsZh: ['先启用 Mattermost 渠道。', '安装官方 Mattermost 集成或插件。', '然后按文档补齐服务端凭证。'],
  },
  {
    id: 'nextcloud-talk',
    name: 'Nextcloud Talk',
    nameZh: 'Nextcloud Talk',
    setupLabel: 'Self-hosted',
    setupLabelZh: '自托管',
    summary: 'Nextcloud Talk stays in the official channel list and needs self-hosted endpoint details from the docs.',
    summaryZh: 'Nextcloud Talk 在官方渠道列表中，需要按文档配置自托管地址与凭证。',
    docsUrl: 'https://docs.openclaw.ai/channels/nextcloud-talk',
    commandMode: 'manual',
    fields: [],
    steps: ['Enable the channel stub in ClawOne.', 'Open the docs page for server URL and auth details.', 'Return here to keep tracking it in the setup flow.'],
    stepsZh: ['先在 ClawOne 里启用渠道占位。', '打开文档补齐服务器地址和认证信息。', '然后回到这里继续完成整体设置。'],
  },
  {
    id: 'matrix',
    name: 'Matrix',
    nameZh: 'Matrix',
    setupLabel: 'Plugin',
    setupLabelZh: '插件',
    summary: 'Matrix supports credential-based setup through the official add flow when you already have homeserver details.',
    summaryZh: '如果你已经有 homeserver 信息，Matrix 可以通过官方 add 流程直接配置。',
    docsUrl: 'https://docs.openclaw.ai/channels/matrix',
    commandMode: 'add',
    fields: [
      field('homeserver', 'Homeserver URL', 'Homeserver URL', 'https://matrix.example.com', '--homeserver'),
      field('userId', 'User ID', '用户 ID', '@clawone:example.com', '--user-id'),
      field('accessToken', 'Access token', 'Access Token', 'syt_...', '--access-token', false, true),
      field('password', 'Password', '密码', 'optional if no access token', '--password', false, true),
      field('deviceName', 'Device name', '设备名', 'ClawOne', '--device-name'),
    ],
    steps: ['Provide your Matrix homeserver and account identity.', 'Use either an access token or password.', 'Save the draft to generate the matching channel add command.'],
    stepsZh: ['填写 Matrix homeserver 和账号信息。', '可使用 access token 或 password。', '保存草稿后生成对应的 channel add 命令。'],
  },
  {
    id: 'bluebubbles',
    name: 'BlueBubbles',
    nameZh: 'BlueBubbles',
    setupLabel: 'macOS app',
    setupLabelZh: 'macOS 应用',
    summary: 'BlueBubbles relies on its macOS bridge and webhook path details.',
    summaryZh: 'BlueBubbles 依赖其 macOS bridge 和 webhook path 细节。',
    docsUrl: 'https://docs.openclaw.ai/channels/bluebubbles',
    commandMode: 'add',
    fields: [field('webhookPath', 'Webhook path', 'Webhook 路径', '/bluebubbles/webhook', '--webhook-path')],
    steps: ['Install and pair the BlueBubbles app first.', 'Store the webhook path in this draft.', 'Use the docs page if you need the full bridge setup.'],
    stepsZh: ['先安装并绑定 BlueBubbles 应用。', '把 webhook path 记录在这里。', '若需完整 bridge 配置，继续参考官方文档。'],
  },
  {
    id: 'line',
    name: 'LINE',
    nameZh: 'LINE',
    setupLabel: 'Messaging API',
    setupLabelZh: 'Messaging API',
    summary: 'LINE is supported in the official catalog and currently needs its Messaging API setup completed via the docs.',
    summaryZh: 'LINE 位于官方渠道目录中，目前仍需按文档完成 Messaging API 设置。',
    docsUrl: 'https://docs.openclaw.ai/channels/line',
    commandMode: 'manual',
    fields: [],
    steps: ['Enable the channel in ClawOne.', 'Complete LINE Messaging API setup from the official docs.', 'Save the channel stub so ClawOne keeps it in sync.'],
    stepsZh: ['先在 ClawOne 启用 LINE。', '按官方文档完成 LINE Messaging API 配置。', '保存后该渠道会保留在同步配置中。'],
  },
  {
    id: 'zalo',
    name: 'Zalo',
    nameZh: 'Zalo',
    setupLabel: 'Bot API',
    setupLabelZh: 'Bot API',
    summary: 'Zalo Bot API stays in the official channel list and can be tracked through this expanded setup flow.',
    summaryZh: 'Zalo Bot API 属于官方渠道列表，可以通过当前扩展后的向导进行跟踪。',
    docsUrl: 'https://docs.openclaw.ai/channels/zalo',
    commandMode: 'manual',
    fields: [],
    steps: ['Enable the Zalo channel.', 'Open the official docs to finish bot credentials and callbacks.', 'Keep the channel stub enabled so OpenClaw config remains valid.'],
    stepsZh: ['先启用 Zalo 渠道。', '打开官方文档补齐机器人凭证与回调。', '保持渠道占位启用，确保 OpenClaw 配置有效。'],
  },
  {
    id: 'zalouser',
    name: 'Zalo Personal',
    nameZh: 'Zalo 个人号',
    setupLabel: 'Personal Account',
    setupLabelZh: '个人账号',
    summary: 'Zalo Personal is tracked separately from the Bot API channel in the official docs.',
    summaryZh: 'Zalo Personal 在官方文档中独立于 Bot API 渠道。',
    docsUrl: 'https://docs.openclaw.ai/channels/zalouser',
    commandMode: 'plugin',
    fields: [],
    steps: ['Enable the personal-account channel.', 'Follow the official plugin or unofficial setup path from the docs.', 'Save the channel stub so ClawOne preserves the selection.'],
    stepsZh: ['先启用个人号渠道。', '按官方文档中的插件或非官方流程继续配置。', '保存后 ClawOne 会保留该选择。'],
  },
  {
    id: 'synology-chat',
    name: 'Synology Chat',
    nameZh: 'Synology Chat',
    setupLabel: 'Webhook',
    setupLabelZh: 'Webhook',
    summary: 'Synology Chat is plugin-backed and documented as a webhook-style channel.',
    summaryZh: 'Synology Chat 通过插件接入，官方文档采用 webhook 风格配置。',
    docsUrl: 'https://docs.openclaw.ai/channels/synology-chat',
    commandMode: 'plugin',
    fields: [],
    steps: ['Enable the Synology Chat channel.', 'Open the docs to install the required plugin and webhook settings.', 'Save the channel stub so the config remains aligned.'],
    stepsZh: ['先启用 Synology Chat 渠道。', '打开文档安装所需插件并填写 webhook 设置。', '保存后配置会保持一致。'],
  },
  {
    id: 'tlon',
    name: 'Tlon',
    nameZh: 'Tlon',
    setupLabel: 'Urbit',
    setupLabelZh: 'Urbit',
    summary: 'Tlon uses ship-specific information and can already map into the official channel add command.',
    summaryZh: 'Tlon 依赖 ship 相关参数，并且已经可以映射到官方 channel add 命令。',
    docsUrl: 'https://docs.openclaw.ai/channels/tlon',
    commandMode: 'add',
    fields: [
      field('ship', 'Ship', 'Ship', '~sample-palnet', '--ship'),
      field('url', 'Ship URL', 'Ship URL', 'https://tlon.example.com', '--url'),
      field('code', 'Login code', '登录码', 'xxxx-xxxx', '--code', false, true),
    ],
    steps: ['Fill in the Urbit ship information you already have.', 'Save the draft to generate the official add command.', 'Use the docs if you need auto-discovery or channel mapping options.'],
    stepsZh: ['填写你已有的 Urbit ship 信息。', '保存草稿后生成官方 add 命令。', '如果还需要自动发现或频道映射，继续查看文档。'],
  },
];

export const CHANNEL_LOOKUP = Object.fromEntries(
  CHANNEL_CATALOG.map((channel) => [channel.id, channel])
) as Record<string, ChannelDefinition>;

export const getChannelName = (channelId: string, language: string) => {
  const channel = CHANNEL_LOOKUP[channelId];
  if (!channel) return channelId;
  return language.startsWith('zh') ? channel.nameZh : channel.name;
};

export const normalizeChannelDrafts = (channels?: Record<string, ChannelDraft | boolean | undefined>) => {
  const drafts: ChannelDraftMap = {};
  for (const channel of CHANNEL_CATALOG) {
    const current = channels?.[channel.id];
    if (typeof current === 'boolean') {
      drafts[channel.id] = { enabled: current, values: {} };
      continue;
    }

    drafts[channel.id] = {
      enabled: Boolean(current?.enabled),
      values: current?.values || {},
    };
  }
  return drafts;
};

export const getEnabledChannels = (channels?: ChannelDraftMap): string[] => {
  const drafts = normalizeChannelDrafts(channels);
  return Object.entries(drafts)
    .filter(([, draft]) => draft.enabled)
    .map(([channelId]) => channelId);
};

export const buildChannelCommand = (channel: ChannelDefinition, draft: ChannelDraft | undefined) => {
  const currentDraft = draft || { enabled: false, values: {} };

  if (channel.commandMode === 'login') {
    return `openclaw channels login --channel ${channel.id}`;
  }

  if (channel.commandMode !== 'add') {
    return `openclaw docs "${channel.name}"`;
  }

  const args = ['openclaw', 'channels', 'add', '--channel', channel.id];
  for (const fieldDef of channel.fields) {
    const value = currentDraft.values[fieldDef.id];
    if (!fieldDef.cliFlag || !value?.trim()) continue;
    args.push(fieldDef.cliFlag, value.trim());
  }
  return args.join(' ');
};
