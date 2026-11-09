import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['dist/**','web-dist/**','m0/**']}, ...tseslint.configs.recommended);
