import { BaseService } from './BaseService';
import { config } from '../config/config';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export abstract class BaseOAuthService extends BaseService {
  protected clientId: string;
  protected clientSecret: string;
  protected redirectUri: string;
  protected scopes: string[];
  
  protected constructor(platform: keyof typeof config) {
    super();
    const platformConfig = config[platform] as OAuthConfig;
    this.clientId = platformConfig.clientId;
    this.clientSecret = platformConfig.clientSecret;
    this.redirectUri = platformConfig.redirectUri;
    this.scopes = platformConfig.scopes;
  }
  
  public getAuthUrl(): string {
    const scopes = this.scopes.join(' ');
    return `https://${this.getAuthEndpoint()}?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&response_type=code&scope=${scopes}`;
  }
  
  protected abstract getAuthEndpoint(): string;
  public abstract getAccessToken(code: string): Promise<any>;
  public abstract getUserInfo(accessToken: string): Promise<any>;
} 