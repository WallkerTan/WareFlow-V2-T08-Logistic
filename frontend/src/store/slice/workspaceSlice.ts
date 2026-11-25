import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type OperationLine = {
    key: string;
    productId: string;
    lotId: string;
    qty: string;
    pricePercent: string;
    price: string;
    targetProductId: string;
    lotCode: string;
    expiryDate: string;
    condition: string;
};

export type OperationDraft = { values: Record<string, string>; lines: OperationLine[] };

const initialState: { warehouses: Record<string, string>; drafts: Record<string, unknown> } = {
    warehouses: {},
    drafts: {},
};

export const workspaceSlice = createSlice({
    name: 'workspace',
    initialState,
    reducers: {
        selectWarehouse(state, { payload }: PayloadAction<{ session: string; id: string }>) {
            state.warehouses[payload.session] = payload.id;
        },
        saveDraft(state, { payload }: PayloadAction<{ key: string; draft: unknown }>) {
            state.drafts[payload.key] = payload.draft;
        },
        removeDraft(state, { payload: key }: PayloadAction<string>) {
            delete state.drafts[key];
        },
        clear() {
            return initialState;
        },
    },
});
