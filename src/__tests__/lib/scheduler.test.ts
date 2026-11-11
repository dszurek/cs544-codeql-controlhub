vi.mock('node-schedule', () => ({
  scheduleJob: vi.fn(),
}));

describe('scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('registers sync + cortex cron jobs on first call', async () => {
    const { startScheduler } = await import('@/lib/scheduler');
    const schedule = await import('node-schedule');
    startScheduler();
    expect(schedule.scheduleJob).toHaveBeenCalledWith('*/10 * * * *', expect.any(Function)); // sync
    expect(schedule.scheduleJob).toHaveBeenCalledWith('* * * * *', expect.any(Function));    // cortex queue tick
    expect(schedule.scheduleJob).toHaveBeenCalledWith('0 7,19 * * *', expect.any(Function)); // briefing
    expect(schedule.scheduleJob).toHaveBeenCalledWith('30 8 * * *', expect.any(Function));   // health insight
    expect(schedule.scheduleJob).toHaveBeenCalledWith('0 18 * * 0', expect.any(Function));   // weekly review
  });

  it('is idempotent — second call registers nothing new', async () => {
    const { startScheduler } = await import('@/lib/scheduler');
    const schedule = await import('node-schedule');
    startScheduler();
    const callsAfterFirst = vi.mocked(schedule.scheduleJob).mock.calls.length;
    startScheduler();
    expect(schedule.scheduleJob).toHaveBeenCalledTimes(callsAfterFirst);
  });
});
