declare module 'passport-twitch' {
  import { Strategy as PassportStrategy } from 'passport';
  import { Request } from 'express';

  export interface Profile {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    _raw: string;
    _json: {
      id: string;
      login: string;
      display_name: string;
      email?: string;
      profile_image_url: string;
      offline_image_url: string;
      view_count: number;
      broadcaster_type: string;
      type: string;
      created_at: string;
    };
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string | string[];
  }

  export interface StrategyOptionsWithRequest extends StrategyOptions {
    passReqToCallback: true;
  }

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void
  ) => void;

  export type VerifyFunctionWithRequest = (
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: VerifyFunction
    );
    constructor(
      options: StrategyOptionsWithRequest,
      verify: VerifyFunctionWithRequest
    );
  }
} 