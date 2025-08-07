import { Injectable } from '@nestjs/common';

@Injectable()
export class BackgroundService {
  /**
   * Execute a function in the background without blocking the main thread
   * @param fn The function to execute
   * @param errorHandler Optional error handler
   */
  async executeInBackground<T>(
    fn: () => Promise<T>,
    errorHandler?: (error: Error) => void,
  ): Promise<void> {
    setImmediate(async () => {
      try {
        await fn();
      } catch (error) {
        if (errorHandler) {
          errorHandler(error as Error);
        } else {
          console.error(
            '[BackgroundService] Error in background execution:',
            error,
          );
        }
      }
    });
  }

  /**
   * Execute a function in the background with a delay
   * @param fn The function to execute
   * @param delayMs Delay in milliseconds
   * @param errorHandler Optional error handler
   */
  async executeInBackgroundWithDelay<T>(
    fn: () => Promise<T>,
    delayMs: number,
    errorHandler?: (error: Error) => void,
  ): Promise<void> {
    setTimeout(async () => {
      try {
        await fn();
      } catch (error) {
        if (errorHandler) {
          errorHandler(error as Error);
        } else {
          console.error(
            '[BackgroundService] Error in background execution:',
            error,
          );
        }
      }
    }, delayMs);
  }

  /**
   * Execute multiple functions in parallel in the background
   * @param fns Array of functions to execute
   * @param errorHandler Optional error handler
   */
  async executeMultipleInBackground<T>(
    fns: Array<() => Promise<T>>,
    errorHandler?: (error: Error) => void,
  ): Promise<void> {
    setImmediate(async () => {
      try {
        await Promise.all(fns.map((fn) => fn()));
      } catch (error) {
        if (errorHandler) {
          errorHandler(error as Error);
        } else {
          console.error(
            '[BackgroundService] Error in background execution:',
            error,
          );
        }
      }
    });
  }
}
