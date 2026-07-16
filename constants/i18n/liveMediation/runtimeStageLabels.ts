import type { LiveMediationRuntimeStage } from './types';

/** Shared runtime stage labels for live mediation header (Phase UI-B.3c.2). */
export const RUNTIME_STAGE_LABELS_EN: Record<LiveMediationRuntimeStage, string> = {
  intake: 'Opening',
  story_collection: 'Sharing stories',
  understanding: 'Understanding',
  needs_and_impact: 'Needs and impact',
  repair: 'Repair',
  agreement_building: 'Building agreement',
  extension: 'Extension',
  proposal: 'Proposal',
  closing: 'Closing',
  safety_hold: 'Safety pause',
};

export const RUNTIME_STAGE_LABELS_PL: Record<LiveMediationRuntimeStage, string> = {
  intake: 'Rozpoczęcie',
  story_collection: 'Zbieranie historii',
  understanding: 'Zrozumienie',
  needs_and_impact: 'Potrzeby i wpływ',
  repair: 'Naprawa relacji',
  agreement_building: 'Budowanie porozumienia',
  extension: 'Rozszerzenie',
  proposal: 'Propozycja',
  closing: 'Zamykanie',
  safety_hold: 'Pauza bezpieczeństwa',
};

export const RUNTIME_STAGE_LABELS_DE: Record<LiveMediationRuntimeStage, string> = {
  intake: 'Eröffnung',
  story_collection: 'Geschichten sammeln',
  understanding: 'Verständnis',
  needs_and_impact: 'Bedürfnisse und Wirkung',
  repair: 'Wiederherstellung',
  agreement_building: 'Einigung finden',
  extension: 'Erweiterung',
  proposal: 'Vorschlag',
  closing: 'Abschluss',
  safety_hold: 'Sicherheitspause',
};

export const RUNTIME_STAGE_LABELS_FR: Record<LiveMediationRuntimeStage, string> = {
  intake: 'Ouverture',
  story_collection: 'Partage des récits',
  understanding: 'Compréhension',
  needs_and_impact: 'Besoins et impact',
  repair: 'Réparation',
  agreement_building: 'Accord',
  extension: 'Extension',
  proposal: 'Proposition',
  closing: 'Clôture',
  safety_hold: 'Pause sécurité',
};

export const RUNTIME_STAGE_LABELS_ES: Record<LiveMediationRuntimeStage, string> = {
  intake: 'Apertura',
  story_collection: 'Recogida de historias',
  understanding: 'Comprensión',
  needs_and_impact: 'Necesidades e impacto',
  repair: 'Reparación',
  agreement_building: 'Acuerdo',
  extension: 'Extensión',
  proposal: 'Propuesta',
  closing: 'Cierre',
  safety_hold: 'Pausa de seguridad',
};

export const RUNTIME_STAGE_LABELS_IT: Record<LiveMediationRuntimeStage, string> = {
  intake: 'Apertura',
  story_collection: 'Raccolta storie',
  understanding: 'Comprensione',
  needs_and_impact: 'Bisogni e impatto',
  repair: 'Riparazione',
  agreement_building: 'Accordo',
  extension: 'Estensione',
  proposal: 'Proposta',
  closing: 'Chiusura',
  safety_hold: 'Pausa sicurezza',
};
