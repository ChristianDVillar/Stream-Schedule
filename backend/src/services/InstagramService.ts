import axios from 'axios';
import { BaseOAuthService } from './BaseOAuthService';

export class InstagramService extends BaseOAuthService {
  protected constructor() {
    super('instagram');
  }

  protected getAuthEndpoint(): string {
    return 'api.instagram.com/oauth/authorize';
  }

  public async getAccessToken(code: string): Promise<any> {
    const response = await axios.post('https://api.instagram.com/oauth/access_token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    });

    return response.data;
  }

  public async getUserInfo(accessToken: string): Promise<any> {
    const response = await axios.get('https://graph.instagram.com/me', {
      params: {
        fields: 'id,username,account_type',
        access_token: accessToken,
      },
    });

    return response.data;
  }

  public async refreshToken(refreshToken: string): Promise<any> {
    const response = await axios.post('https://graph.instagram.com/refresh_access_token', {
      grant_type: 'ig_refresh_token',
      access_token: refreshToken,
    });

    return response.data;
  }

  public async createPost(caption: string, mediaUrl: string): Promise<any> {
    // Implementation for creating Instagram post
    console.log('Creating Instagram post:', { caption, mediaUrl });
    return { success: true };
  }

  public async createStory(mediaUrl: string, stickers?: any[]): Promise<any> {
    // Implementation for creating Instagram story
    console.log('Creating Instagram story:', { mediaUrl, stickers });
    return { success: true };
  }

  public async createReel(videoUrl: string, caption: string): Promise<any> {
    // Implementation for creating Instagram reel
    console.log('Creating Instagram reel:', { videoUrl, caption });
    return { success: true };
  }

  public async uploadMedia(file: Buffer, mediaType: 'IMAGE' | 'VIDEO'): Promise<any> {
    // Implementation for uploading media to Instagram
    console.log('Uploading media to Instagram:', { mediaType, size: file.length });
    return { mediaId: 'mock-media-id' };
  }
} 