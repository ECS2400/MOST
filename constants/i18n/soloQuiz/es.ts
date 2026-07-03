import type { SoloQuizBundle } from './types';

export const SOLO_QUIZ_ES: SoloQuizBundle = {
  progress: 'Pregunta {current} de {total}',
  skipQuiz: 'Saltar cuestionario',
  nextDescribe: 'Siguiente — describe la situación',
  contextHeader: 'Contexto del cuestionario:',
  contextLabels: {
    situationType: 'Tipo de situación',
    when: 'Cuándo',
    intensity: 'Intensidad (1-10)',
    mainPain: 'Lo que más duele',
    partnerReaction: 'Reacción típica de la pareja',
    goal: 'Objetivo del usuario',
  },
  questions: [
    {
      id: 'situationType',
      prompt: '¿Qué describe mejor esta situación?',
      options: [
        'Discusión o pelea',
        'Sensación de abandono',
        'Falta de comunicación',
        'Ruptura de confianza',
        'Diferencia de prioridades',
        'Otra cosa',
      ],
    },
    {
      id: 'when',
      prompt: '¿Cuándo ocurrió?',
      options: ['Hoy', 'Ayer', 'Esta semana', 'Hace más tiempo'],
    },
    {
      id: 'intensity',
      prompt: '¿Cuánto lo sientes ahora? (1 = poco, 10 = mucho)',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
    {
      id: 'mainPain',
      prompt: '¿Qué duele más en esta situación?',
      options: [
        'Sentirse ignorado/a',
        'Falta de respeto',
        'Soledad en la relación',
        'Injusticia',
        'Miedo por el futuro',
        'Otra cosa',
      ],
    },
    {
      id: 'partnerReaction',
      prompt: '¿Cómo suele reaccionar tu pareja en estos momentos?',
      options: [
        'Evita la conversación',
        'Ataca o acusa',
        'Minimiza el problema',
        'Se disculpa y vuelve al tema',
        'No sé / varía',
      ],
    },
    {
      id: 'goal',
      prompt: '¿Qué necesitas más ahora?',
      options: [
        'Entenderme y entender mis emociones',
        'Prepararme para la conversación',
        'Recuperar la calma',
        'Encontrar una solución concreta',
      ],
    },
  ],
};
