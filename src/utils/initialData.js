export const INITIAL_STRUCTURE = [
    {
        id: 'turma-beta-2024', type: 'turma', name: 'Turma Beta 2024', description: 'Primeira turma de inovação',
        children: [
            {
                id: 'trilha-ia-gen', type: 'trilha', name: 'IA Generativa para Educação', description: 'Do zero ao prompt engineering',
                children: [
                    {
                        id: 'curso-fundamentos', type: 'curso', name: 'Fundamentos da IA', cover: 'bg-indigo-600',
                        children: [
                            {
                                id: 'mod-intro', type: 'modulo', name: 'Introdução',
                                children: [
                                    {
                                        id: 'aula-oq-e-ia', type: 'aula', name: 'O que é IA?', duration: '10:00', videoId: '2eEbP_64bHA',
                                        materials: [{ name: 'Slide Deck.pdf', url: '#' }]
                                    },
                                    { id: 'aula-historia', type: 'aula', name: 'História da IA', duration: '15:30', videoId: 'ad79nYk2keg' },
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
];
