import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getAuthSession } from './authApi';

type State<T> = { data: T | undefined; loading: boolean; error: string; version: number };
type Entry = { state: State<unknown>; listeners: Set<() => void>; load?: () => Promise<unknown>; generation: number; updatedAt: number };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const REFRESH_MS = 15000;
const CHANGE_KEY = 'wareflow.data.changed';
let statusSnapshot = { loading: false, errors: [] as string[] };
function emitStatus() {
    const active = [...cache.entries()].filter(([key, entry]) => !key.endsWith(':disabled') && entry.listeners.size);
    statusSnapshot = { loading: active.some(([, e]) => e.state.loading && e.state.data === undefined), errors: [...new Set(active.map(([, e]) => e.state.error).filter(Boolean))] };
    listeners.forEach(fn => fn());
}
function emit(entry: Entry) { entry.listeners.forEach(fn => fn()); emitStatus(); }
function entryFor(key: string): Entry {
    if (!cache.has(key)) cache.set(key, { state: { data: undefined, loading: false, error: '', version: 0 }, listeners: new Set(), generation: 0, updatedAt: 0 });
    return cache.get(key)!;
}
function fetchEntry(entry: Entry) {
    if (!entry.load || entry.state.loading) return;
    const generation = ++entry.generation;
    entry.state = { ...entry.state, loading: true, error: '' }; emit(entry);
    Promise.resolve().then(entry.load).then(data => {
        if (generation !== entry.generation) return;
        entry.updatedAt = Date.now();
        entry.state = { data, loading: false, error: '', version: entry.state.version + 1 }; emit(entry);
    }, error => {
        if (generation !== entry.generation) return;
        entry.state = { ...entry.state, loading: false, error: error instanceof Error ? error.message : 'Không tải được dữ liệu.', version: entry.state.version + 1 }; emit(entry);
    });
}
export function useQuery<T>(key: string | null, loader: () => Promise<T>) {
    const session = getAuthSession();
    // Session identity prevents cached data from being shared between accounts.
    const entry = entryFor(`${session?.userId || 'guest'}:${session?.expiresAt || ''}:${key || 'disabled'}`);
    entry.load = key && session ? loader : undefined;
    const subscribe = useCallback((fn: () => void) => {
        entry.listeners.add(fn);
        emitStatus();
        return () => { entry.listeners.delete(fn); emitStatus(); };
    }, [entry]);
    const state = useSyncExternalStore(subscribe, () => entry.state) as State<T>;
    const enabled = Boolean(key && session);
    useEffect(() => { if (enabled && !entry.state.loading && (entry.state.version === 0 || Date.now() - entry.updatedAt >= REFRESH_MS)) fetchEntry(entry); }, [enabled, entry]);
    // A background refresh must not disable dependent queries or empty their data.
    return { ...state, loading: enabled && state.data === undefined && (state.loading || state.version === 0), reload: () => fetchEntry(entry) };
}
function invalidateLocalData() {
    for (const entry of cache.values()) {
        entry.generation++;
        entry.updatedAt = 0;
        entry.state = { ...entry.state, loading: false, error: '', version: 0 };
        emit(entry);
        if (entry.listeners.size) fetchEntry(entry);
    }
}
let _channel: BroadcastChannel | null = null;
function getChannel() {
    if (!_channel) {
        try { _channel = new BroadcastChannel('wareflow_sync'); } catch { /* not supported */ }
    }
    return _channel;
}
export function invalidateData() {
    invalidateLocalData();
    // Share change notification with other tabs and same-tab layouts.
    try { localStorage.setItem(CHANGE_KEY, crypto.randomUUID()); } catch { /* Polling still works if storage is unavailable. */ }
    try { getChannel()?.postMessage({ type: 'invalidate' }); } catch { /* ignore */ }
}
export function clearData() { for (const entry of cache.values()) { entry.generation++; entry.updatedAt = 0; entry.state = { data: undefined, loading: false, error: '', version: 0 }; emit(entry); } }
export function useDataSync() {
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'hidden' || !getAuthSession()) return;
            for (const entry of cache.values()) if (entry.listeners.size && Date.now() - entry.updatedAt >= 3000) fetchEntry(entry);
        };
        const changed = (event: StorageEvent) => { if (event.key === CHANGE_KEY) invalidateLocalData(); };
        const channelMsg = (event: MessageEvent) => { if (event.data?.type === 'invalidate') invalidateLocalData(); };
        const channel = getChannel();
        if (channel) channel.addEventListener('message', channelMsg);
        const timer = window.setInterval(refresh, REFRESH_MS);
        window.addEventListener('storage', changed);
        window.addEventListener('focus', refresh);
        window.addEventListener('online', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('storage', changed);
            window.removeEventListener('focus', refresh);
            window.removeEventListener('online', refresh);
            document.removeEventListener('visibilitychange', refresh);
            if (channel) channel.removeEventListener('message', channelMsg);
        };
    }, []);
}
export function useDataStatus() {
    return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => statusSnapshot);
}
