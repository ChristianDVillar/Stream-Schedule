export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string | null;
  accent_color?: number | null;
  locale?: string;
  verified?: boolean;
  email?: string | null;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

export interface DiscordGuildEvent {
  id: string;
  guild_id: string;
  channel_id: string | null;
  creator_id: string | null;
  name: string;
  description: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  privacy_level: number;
  status: number;
  entity_type: number;
  entity_id: string | null;
  entity_metadata: {
    location?: string;
  } | null;
  creator?: DiscordUser;
  user_count?: number;
  image?: string | null;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  tts: boolean;
  mention_everyone: boolean;
  mentions: DiscordUser[];
  mention_roles: string[];
  mention_channels?: any[];
  attachments: any[];
  embeds: any[];
  reactions?: any[];
  nonce?: string | number;
  pinned: boolean;
  webhook_id?: string;
  type: number;
  activity?: any;
  application?: any;
  application_id?: string;
  message_reference?: {
    message_id: string;
    channel_id: string;
    guild_id?: string;
  };
  flags?: number;
  referenced_message?: DiscordMessage | null;
  interaction?: any;
  thread?: any;
  components?: any[];
  sticker_items?: any[];
  position?: number;
  role_subscription_data?: any;
}

export interface DiscordTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface DiscordGuildEventCreateData {
  name: string;
  description?: string;
  scheduled_start_time: string;
  scheduled_end_time?: string;
  privacy_level?: number;
  channel_id?: string;
  entity_type?: number;
  entity_metadata?: {
    location?: string;
  };
}

export interface DiscordMessageCreateData {
  content?: string;
  tts?: boolean;
  embeds?: any[];
  allowed_mentions?: any;
  message_reference?: {
    message_id: string;
    channel_id: string;
    guild_id?: string;
  };
  components?: any[];
  sticker_ids?: string[];
  files?: any[];
  payload_json?: string;
  attachments?: any[];
  flags?: number;
}

export interface DiscordEmbed {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  thumbnail?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  video?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  provider?: {
    name?: string;
    url?: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
} 