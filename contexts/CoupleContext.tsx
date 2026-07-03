import React, { createContext, useState, useRef, useEffect, ReactNode } from 'react';
import { EDGE, getSupabaseRequestHeaders, prepareSupabaseRequest, supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  generateCoupleInviteCode,
  rotateCoupleInviteCode,
} from '@/services/coupleInvite';
import {
  fetchCoupleSubscriptionFields,
  mapCoupleSubscriptionFields,
} from '@/services/couplePremium';
import { Couple, User } from '@/types';

interface CoupleContextType {
  couple: Couple | null;
  partner: User | null;
  inviteCode: string;
  isConnected: boolean;
  isLoading: boolean;
  generateMyCode: (userId: string) => Promise<string>;
  regenerateMyCode: (userId: string) => Promise<string>;
  connectWithCode: (code: string, currentUser: User) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshCouple: (userId: string) => Promise<void>;
}

export const CoupleContext = createContext<CoupleContextType | undefined>(undefined);

function mapPartner(raw: any): User {
  return {
    id: raw.id,
    email: raw.email || '',
    name: raw.name || 'Partner',
    avatarColor: raw.avatar_color || '#F97316',
    avatarUrl: raw.avatar_url || null,
    plan: raw.plan || 'free',
    coupleId: raw.couple_id || undefined,
    createdAt: raw.created_at || new Date().toISOString(),
  };
}

interface ConnectCoupleRpcResult {
  couple_id: string;
  partner_id: string;
  partner_name: string;
  partner_email?: string;
  partner_avatar_color?: string;
  partner_plan?: string;
  invite_code: string;
  connected_at: string;
}

interface ConnectCoupleEdgeResult {
  couple_id: string;
  invite_code: string;
  connected_at: string;
  partner?: {
    id: string;
    email?: string;
    name?: string;
    avatar_color?: string;
    avatar_url?: string | null;
    plan?: string;
    created_at?: string;
  };
}

function mapConnectError(message: string, details?: string): string {
  const m = `${message || ''} ${details || ''}`;
  if (m.includes('OWN_CODE')) {
    return 'Nie możesz użyć własnego kodu zaproszenia';
  }
  if (m.includes('CODE_ALREADY_USED')) {
    return 'Ten kod jest już używany przez inną parę.';
  }
  if (m.includes('ALREADY_CONNECTED')) {
    return 'Jesteś już połączony z partnerem. Odłącz się, aby użyć innego kodu.';
  }
  if (m.includes('NOT_AUTHENTICATED')) {
    return 'Zaloguj się ponownie i spróbuj jeszcze raz.';
  }
  if (m.includes('INVALID_CODE')) {
    return 'Nieprawidłowy kod zaproszenia. Sprawdź kod i spróbuj ponownie.';
  }
  if (m.includes('42703') || m.includes('connected_at does not exist')) {
    return 'Błąd konfiguracji bazy — uruchom ponownie migrację 013 w Supabase SQL Editor.';
  }
  return 'Nie udało się połączyć. Spróbuj ponownie.';
}

function shouldFallbackFromRpc(error: { message?: string; code?: string; details?: string }): boolean {
  const msg = `${error.message || ''} ${error.details || ''}`;
  if (msg.includes('PGRST202') || msg.includes('Could not find the function')) {
    return true;
  }
  if (msg.includes('42703') || msg.includes('connected_at does not exist')) {
    return true;
  }
  return false;
}

async function connectViaRpc(code: string): Promise<ConnectCoupleRpcResult | null> {
  const { data, error } = await supabase.rpc('connect_couple_by_invite_code', {
    p_code: code,
  });

  if (!error) {
    const raw = data as ConnectCoupleRpcResult | string | null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as ConnectCoupleRpcResult;
      } catch {
        return null;
      }
    }
    return raw ?? null;
  }

  if (shouldFallbackFromRpc(error)) {
    return null;
  }

  throw new Error(mapConnectError(error.message, error.details));
}

interface CoupleConnectionState {
  connected?: boolean;
  couple_id?: string;
  invite_code?: string;
  connected_at?: string;
  user1_id?: string;
  user2_id?: string;
  partner?: {
    id: string;
    email?: string;
    name?: string;
    avatar_color?: string;
    avatar_url?: string | null;
    plan?: string;
    created_at?: string;
  };
}

function parseRpcJson<T>(data: unknown): T | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }
  return data as T;
}

async function fetchCoupleConnectionState(): Promise<CoupleConnectionState | null> {
  const { data, error } = await supabase.rpc('get_my_couple_connection');
  if (error) {
    if (
      error.message?.includes('PGRST202') ||
      error.message?.includes('Could not find the function')
    ) {
      return null;
    }
    throw error;
  }
  return parseRpcJson<CoupleConnectionState>(data);
}

function buildCouple(
  base: Omit<Couple, 'subscriptionTier' | 'subscriptionExpires' | 'subscriptionPaidBy'> &
    Partial<Pick<Couple, 'subscriptionTier' | 'subscriptionExpires' | 'subscriptionPaidBy'>>
): Couple {
  return {
    ...base,
    subscriptionTier: base.subscriptionTier ?? null,
    subscriptionExpires: base.subscriptionExpires ?? null,
    subscriptionPaidBy: base.subscriptionPaidBy ?? null,
  };
}

function applyConnectionState(
  state: CoupleConnectionState,
  userId: string
): { couple: Couple; partner: User } | null {
  if (!state.connected || !state.couple_id || !state.partner?.id) {
    return null;
  }

  return {
    couple: buildCouple({
      id: state.couple_id,
      user1Id: state.user1_id || state.partner.id,
      user2Id: state.user2_id || userId,
      inviteCode: state.invite_code || '',
      connectedAt: state.connected_at || new Date().toISOString(),
    }),
    partner: mapPartner(state.partner),
  };
}

async function enrichCoupleWithSubscription(couple: Couple): Promise<Couple> {
  const subscription = await fetchCoupleSubscriptionFields(couple.id);
  return { ...couple, ...subscription };
}

function applyConnectResult(
  result: ConnectCoupleRpcResult,
  currentUserId: string,
  fallbackCode: string
): { couple: Couple; partner: User } {
  return {
    couple: buildCouple({
      id: result.couple_id,
      user1Id: result.partner_id,
      user2Id: currentUserId,
      inviteCode: result.invite_code || fallbackCode,
      connectedAt: result.connected_at || new Date().toISOString(),
    }),
    partner: {
      id: result.partner_id,
      email: result.partner_email || '',
      name: result.partner_name || 'Twój partner',
      avatarColor: result.partner_avatar_color || '#F97316',
      avatarUrl: null,
      plan: (result.partner_plan as User['plan']) || 'free',
      createdAt: new Date().toISOString(),
    },
  };
}

async function connectViaEdgeFunction(code: string): Promise<ConnectCoupleEdgeResult> {
  const headers = await getSupabaseRequestHeaders();
  const response = await fetch(EDGE.connectCouple, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invite_code: code }),
  });

  const payload = (await response.json().catch(() => ({}))) as ConnectCoupleEdgeResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(mapConnectError(payload.error || ''));
  }

  return payload;
}

function isAuthOrPermissionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('not_authenticated') ||
    lower.includes('jwt') ||
    lower.includes('permission') ||
    lower.includes('pgrst301') ||
    lower.includes('not authenticated') ||
    lower.includes('row-level security')
  );
}

function clearCoupleState(
  setCouple: (v: Couple | null) => void,
  setPartner: (v: User | null) => void,
  coupleRef: React.MutableRefObject<Couple | null>,
  partnerRef: React.MutableRefObject<User | null>
) {
  coupleRef.current = null;
  partnerRef.current = null;
  setCouple(null);
  setPartner(null);
}

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const refreshGenerationRef = useRef(0);
  const lastConnectAtRef = useRef(0);
  const coupleRef = useRef<Couple | null>(null);
  const partnerRef = useRef<User | null>(null);

  coupleRef.current = couple;
  partnerRef.current = partner;

  useEffect(() => {
    clearCoupleState(setCouple, setPartner, coupleRef, partnerRef);
    setInviteCode('');
    lastConnectAtRef.current = 0;
  }, [user?.id]);

  function markConnected(nextCouple: Couple, nextPartner: User) {
    lastConnectAtRef.current = Date.now();
    coupleRef.current = nextCouple;
    partnerRef.current = nextPartner;
    setCouple(nextCouple);
    setPartner(nextPartner);
  }

  async function generateMyCode(userId: string): Promise<string> {
    const code = await generateCoupleInviteCode(userId);
    setInviteCode(code);
    return code;
  }

  async function regenerateMyCode(userId: string): Promise<string> {
    const code = await rotateCoupleInviteCode(userId);
    setInviteCode(code);
    return code;
  }

  async function connectWithCode(code: string, currentUser: User): Promise<void> {
    const upperCode = code.toUpperCase().trim();
    if (!upperCode) {
      throw new Error('Nieprawidłowy kod zaproszenia. Sprawdź kod i spróbuj ponownie.');
    }

    await prepareSupabaseRequest();

    try {
      const rpcResult = await connectViaRpc(upperCode);

      if (rpcResult?.couple_id && rpcResult.partner_id) {
        const connected = applyConnectResult(rpcResult, currentUser.id, upperCode);
        markConnected(connected.couple, connected.partner);
        await refreshCouple(currentUser.id);
        return;
      }

      const edgeResult = await connectViaEdgeFunction(upperCode);
      if (!edgeResult.couple_id || !edgeResult.partner?.id) {
        throw new Error('Nie udało się połączyć. Spróbuj ponownie.');
      }

      markConnected(
        buildCouple({
          id: edgeResult.couple_id,
          user1Id: edgeResult.partner.id,
          user2Id: currentUser.id,
          inviteCode: edgeResult.invite_code || upperCode,
          connectedAt: edgeResult.connected_at || new Date().toISOString(),
        }),
        mapPartner(edgeResult.partner)
      );
      await refreshCouple(currentUser.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('ALREADY_CONNECTED') || message.includes('CODE_ALREADY_USED')) {
        await refreshCouple(currentUser.id);
        if (coupleRef.current?.id && partnerRef.current?.id) {
          return;
        }
      }
      throw error;
    }
  }

  async function disconnect(): Promise<void> {
    if (!couple) return;
    await supabase.from('couples').delete().eq('id', couple.id);
    await supabase
      .from('profiles')
      .update({ couple_id: null, partner_id: null })
      .in('id', [couple.user1Id, couple.user2Id]);
    coupleRef.current = null;
    partnerRef.current = null;
    lastConnectAtRef.current = 0;
    setCouple(null);
    setPartner(null);
  }

  async function refreshCouple(userId: string): Promise<void> {
    const generation = ++refreshGenerationRef.current;
    setIsLoading(true);

    try {
      const rpcState = await fetchCoupleConnectionState();
      if (generation !== refreshGenerationRef.current) return;

      if (rpcState) {
        if (rpcState.invite_code) {
          setInviteCode(rpcState.invite_code.toUpperCase());
        }

        const connected = applyConnectionState(rpcState, userId);
        if (connected) {
          const nextCouple = await enrichCoupleWithSubscription(connected.couple);
          coupleRef.current = nextCouple;
          partnerRef.current = connected.partner;
          setCouple(nextCouple);
          setPartner(connected.partner);
          return;
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id, partner_id, invite_code')
        .eq('id', userId)
        .single();

      if (generation !== refreshGenerationRef.current) return;

      if (profile?.invite_code) {
        setInviteCode(profile.invite_code.toUpperCase());
      }

      if (profile?.partner_id && profile?.couple_id) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select(
            'id, partner_1_id, partner_2_id, invite_code, created_at, subscription_tier, subscription_expires, subscription_paid_by'
          )
          .eq('id', profile.couple_id)
          .maybeSingle();

        if (generation !== refreshGenerationRef.current) return;

        if (coupleData?.partner_2_id) {
          const partnerId =
            coupleData.partner_1_id === userId
              ? coupleData.partner_2_id
              : coupleData.partner_1_id;

          const { data: partnerData } = await supabase
            .from('profiles')
            .select('id, email, name, avatar_color, avatar_url, plan, created_at, couple_id')
            .eq('id', partnerId)
            .maybeSingle();

          if (generation !== refreshGenerationRef.current) return;

          const stableCode = profile.invite_code?.toUpperCase() || coupleData.invite_code;
          if (stableCode) setInviteCode(stableCode);

          const nextCouple = buildCouple({
            id: coupleData.id,
            user1Id: coupleData.partner_1_id,
            user2Id: coupleData.partner_2_id,
            inviteCode: stableCode || coupleData.invite_code,
            connectedAt: coupleRef.current?.connectedAt || coupleData.created_at,
            ...mapCoupleSubscriptionFields(coupleData),
          });

          coupleRef.current = nextCouple;
          setCouple(nextCouple);

          if (partnerData) {
            const nextPartner = mapPartner(partnerData);
            partnerRef.current = nextPartner;
            setPartner(nextPartner);
          } else if (partnerRef.current?.id === partnerId) {
            setPartner(partnerRef.current);
          }
          return;
        }
      }

      const recentlyConnected =
        Date.now() - lastConnectAtRef.current < 8000 && !!coupleRef.current?.id;

      if (recentlyConnected) {
        return;
      }

      const code = await generateCoupleInviteCode(userId);
      if (generation !== refreshGenerationRef.current) return;

      setInviteCode(code);
      setCouple(null);
      setPartner(null);
      coupleRef.current = null;
      partnerRef.current = null;
    } catch (error) {
      if (isAuthOrPermissionError(error)) {
        clearCoupleState(setCouple, setPartner, coupleRef, partnerRef);
      }
    } finally {
      if (generation === refreshGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }

  return (
    <CoupleContext.Provider
      value={{
        couple,
        partner,
        inviteCode,
        isConnected: !!couple && !!partner,
        isLoading,
        generateMyCode,
        regenerateMyCode,
        connectWithCode,
        disconnect,
        refreshCouple,
      }}
    >
      {children}
    </CoupleContext.Provider>
  );
}
