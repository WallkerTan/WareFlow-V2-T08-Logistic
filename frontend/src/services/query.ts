import { useCallback, useEffect, useRef } from 'react';
import { createSelector, nanoid } from '@reduxjs/toolkit';
import { Store, useAppSelector, type RootState } from '../store/Store';
import { emptyQuery, querySlice } from '../store/slice/querySlice';
import { workspaceSlice } from '../store/slice/workspaceSlice';
import { getAuthSession } from './authApi';

type Loader = () => Promise<unknown>;
// Keep callbacks outside Redux. Query results and their lifecycle live in the store.
const loaders = new Map<string, Set<Loader>>();

export function sessionScope() {
    const session = getAuthSession();
    return session ? JSON.stringify([session.userId, session.expiresAt]) : '';
}

function fetchQuery(key: string, loader: Loader | undefined) {
    if (!loader || JSON.parse(key)[0] !== sessionScope() || Store.getState().queries.entries[key]?.requestId) return;
    const requestId = nanoid();
    Store.dispatch(querySlice.actions.start({ key, requestId }));
    Promise.resolve().then(loader).then(
        data => Store.dispatch(querySlice.actions.finish({ key, requestId, data })),
        error => Store.dispatch(querySlice.actions.finish({
            key,
            requestId,
            error: error instanceof Error ? error.message : 'Không tải được dữ liệu.',
        })),
    );
}

export function useQuery<T>(key: string | null, loader: () => Promise<T>) {
    const scope = sessionScope();
    const cacheKey = key && scope ? JSON.stringify([scope, key]) : null;
    const loaderRef = useRef(loader);
    useEffect(() => { loaderRef.current = loader; }, [loader]);
    const invoke = useCallback(() => loaderRef.current(), []);
    const state = useAppSelector(root => (cacheKey && root.queries.entries[cacheKey]) || emptyQuery);

    useEffect(() => {
        if (!cacheKey) return;
        const current = loaders.get(cacheKey) ?? new Set();
        current.add(invoke);
        loaders.set(cacheKey, current);
        Store.dispatch(querySlice.actions.subscribe(cacheKey));
        if ((Store.getState().queries.entries[cacheKey] ?? emptyQuery).stale) fetchQuery(cacheKey, invoke);
        return () => {
            current.delete(invoke);
            if (!current.size) loaders.delete(cacheKey);
            Store.dispatch(querySlice.actions.unsubscribe(cacheKey));
        };
    }, [cacheKey, invoke]);

    const reload = useCallback(() => {
        if (cacheKey) fetchQuery(cacheKey, invoke);
    }, [cacheKey, invoke]);

    const fetching = Boolean(state.requestId || state.stale);
    return {
        data: state.data as T | undefined,
        error: state.error,
        version: state.version,
        loading: Boolean(cacheKey && fetching && state.data === undefined),
        refreshing: Boolean(cacheKey && state.requestId && state.data !== undefined),
        reload,
    };
}

export function invalidateData() {
    Store.dispatch(querySlice.actions.invalidate());
    for (const [key, active] of loaders) fetchQuery(key, active.values().next().value);
}

export function clearData() {
    Store.dispatch(querySlice.actions.clear());
    Store.dispatch(workspaceSlice.actions.clear());
}

if (typeof window !== 'undefined') window.addEventListener('wareflow.auth', clearData);

const selectDataStatus = createSelector(
    [(state: RootState) => state.queries.entries, (state: RootState) => state.queries.subscribers],
    (entries, subscribers) => {
        const active = Object.keys(subscribers).map(key => entries[key]).filter(entry => entry != null);
        return {
            loading: active.some(entry => entry.requestId && entry.data === undefined),
            errors: [...new Set(active.map(entry => entry.error).filter(Boolean))],
        };
    },
);

export function useDataStatus() {
    return useAppSelector(selectDataStatus);
}
