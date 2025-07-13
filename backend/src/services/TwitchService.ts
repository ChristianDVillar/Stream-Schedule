import axios from 'axios';
import { BaseOAuthService } from './BaseOAuthService';

export class TwitchService extends BaseOAuthService {
  protected constructor() {
    super('twitch');
  }

  protected getAuthEndpoint(): string {
    return 'id.twitch.tv/oauth2/authorize';
  }

  public async getAccessToken(code: string): Promise<any> {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    return response.data;
  }

  public async getUserInfo(accessToken: string): Promise<any> {
    const response = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
      },
    });

    return response.data.data[0];
  }

  public async refreshToken(refreshToken: string): Promise<any> {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    return response.data;
  }

  public async createStream(title: string, category: string, tags: string[]): Promise<any> {
    // Implementation for creating Twitch stream
    console.log('Creating Twitch stream:', { title, category, tags });
    return { success: true };
  }

  public async updateStream(streamId: string, updates: any): Promise<any> {
    // Implementation for updating Twitch stream
    console.log('Updating Twitch stream:', { streamId, updates });
    return { success: true };
  }

  public async getStreamInfo(streamId: string): Promise<any> {
    // Implementation for getting Twitch stream info
    console.log('Getting Twitch stream info:', streamId);
    return { success: true };
  }
} 