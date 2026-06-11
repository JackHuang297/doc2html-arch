export type EventListener<T = any> = (data: T) => void;

export interface EventSubscription {
  unsubscribe(): void;
}

export class EventEmitter<TEvents extends Record<string, any> = Record<string, any>> {
  private listeners: Map<keyof TEvents, Set<EventListener>> = new Map();
  private onceListeners: Map<keyof TEvents, Set<EventListener>> = new Map();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return {
      unsubscribe: () => this.off(event, listener)
    };
  }

  /**
   * Subscribe to an event for only one emission.
   */
  once<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): EventSubscription {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(listener);
    return {
      unsubscribe: () => this.off(event, listener)
    };
  }

  /**
   * Unsubscribe a listener from an event.
   */
  off<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): void {
    this.listeners.get(event)?.delete(listener);
    this.onceListeners.get(event)?.delete(listener);
  }

  /**
   * Emit an event with data to all subscribers.
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    // Regular listeners
    const regular = this.listeners.get(event);
    if (regular) {
      for (const listener of regular) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[EventEmitter] Error in listener for "${String(event)}":`, err);
        }
      }
    }

    // Once listeners
    const once = this.onceListeners.get(event);
    if (once) {
      this.onceListeners.set(event, new Set());
      for (const listener of once) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[EventEmitter] Error in once listener for "${String(event)}":`, err);
        }
      }
    }
  }

  /**
   * Remove all listeners for an event (or all events if no event specified).
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event.
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return (this.listeners.get(event)?.size ?? 0) + (this.onceListeners.get(event)?.size ?? 0);
  }
}