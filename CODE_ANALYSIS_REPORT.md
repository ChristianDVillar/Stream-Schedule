# Code Analysis Report - Streamer Scheduler

## 🔍 Analysis Summary

This report identifies unused dependencies, duplicate code patterns, and areas for improvement in the Streamer Scheduler codebase.

## 📦 Unused Dependencies

### Backend - Unused Dependencies
The following dependencies are installed but not used in the codebase:

1. **`node-forge`** - Not imported or used anywhere
2. **`pg`** - PostgreSQL driver, not used (using MongoDB instead)
3. **`sqlite3`** - SQLite driver, not used
4. **`express-session`** - Imported but not actively used (JWT is used instead)

### Backend - Missing Dependencies
The following dependencies are used but not installed:

1. **`axios`** - Used in multiple service files but not in package.json

### Frontend - Unused Dependencies
The following dependencies appear to be unused:

1. **`tailwindcss`** - Installed but not actively used (MUI is used instead)
2. **`autoprefixer`** - Installed but not used
3. **`postcss`** - Installed but not used
4. **`@testing-library/*`** - Testing libraries not used
5. **`web-vitals`** - Not used

## 🔄 Duplicate Code Patterns

### 1. Singleton Pattern Repetition
All service classes use the same singleton pattern:

```typescript
// Repeated in: TwitchService, TwitterService, InstagramService, DiscordService, TaskManager, SchedulerService, TokenEncryptionService, ContentService
private static instance: ServiceName;
public static getInstance(): ServiceName {
  if (!ServiceName.instance) {
    ServiceName.instance = new ServiceName();
  }
  return ServiceName.instance;
}
```

### 2. OAuth URL Generation
Similar OAuth URL generation patterns across services:

```typescript
// Repeated in: TwitchService, TwitterService, InstagramService, DiscordService
public getAuthUrl(): string {
  const scopes = config.platform.scopes.join(' ');
  return `https://platform.com/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&response_type=code&scope=${scopes}`;
}
```

### 3. Service Initialization
Repeated service initialization in multiple files:

```typescript
// Repeated in: TaskManager, SchedulerService, routes
this.twitchService = TwitchService.getInstance();
this.twitterService = TwitterService.getInstance();
this.instagramService = InstagramService.getInstance();
this.discordService = DiscordService.getInstance();
```

## 🗄️ Database Inconsistencies

### Mixed Database Usage
The codebase uses both Sequelize (PostgreSQL) and Mongoose (MongoDB):

1. **User Model**: Uses Sequelize (PostgreSQL)
2. **ScheduledContent Model**: Uses Mongoose (MongoDB)
3. **Content Model**: Uses Mongoose (MongoDB)

This creates inconsistency and potential issues.

## 🛠️ Recommended Actions

### 1. Remove Unused Dependencies

#### Backend Cleanup:
```bash
npm uninstall node-forge pg sqlite3 express-session
```

#### Frontend Cleanup:
```bash
npm uninstall tailwindcss autoprefixer postcss @testing-library/jest-dom @testing-library/react @testing-library/user-event web-vitals
```

### 2. Add Missing Dependencies

#### Backend:
```bash
npm install axios @types/axios
```

### 3. Create Base Classes to Reduce Duplication

#### Create Base Service Class:
```typescript
// src/services/BaseService.ts
export abstract class BaseService {
  protected static instance: any;
  
  public static getInstance<T>(): T {
    if (!this.instance) {
      this.instance = new this();
    }
    return this.instance;
  }
}
```

#### Create Base OAuth Service:
```typescript
// src/services/BaseOAuthService.ts
export abstract class BaseOAuthService extends BaseService {
  protected clientId: string;
  protected clientSecret: string;
  protected redirectUri: string;
  protected scopes: string[];
  
  protected constructor(platform: string) {
    super();
    this.clientId = config[platform].clientId;
    this.clientSecret = config[platform].clientSecret;
    this.redirectUri = config[platform].redirectUri;
    this.scopes = config[platform].scopes;
  }
  
  public getAuthUrl(): string {
    const scopes = this.scopes.join(' ');
    return `https://${this.getAuthEndpoint()}?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&response_type=code&scope=${scopes}`;
  }
  
  protected abstract getAuthEndpoint(): string;
  public abstract getAccessToken(code: string): Promise<any>;
}
```

### 4. Standardize Database Usage

#### Option A: Use MongoDB Only
- Convert User model to Mongoose
- Remove Sequelize dependencies
- Update all database operations

#### Option B: Use PostgreSQL Only
- Convert ScheduledContent to Sequelize
- Remove Mongoose dependencies
- Update all database operations

### 5. Create Service Factory

```typescript
// src/services/ServiceFactory.ts
export class ServiceFactory {
  private static services = new Map<string, any>();
  
  public static getService<T>(serviceClass: new () => T): T {
    const serviceName = serviceClass.name;
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, new serviceClass());
    }
    return this.services.get(serviceName);
  }
}
```

## 📊 Code Quality Metrics

### Duplication Analysis:
- **Singleton Pattern**: 8 instances (100% duplication)
- **OAuth URL Generation**: 4 instances (100% duplication)
- **Service Initialization**: 3 instances (100% duplication)

### Dependency Analysis:
- **Unused Dependencies**: 8 packages
- **Missing Dependencies**: 1 package
- **Total Dependencies**: 25 packages (32% unused)

## 🎯 Implementation Priority

### High Priority:
1. Add missing `axios` dependency
2. Remove unused `node-forge`, `pg`, `sqlite3`
3. Create base classes to reduce duplication
4. Standardize database usage

### Medium Priority:
1. Remove unused frontend dependencies
2. Implement service factory pattern
3. Add proper error handling patterns

### Low Priority:
1. Add comprehensive testing
2. Implement logging patterns
3. Add performance monitoring

## 📝 Next Steps

1. **Immediate**: Fix missing axios dependency
2. **Short-term**: Remove unused dependencies
3. **Medium-term**: Implement base classes and reduce duplication
4. **Long-term**: Standardize database usage and add comprehensive testing

## 🔧 Quick Fixes

### Add Missing Dependency:
```bash
cd backend
npm install axios @types/axios
```

### Remove Unused Dependencies:
```bash
cd backend
npm uninstall node-forge pg sqlite3 express-session

cd ../frontend
npm uninstall tailwindcss autoprefixer postcss @testing-library/jest-dom @testing-library/react @testing-library/user-event web-vitals
```

### Update Frontend Start Script:
```json
{
  "scripts": {
    "start": "react-scripts start",
    "dev": "react-scripts start"
  }
}
```

This will resolve the cross-env issue and simplify the startup process. 