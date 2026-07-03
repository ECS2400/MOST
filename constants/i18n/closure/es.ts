import type { ClosureBundle } from './types';

export const CLOSURE_ES: ClosureBundle = {
  survey: [
    { id: 'talkQuality', prompt: '¿Cómo valoras esta conversación?', options: ['Mal', 'Regular', 'Bien', 'Muy bien'] },
    { id: 'heard', prompt: '¿Te sientes escuchado/a?', options: ['Sí', 'En parte', 'No', 'Difícil de decir'] },
    { id: 'ready', prompt: '¿Estás listo/a para el siguiente paso en la relación?', options: ['Sí', 'Aún no', 'No sé'] },
    {
      id: 'hardest',
      prompt: '¿Qué fue lo más difícil?',
      options: ['Describir emociones', 'Entender a la otra parte', 'Hablar con calma', 'Encontrar solución', 'Otra cosa'],
    },
    { id: 'closer', prompt: '¿Te sientes más cerca de tu pareja después de hablar?', options: ['Sí', 'Un poco', 'No', 'Es pronto para decirlo'] },
  ],
  dateIdeaDefault: {
    title: 'Paseo con una pregunta',
    description:
      'Salid a pasear 30–40 minutos. Regla: una pregunta cada vez, sin interrumpir. Primera: «¿Qué fue lo más importante para ti en nuestra conversación de hoy?» Segunda: «¿Qué necesitas de nosotros ahora?» Tercera (opcional): «¿Qué podríamos hacer distinto mañana?» Después del paseo, abrazaos o cogeros de la mano — sin esperar una gran charla al momento.',
    whyItFits:
      'El movimiento y no mirarse a los ojos suele facilitar una conversación sincera tras una discusión. Es simple, barato y funciona.',
    estimatedCost: '0 €',
  },
  ui: {
    surveyTitle: 'Breve encuesta',
    dateIdeaTitle: 'Idea para una cita',
    dateIdeaTodayTitle: 'Idea para hoy',
    durationLabel: 'Tiempo',
    durationMinutes: '{minutes} min',
    budgetFree: 'Gratis',
    budgetLow: 'Coste bajo',
    shuffleDateIdea: 'Elegir otra idea',
    questionProgress: 'Pregunta {current} de {total}',
    loadingMediation: 'Cerrando la mediación...',
    loadingDateIdea: 'Preparando una idea de cita con cariño...',
    whyItFits: 'Por qué encaja',
    cost: 'Coste',
    footerNote: 'Una idea del corazón — sin gastar mucho, con cercanía. Adaptadla a vosotros.',
    finish: 'Finalizar',
    finishLive: 'Ir al resumen',
    errorPrep: 'No se pudo cerrar la mediación.',
    errorSave: 'No se pudo guardar. Inténtalo de nuevo.',
    errorTitle: 'Error',
    noSession: 'No hay sesión solo para guardar.',
  },
};
