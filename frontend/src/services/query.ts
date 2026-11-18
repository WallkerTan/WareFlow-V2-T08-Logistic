import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getAuthSession } from './authApi';

type State<T> = { data: T | undefined; loading: boolean; error: string; version: number };
type Entry = { state: State<unknown>; listeners: Set<() => void>; load?: () => Promise<unknown>; generation: number };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
let statusSnapshot = { loading: false, errors: [] as string[] };
function emitStatus() {
    const active = [...cache.entries()].filter(([key, entry]) => !key.endsWith(':disabled') && entry.listeners.size);
    statusSnapshot = { loading: active.some(([, e]) => e.state.loading), errors: [...new Set(active.map(([, e]) => e.state.error).filter(Boolean))] };
    listeners.forEach(fn => fn());
}
function emit(entry: Entry) { entry.listeners.forEach(fn => fn()); emitStatus(); }
function entryFor(key: string): Entry {
    if (!cache.has(key)) cache.set(key, { state: { data: undefined, loading: false, error: '', version: 0 }, listeners: new Set(), generation: 0 });
    return cache.get(key)!;
}
function fetchEntry(entry: Entry) {
    if (!entry.load || entry.state.loading) return;
    const generation = ++entry.generation;
    entry.state = { ...entry.state, loading: true, error: '' }; emit(entry);
    entry.load().then(data => {
        if (generation !== entry.generation) return;
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
    useEffect(() => { if (enabled && state.version === 0 && !state.loading) fetchEntry(entry); }, [enabled, entry, state.version, state.loading]);
    return { ...state, loading: !!key && (state.loading || state.version === 0), reload: () => fetchEntry(entry) };
}
export function invalidateData() {
    for (const entry of cache.values()) {
        entry.generation++;
        entry.state = { ...entry.state, loading: false, error: '', version: 0 };
        emit(entry);
        if (entry.listeners.size) fetchEntry(entry);
    }
}
export function clearData() { for (const entry of cache.values()) { entry.generation++; entry.state = { data: undefined, loading: false, error: '', version: 0 }; emit(entry); } }
export function useDataStatus() {
    return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => statusSnapshot);
}
