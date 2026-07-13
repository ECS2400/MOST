import type { SessionMemory, SessionMemoryUpdateInput } from '@/types/mediator';
import { collectBreakthroughMemory } from '@/services/mediatorEngine/memory/collect/collectBreakthroughMemory';
import { collectGoalMemory } from '@/services/mediatorEngine/memory/collect/collectGoalMemory';
import { collectGoalProgressMemory } from '@/services/mediatorEngine/memory/collect/collectGoalProgressMemory';
import { collectInterventionMemory } from '@/services/mediatorEngine/memory/collect/collectInterventionMemory';
import { collectReflectionMemory } from '@/services/mediatorEngine/memory/collect/collectReflectionMemory';
import { normalizeMemory } from '@/services/mediatorEngine/memory/lib/normalizeMemory';
import { syncParticipantRepliesAfterQuestionTurn } from '@/services/mediatorEngine/clientEvents/participantReplyFlowControl';

/** Builds updated session memory from normalized prior state and turn inputs. */
export function buildSessionMemoryUpdate(input: SessionMemoryUpdateInput): SessionMemory {
  let memory = normalizeMemory(input.previousMemory);
  memory = collectInterventionMemory(memory, input);
  memory = collectReflectionMemory(memory, input);
  memory = collectGoalMemory(memory, input);
  memory = collectGoalProgressMemory(memory, input);
  memory = collectBreakthroughMemory(memory, input);

  const flowControl = syncParticipantRepliesAfterQuestionTurn(
    memory.runtimeFlowControl,
    input.intervention.type,
    input.turnNumber
  );

  return {
    ...memory,
    runtimeFlowControl: flowControl,
  };
}
