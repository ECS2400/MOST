import type { SessionMemory, SessionMemoryUpdateInput } from '@/types/mediator';
import { collectBreakthroughMemory } from '@/services/mediatorEngine/memory/collect/collectBreakthroughMemory';
import { collectGoalMemory } from '@/services/mediatorEngine/memory/collect/collectGoalMemory';
import { collectInterventionMemory } from '@/services/mediatorEngine/memory/collect/collectInterventionMemory';
import { collectReflectionMemory } from '@/services/mediatorEngine/memory/collect/collectReflectionMemory';
import { normalizeMemory } from '@/services/mediatorEngine/memory/lib/normalizeMemory';

/** Builds updated session memory from normalized prior state and turn inputs. */
export function buildSessionMemoryUpdate(input: SessionMemoryUpdateInput): SessionMemory {
  let memory = normalizeMemory(input.previousMemory);
  memory = collectInterventionMemory(memory, input);
  memory = collectReflectionMemory(memory, input);
  memory = collectGoalMemory(memory, input);
  memory = collectBreakthroughMemory(memory, input);
  return memory;
}
