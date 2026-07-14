export class PartnerMediationLinkError extends Error {
  readonly code: 'SAME_USER' | 'NOT_HOST' | 'PARTNER_ALREADY_LINKED';

  constructor(code: PartnerMediationLinkError['code'], message: string) {
    super(message);
    this.name = 'PartnerMediationLinkError';
    this.code = code;
  }
}

export function assertDistinctMediationPartner(hostUserId: string, partnerId: string): void {
  if (partnerId === hostUserId) {
    throw new PartnerMediationLinkError(
      'SAME_USER',
      'Partner must be a different user than the mediation host.'
    );
  }
}

export function resolveMediationPartnerLinkUpdate(params: {
  hostUserId: string;
  partnerId: string;
  existingHostUserId: string | null;
  existingPartnerId: string | null;
}): 'noop' | 'update' {
  assertDistinctMediationPartner(params.hostUserId, params.partnerId);

  if (params.existingHostUserId !== params.hostUserId) {
    throw new PartnerMediationLinkError(
      'NOT_HOST',
      'Only the mediation host may link a partner.'
    );
  }

  if (params.existingPartnerId) {
    if (params.existingPartnerId === params.hostUserId) {
      throw new PartnerMediationLinkError(
        'SAME_USER',
        'Mediation has invalid participant data (host linked as partner).'
      );
    }
    if (params.existingPartnerId !== params.partnerId) {
      throw new PartnerMediationLinkError(
        'PARTNER_ALREADY_LINKED',
        'Mediation already has a different partner linked.'
      );
    }
    return 'noop';
  }

  return 'update';
}
