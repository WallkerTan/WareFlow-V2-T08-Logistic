import { combineReducers } from '@reduxjs/toolkit';
import { querySlice } from './querySlice';
import { workspaceSlice } from './workspaceSlice';

export default combineReducers({
    queries: querySlice.reducer,
    workspace: workspaceSlice.reducer,
});
