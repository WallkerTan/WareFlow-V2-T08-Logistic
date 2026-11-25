import { useEffect, useId, useState, type SetStateAction } from 'react';
import { Store, useAppSelector } from './Store';
import { workspaceSlice } from './slice/workspaceSlice';

export function useReduxFormState<T>(initial: T | (() => T)) {
    const key = useId();
    const [defaultValue] = useState(initial);
    const value = useAppSelector(state => state.workspace.drafts[key]) as T | undefined;
    useEffect(() => () => { Store.dispatch(workspaceSlice.actions.removeDraft(key)); }, [key]);

    function setValue(update: SetStateAction<T>) {
        const current = Store.getState().workspace.drafts[key] as T | undefined;
        const draft = typeof update === 'function' ? (update as (previous: T) => T)(current ?? defaultValue) : update;
        Store.dispatch(workspaceSlice.actions.saveDraft({ key, draft }));
    }

    return [value ?? defaultValue, setValue] as const;
}
