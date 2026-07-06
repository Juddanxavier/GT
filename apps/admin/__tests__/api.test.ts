import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, ApiError, setTenantFilter, clearTenantFilter, setBranchFilter, clearBranchFilter, fmtINR } from '@/lib/api';

beforeEach(() => {
  vi.restoreAllMocks();
  clearTenantFilter();
  clearBranchFilter();
});

describe('ApiError', () => {
  it('creates error with status and message', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('ApiError');
  });
});

describe('fmtINR', () => {
  it('formats numbers as INR currency', () => {
    expect(fmtINR(1000)).toContain('1,000');
    expect(fmtINR(0)).toContain('0');
    expect(fmtINR(100000)).toContain('1,00,000');
  });

  it('handles string input', () => {
    expect(fmtINR('50000')).toContain('50,000');
  });
});

describe('api.get', () => {
  it('sends credentials include', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    await api.get('/test');
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/test'), expect.objectContaining({ credentials: 'include' }));
  });

  it('sends X-Tenant-ID when filter is set', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });
    setTenantFilter('tenant-1');
    await api.get('/test');
    const opts = (fetch as any).mock.calls[0][1];
    expect(opts.headers['X-Tenant-ID']).toBe('tenant-1');
  });

  it('sends X-Branch-ID when branch filter is set', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });
    setBranchFilter('branch-1');
    await api.get('/test');
    const opts = (fetch as any).mock.calls[0][1];
    expect(opts.headers['X-Branch-ID']).toBe('branch-1');
  });

  it('throws ApiError on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({ error: 'Not found' }) });
    const err = await api.get('/test').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
  });

  it('throws ApiError with code on error response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, json: () => Promise.resolve({ code: 'VALIDATION_ERROR', error: 'Invalid input' }) });
    const err = await api.get('/test').catch((e) => e);
    expect(err.message).toContain('[VALIDATION_ERROR]');
  });

  it('handles non-JSON error response gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.reject(new Error('invalid json')) });
    const err = await api.get('/test').catch((e) => e);
    expect(err.message).toBe('Request failed (500)');
  });

  it('retries on network error then succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'ok' }) });
    global.fetch = fn;
    const result = await api.get<string>('/test');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up after retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    global.fetch = fn;
    const err = await api.get('/test').catch((e) => e);
    expect(err).toBeInstanceOf(TypeError);
    expect(fn).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  it('auto-clears branch filter on Branch not found', async () => {
    setBranchFilter('dead-branch');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({ error: 'Branch not found' }) });
    await api.get('/test').catch(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });
    await api.get('/test2');
    expect((fetch as any).mock.calls[0][1].headers['X-Branch-ID']).toBeUndefined();
  });

  it('does not clear tenant filter on Branch not found', async () => {
    setTenantFilter('t1');
    setBranchFilter('dead-branch');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({ error: 'Branch not found' }) });
    await api.get('/test').catch(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });
    await api.get('/test2');
    expect((fetch as any).mock.calls[0][1].headers['X-Tenant-ID']).toBe('t1');
  });
});

describe('api.post', () => {
  it('sends POST with JSON body', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: { id: '1' } }) });
    await api.post('/test', { name: 'foo' });
    const opts = (fetch as any).mock.calls[0][1];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(JSON.stringify({ name: 'foo' }));
  });

  it('sends POST without body', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: {} }) });
    await api.post('/test');
    const opts = (fetch as any).mock.calls[0][1];
    expect(opts.body).toBeUndefined();
  });
});

describe('api.patch', () => {
  it('sends PATCH with JSON body', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: {} }) });
    await api.patch('/test/1', { name: 'bar' });
    const opts = (fetch as any).mock.calls[0][1];
    expect(opts.method).toBe('PATCH');
    expect(opts.body).toBe(JSON.stringify({ name: 'bar' }));
  });
});

describe('api.delete', () => {
  it('sends DELETE', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: {} }) });
    await api.delete('/test/1');
    const opts = (fetch as any).mock.calls[0][1];
    expect(opts.method).toBe('DELETE');
  });
});

describe('api.getFull', () => {
  it('returns full response with pagination', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: '1' }], total: 1, page: 1, limit: 10 }),
    });
    const result = await api.getFull<{ id: string }[]>('/test?page=1');
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('1');
  });
});
