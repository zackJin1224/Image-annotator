import { useReducer, useCallback } from "react";
import { Box } from "../types";

//Type of State
type HistoryState = {
  past: Box[][];
  present: Box[];
  future: Box[][];
};

//Type of action
type HistoryAction =
  | { type: "SET"; payload: Box[] }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET"; payload: Box[] };

//Reducer function
function historyReducer(
  state: HistoryState,
  action: HistoryAction
): HistoryState {
  switch (action.type) {
    case "SET": {
      const newPresent = action.payload;

      if (JSON.stringify(newPresent) === JSON.stringify(state.present)) {
        return state;
      }
      return {
        past: [...state.past, state.present],
        present: newPresent,
        future: [],
      };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const newFuture = state.future.slice(1);

      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };
    }
    case "RESET": {
      return {
        past: [],
        present: action.payload,
        future: [],
      };
    }
    default:
      return state;
  }
}

//Optimize hook
export function useHistory(initialState: Box[]) {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialState,
    future: [],
  });

  const set = useCallback((newState: Box[]) => {
    dispatch({ type: "SET", payload: newState });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const reset = useCallback((newState: Box[]) => {
    dispatch({ type: "RESET", payload: newState });
  }, []);

  return {
    state: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
