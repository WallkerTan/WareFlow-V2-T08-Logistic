import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type QueryEntry = {
    data?: unknown;
    error: string;
    version: number;
    stale: boolean;
    requestId?: string;
};

export const emptyQuery: QueryEntry = { error: '', version: 0, stale: true };

const initialState: { entries: Record<string, QueryEntry>; subscribers: Record<string, number> } = {
    entries: {},
    subscribers: {},
};

export const querySlice = createSlice({
    name: 'queries',
    initialState,
    reducers: {
        subscribe(state, { payload: key }: PayloadAction<string>) {
            state.subscribers[key] = (state.subscribers[key] ?? 0) + 1;
        },
        unsubscribe(state, { payload: key }: PayloadAction<string>) {
            if (state.subscribers[key] > 1) state.subscribers[key]--;
            else delete state.subscribers[key];
        },
        start(state, { payload: { key, requestId } }: PayloadAction<{ key: string; requestId: string }>) {
            state.entries[key] = { ...(state.entries[key] ?? emptyQuery), requestId, stale: false, error: '' };
        },
        finish(state, { payload }: PayloadAction<{ key: string; requestId: string; data?: unknown; error?: string }>) {
            const entry = state.entries[payload.key];
            if (entry?.requestId !== payload.requestId) return;
            entry.requestId = undefined;
            entry.version++;
            entry.error = payload.error ?? '';
            if (payload.error === undefined) entry.data = payload.data;
        },
        invalidate(state) {
            for (const entry of Object.values(state.entries)) {
                entry.requestId = undefined;
                entry.stale = true;
                entry.error = '';
            }
        },
        clear(state) {
            state.entries = {};
        },
    },
});
