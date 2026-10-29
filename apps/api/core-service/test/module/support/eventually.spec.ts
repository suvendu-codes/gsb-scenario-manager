import { afterEach, describe, expect, it, vi } from 'vitest';
import kafkaJs from 'kafkajs';
import { eventually, isTransientCoordinatorError } from './eventually.js';

const { KafkaJSProtocolError } = kafkaJs;

function protocolError(code: number) {
  return new KafkaJSProtocolError(Object.assign(new Error(`Protocol error ${code}`), { code, type: 'TEST', retriable: true }));
}
afterEach(() => vi.useRealTimers());
describe('bounded Kafka offset observation', () => {
  it.each([14, 15, 16])('retries temporary coordinator error %s until offsets are readable', async code => {
    vi.useFakeTimers();
    const check = vi.fn().mockRejectedValueOnce(protocolError(code)).mockResolvedValueOnce(false).mockResolvedValue(true);
    const pending = eventually(check, 'observe offset', { retryOnError: isTransientCoordinatorError });
    await vi.advanceTimersByTimeAsync(200); await pending;
    expect(check).toHaveBeenCalledTimes(3);
  });
  it.each([new Error('assertion failed'), protocolError(29), protocolError(30), protocolError(13)])(
    'does not mask permanent or unrelated failures: %s', async error => {
      const check = vi.fn().mockRejectedValue(error);
      await expect(eventually(check, 'observe offset', { retryOnError: isTransientCoordinatorError })).rejects.toBe(error);
      expect(check).toHaveBeenCalledOnce();
    });
  it('preserves the deadline and last cause when the coordinator never recovers', async () => {
    vi.useFakeTimers(); const error = protocolError(16); const check = vi.fn().mockRejectedValue(error);
    const pending = eventually(check, 'coordinator must recover', { timeoutMs: 250, intervalMs: 100, retryOnError: isTransientCoordinatorError });
    const assertion = expect(pending).rejects.toMatchObject({ message: 'Timed out: coordinator must recover', cause: error });
    await vi.advanceTimersByTimeAsync(250); await assertion;
    expect(check).toHaveBeenCalledTimes(3);
  });
  it('does not retry exceptions unless the caller explicitly permits it', async () => {
    const error = protocolError(16);
    await expect(eventually(async () => { throw error; }, 'assertion')).rejects.toBe(error);
  });
});
