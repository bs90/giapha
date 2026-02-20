import { createContext } from 'react';

export const HighlightContext = createContext<Set<string> | null>(null);
