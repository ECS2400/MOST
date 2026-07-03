import { useContext } from 'react';
import { DisputeContext } from '@/contexts/DisputeContext';

export function useDisputes() {
  const context = useContext(DisputeContext);
  if (!context) throw new Error('useDisputes must be used within DisputeProvider');
  return context;
}
