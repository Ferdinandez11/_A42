export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nueva funcionalidad
        'fix',      // Corrección de bug
        'docs',     // Documentación
        'style',    // Formato (no afecta código)
        'refactor', // Refactorización
        'perf',     // Mejora de rendimiento
        'test',     // Tests
        'build',    // Sistema de build
        'ci',       // CI/CD
        'chore',    // Tareas de mantenimiento
        'revert',   // Revertir commit
      ],
    ],
    // Longitud máxima del asunto (título)
    'subject-max-length': [2, 'always', 72],
    // El asunto no debe terminar con punto
    'subject-full-stop': [2, 'never', '.'],
    // El asunto debe estar en minúsculas
    'subject-case': [2, 'always', 'lower-case'],
  },
};
