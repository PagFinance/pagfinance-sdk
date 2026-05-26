# Publicando o `@pagfinance/sdk` no npm

Guia passo a passo para publicar este pacote em [npmjs.com](https://www.npmjs.com).

## 1. Pré-requisitos

- Conta no [npmjs.com](https://www.npmjs.com/signup).
- Como o pacote tem escopo (`@pagfinance/...`), a organização `pagfinance` precisa
  existir no npm. Crie em <https://www.npmjs.com/org/create> (o tier público é gratuito).
- Faça login localmente:

  ```bash
  npm login
  ```

  Confirme que está autenticado com:

  ```bash
  npm whoami
  ```

## 2. Pacote com escopo é privado por padrão

Pacotes com escopo (`@org/nome`) são **privados por padrão**. Para publicar de forma
pública (e gratuita), é necessário usar `--access public`.

Recomendado: fixe isso no `package.json` para não esquecer em cada publicação:

```json
"publishConfig": {
  "access": "public"
}
```

## 3. Licença

O `package.json` está com `"license": "UNLICENSED"`. Isso publica normalmente, mas
sinaliza que o código é proprietário. Se a intenção for open source, troque por uma
licença real (ex.: `"MIT"`). Se for proprietário mesmo, mantenha.

## 4. Verifique o conteúdo do pacote

O campo `files` inclui apenas `dist` e `README.md`. Garanta que o build roda e
inspecione o que será enviado no tarball:

```bash
pnpm install
pnpm run build
npm pack --dry-run
```

Confira que os artefatos abaixo aparecem na lista:

- `dist/index.js` (ESM)
- `dist/index.cjs` (CommonJS)
- `dist/index.d.ts` (tipos)

## 5. Publicar

```bash
npm publish
```

O script `prepublishOnly` já dispara o `build` automaticamente antes de publicar.

> Se você **não** adicionou o `publishConfig` do passo 2, publique com:
>
> ```bash
> npm publish --access public
> ```

## 6. Publicar novas versões

Incremente a versão antes de cada nova publicação (atualiza o `package.json` e cria
a tag de git):

```bash
npm version patch   # correções            (0.1.0 -> 0.1.1)
npm version minor   # novas funcionalidades (0.1.0 -> 0.2.0)
npm version major   # mudanças incompatíveis (0.1.0 -> 1.0.0)

npm publish
```

## 7. (Opcional) Publicação automática via CI

Para publicar automaticamente ao criar uma tag de versão no GitHub, adicione um
workflow em `.github/workflows/publish.yml` usando um `NPM_TOKEN` (token de
automação criado em npmjs.com → Access Tokens) salvo nos secrets do repositório.

## Solução de problemas

- **`402 Payment Required`**: faltou o `--access public` (ou o `publishConfig`)
  em um pacote com escopo.
- **`403 Forbidden`**: você não tem permissão na org `pagfinance`, ou a versão
  já existe (npm não permite sobrescrever versões publicadas — suba a versão).
- **`ENEEDAUTH`**: rode `npm login` novamente.
