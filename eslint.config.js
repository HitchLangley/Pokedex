import neostandard from 'neostandard'
import reactHooks from 'eslint-plugin-react-hooks'

// neostandard is the flat-config successor of eslint-config-standard
export default [
  ...neostandard({
    env: ['browser', 'vitest'],
    ignores: ['dist/**', 'coverage/**']
  }),
  {
    files: ['**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
]
