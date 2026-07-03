import type { PartnerNeedId } from '@/constants/partnerNeeds';

export interface PartnerNeedLabels {
  title: string;
  subtitle: string;
  yourNeed: string;
  partnerNeed: string;
  partnerEmpty: string;
  connectHint: string;
  updatedJustNow: string;
  options: Record<PartnerNeedId, string>;
}
