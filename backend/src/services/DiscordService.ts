import axios from 'axios';
import { BaseOAuthService } from './BaseOAuthService';

export class DiscordService extends BaseOAuthService {
  protected constructor() {
    super('discord');
  }

  protected getAuthEndpoint(): string {
    return 'discord.com/api/oauth2/authorize';
  }

  public async getAccessToken(code: string): Promise<any> {
    const response = await axios.post('https://discord.com/api/oauth2/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    return response.data;
  }

  public async getUserInfo(accessToken: string): Promise<any> {
    const response = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  public async refreshToken(refreshToken: string): Promise<any> {
    const response = await axios.post('https://discord.com/api/oauth2/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    return response.data;
  }

  public async sendChannelMessage(channelId: string, message: string): Promise<any> {
    // Implementation for sending Discord message
    console.log('Sending Discord message:', { channelId, message });
    return { success: true };
  }

  public async createGuildEvent(channelId: string, eventData: any): Promise<any> {
    // Implementation for creating Discord event
    console.log('Creating Discord event:', { channelId, eventData });
    return { success: true };
  }

  public async uploadFile(
    channelId: string,
    file: Buffer,
    filename: string,
    content?: string
  ): Promise<any> {
    // Implementation for uploading file to Discord
    console.log('Uploading file to Discord:', { channelId, filename, content });
    return { success: true };
  }

  public async getGuilds(accessToken: string): Promise<any> {
    const response = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  public async getChannels(guildId: string, accessToken: string): Promise<any> {
    const response = await axios.get(`https://discord.com/api/guilds/${guildId}/channels`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }
} 