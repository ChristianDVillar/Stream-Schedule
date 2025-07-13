export abstract class BaseService {
  protected static instance: any;
  
  protected constructor() {
    // Protected constructor to prevent direct instantiation
  }
  
  public static getInstance<T>(): T {
    if (!this.instance) {
      this.instance = new this();
    }
    return this.instance;
  }
} 