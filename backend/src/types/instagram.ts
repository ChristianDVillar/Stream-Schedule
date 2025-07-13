export interface InstagramUser {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username: string;
}

export interface InstagramTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface InstagramMediaContainer {
  id: string;
  status_code: string;
  status: string;
}

export interface InstagramPublishingResponse {
  id: string;
  status_code: string;
  status: string;
}

export interface InstagramError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
} 