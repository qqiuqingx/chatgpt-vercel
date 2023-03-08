
export class Singleton {
  private static instance: Singleton;
  private static lock: boolean = false;
  private static cache: Map<String,number>

  private constructor() {
    console.log("创建Singleton.cache")
    Singleton.cache=new Map<string, number>();
  }

  public static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.lock = true;
      Singleton.instance = new Singleton();
      Singleton.lock = false;
    }
    return Singleton.instance;
  }
  public get(key: string): number {
    const value = Singleton.cache.get(key);
    if (typeof value === "number") {
      return value;
    } else {
      return 0;
    }
  }
  public getAll( ):  Map<String,number>
  {
    return Singleton.cache
  }
  public clean(){
    Singleton.cache.clear();
  }
  public set(key: string, value: number): void {
    Singleton.cache.set(key, value);
  }
  public addNum(key: string): boolean {
    console.log("进入addNum")
    if ( Singleton.cache.has(key)) {
      var num =  Singleton.cache.get(key);
      if (num < 5) {
        num=num+1;
        this.set(key, num);
        return true;
      }
    } else {
      this.set(key, 1);
      return true;
    }
    return false;
  }
}
