import { open, TimeUtil } from "rosbag";
import lz4 from "lz4js";

interface Time {
  sec: number;
  nsec: number;
}

interface ControlMessage {
  isPlaying: boolean;
  currentTimeS: number;
}

export interface BagpiperOptions {
  /**
   * Preserves message history when seeking by sending all messages before the specified point.
   * This will have a significant performance impact if enabled for long bag files
   */
  historicalSeek: boolean;
  /** Logs debug messages to console */
  debugMode: boolean;
}

export default class Bagpiper {
  private readonly PLAYBACK_TICK_MS = 100; // ROS clock topic sends every 10ms. Must be less than 1000 ms
  private options: BagpiperOptions = {
    historicalSeek: false,
    debugMode: false
  };
  private lastTickMs = 0;
  private _currentTime: Time = { sec: 0, nsec: 0 };
  private _isPlaying = false;
  private nextSubId = 0; // TODO: use generator
  private intervalId?: number;
  private _startTime?: Time;
  private _endTime?: Time;
  private controlCallback?: (msg: ControlMessage) => void;

  // key = ros topic
  private messageStore: Record<
    string,
    { messages: any[]; readIndex: number }
  > = {};
  // key = ros topic
  private topicCallbacksMap = new Map<string, Array<(msg?: any) => void>>();
  private callbackTopicMap = new Map<(msg?: any) => void, string>();

  constructor(options?: Partial<BagpiperOptions>) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
    // start playback interval
    this.intervalId = window.setInterval(this.tick, this.PLAYBACK_TICK_MS);
  }

  private getSubId(): number {
    return this.nextSubId++;
  }

  private tick = (): void => {
    const now = Date.now();
    const tickTimeDeltaNs = Math.abs(now - this.lastTickMs) * 1e6;
    this.lastTickMs = now;
    if (!this._isPlaying) {
      return;
    }

    this._currentTime.nsec += tickTimeDeltaNs;
    if (this._currentTime.nsec > 1e9) {
      this._currentTime.sec++;
      this._currentTime.nsec -= 1e9;
      this.sendControlMessage();
    }
    if (this.options.debugMode) {
      console.log(
        `tick bagtime ${JSON.stringify(
          TimeUtil.add(this._currentTime, this._startTime)
        )}`
      );
    }
    // Check if the end of the bagfile is reached
    if (
      TimeUtil.isGreaterThan(
        TimeUtil.add(this._currentTime, this._startTime),
        this._endTime
      )
    ) {
      this.stop();
    }
    // publish all messages in this tick
    for (const [topic, callbacks] of this.topicCallbacksMap) {
      if (!(topic in this.messageStore)) {
        return;
      }
      const { messages, readIndex } = this.messageStore[topic];
      let i = readIndex;
      while (
        i < messages.length &&
        TimeUtil.isLessThan(
          messages[i].header.stamp,
          TimeUtil.add(this._startTime, this._currentTime)
        )
      ) {
        for (const c of callbacks) {
          if (this.options.debugMode) {
            console.log(
              `${topic} sending message # ${i} from s: ${JSON.stringify(
                messages[i].header.stamp
              )}`
            );
          }
          c(messages[i]);
        }
        i++;
      }
      this.messageStore[topic].readIndex = i;
    }
  };

  private sendControlMessage() {
    if (this.controlCallback) {
      this.controlCallback({
        isPlaying: this.isPlaying,
        currentTimeS: this.currentTime.sec
      });
    }
  }

  private getReadIndexFor(topic: string, seconds: number): number {
    if (!(topic in this.messageStore)) {
      throw new Error(
        "get read index for topic messages called on a topic that is not stored!"
      );
    }
    const messages = this.messageStore[topic].messages;
    let i = 0;
    while (
      i < messages.length &&
      TimeUtil.isLessThan((messages[i] as any).header.stamp, {
        sec: seconds,
        nsec: 0
      })
    ) {
      i++;
    }
    return i;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get currentTime(): Time {
    return this._currentTime;
  }

  get startTime(): Time {
    return this._startTime || { sec: 0, nsec: 0 };
  }

  get endTime(): Time {
    return this._endTime || { sec: 0, nsec: 0 };
  }

  /**
   * stop playback
   */
  public stop(): void {
    this._currentTime = { sec: 0, nsec: 0 };
    if (this._isPlaying) {
      this.togglePlay();
    }
    for (const c of this.callbackTopicMap.keys()) {
      c();
    }
    for (const item of Object.values(this.messageStore)) {
      item.readIndex = 0;
    }
  }

  /**
   * gets first message of a topic
   * Retrieved topic messages as used to scrape for schema
   */
  public getFirstTopicMessage(topic: string): any {
    if (
      !(topic in this.messageStore) ||
      this.messageStore[topic].messages.length === 0
    ) {
      throw new Error(
        "this topic does not exist on the player or its message store is empty."
      );
    }
    return this.messageStore[topic].messages[0];
  }

  /**
   * cleanup class registered listeners before destruction
   */
  public cleanup(): void {
    window.clearInterval(this.intervalId);
  }

  /**
   * Set options for Bagpiper
   */
  public setOptions(options: Partial<BagpiperOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get options for Bagpiper
   */
  public getOptions(): BagpiperOptions {
    return this.options;
  }

  /**
   * getDuration
   */
  public getDuration(): number {
    return this._startTime && this._endTime
      ? this._endTime.sec - this._startTime.sec
      : 0;
  }

  /**
   * is ready for playback
   */
  public isReady(): boolean {
    return Object.keys(this.messageStore).length > 0;
  }

  /**
   * open ROS bag file
   * @param file
   * @returns map of topic -> topic-type
   */
  public async open(file: File): Promise<Record<string, string>> {
    this.stop();
    this.messageStore = {};
    const topicTypeMap: Record<string, string> = {};
    const bag = await open(file);
    this._startTime = bag.startTime;
    this._currentTime = { sec: 0, nsec: 0 };
    this._endTime = bag.endTime;
    if (this.options.debugMode) {
      console.log(
        `start/end ${JSON.stringify(this._startTime)} / ${JSON.stringify(
          this._endTime
        )}`
      );
    }
    for (const c of Object.values(bag.connections as Record<number, any>)) {
      topicTypeMap[c.topic] = c.type;
    }
    await bag.readMessages(
      {
        decompress: {
          lz4: (buffer: Buffer) => new Buffer(lz4.decompress(buffer))
        }
      },
      (result: any) => {
        const { topic, message } = result;
        if (!(topic in this.messageStore)) {
          this.messageStore[topic] = { messages: [], readIndex: 0 };
        }
        this.messageStore[topic].messages.push(message);
      }
    );

    this.togglePlay();

    return topicTypeMap;
  }
  /**
   * toggle play/pause state
   */
  public togglePlay = (): void => {
    // prevent playback without a loaded file
    if (!this.isReady() && !this._isPlaying) {
      return;
    }
    this._isPlaying = !this._isPlaying;
    this.lastTickMs = Date.now();
    this.sendControlMessage();
  };

  /**
   * subscribe to the player's control messages (only one subscription at a time)
   */
  public subscribeControl(callback: (msg: ControlMessage) => void) {
    this.controlCallback = callback;
  }

  /**
   * unsubscribe to the player's control messages
   */
  public unSubscribeControl() {
    this.controlCallback = undefined;
  }

  /**
   * seek to a specific time
   * @param sec
   */
  public seek = (sec: number): void => {
    this._currentTime.sec = sec;
    this.sendControlMessage();
    for (const [callback, topic] of this.callbackTopicMap.entries()) {
      this.messageStore[topic].readIndex = this.options.historicalSeek
        ? 0
        : this.getReadIndexFor(topic, this.startTime.sec + sec);
      callback();
    }
  };

  /**
   * subscribe to a topic
   * @param topic
   */
  public subscribe(topic: string, callback: (msg?: any) => void): number {
    const id = this.getSubId();
    this.callbackTopicMap.set(callback, topic);
    const callbacks = this.topicCallbacksMap.get(topic);
    if (callbacks) {
      callbacks.push(callback);
    } else {
      this.topicCallbacksMap.set(topic, [callback]);
    }

    return id;
  }

  /**
   * unSubscribe from player
   * @param id subscription ID
   */
  public unSubscribe(targetCallback: (msg?: any) => void): void {
    const topic = this.callbackTopicMap.get(targetCallback);
    if (!topic || !this.topicCallbacksMap.has(topic)) {
      throw new Error(
        "The provided callback is not registered in callbackTopicMap or topicCallbacksMap is missing the registered topic!"
      );
    }
    const callbacks = this.topicCallbacksMap.get(topic) || [];
    for (let i = 0; i < callbacks.length; i++) {
      const c = callbacks[i];
      if (c === targetCallback) {
        callbacks.splice(i, 1);
      }
      if (callbacks.length === 0) {
        this.topicCallbacksMap.delete(topic);
      }
    }
    this.callbackTopicMap.delete(targetCallback);
  }
}
