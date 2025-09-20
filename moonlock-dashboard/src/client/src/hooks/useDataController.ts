import { useEffect, useState } from 'react';
import { DataController } from '../services/DataController';
import type { DataState } from '../services/DataController';

export function useDataController() {
  const [state, setState] = useState<DataState>(DataController.getState());

  useEffect(() => {
    const unsubscribe = DataController.subscribe(setState);
    DataController.initialize();
    
    return () => {
      unsubscribe();
      DataController.dispose();
    };
  }, []);

  return state;
}

export default useDataController;