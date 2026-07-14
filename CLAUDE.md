# CLAUDE.md — `@pagfinance/sdk`

Guia destinado a quem (humano ou IA) for **evoluir o SDK no futuro**. Captura o
porquê das decisões, as armadilhas que já foram resolvidas e as convenções que
mantêm o pacote pequeno, seguro e desacoplado.

> Leia também:
> - `README.md` — uso pelo consumidor.
> - `examples/transaction-flow/` e `examples/auth-token/` — referência viva de
>   integração ponta-a-ponta.
> - `../../docs/sdk-integration.md` — como o app do monorepo (`apps/app`) hoje
>   consome o SDK (piloto), endpoints servidor que ele requer, e o que está
>   fora do escopo.

---

## 1. Propósito e princípios

`@pagfinance/sdk` é um cliente TypeScript **framework-agnóstico** para integrar
apps externos com a API pública do PagFinance (paths `/api/*` hoje no Next.js
do `apps/app`; amanhã potencialmente um BFF dedicado). Os princípios são
inegociáveis:

1. **Crypto-free / token-agnóstico.** Nenhuma chave, nenhum encryptor, nenhum
   secret. A única operação criptográfica do cliente é assinar com a carteira
   — e essa assinatura é fornecida pelo app host via um callback (`signer`),
   nunca implementada aqui.
2. **Sem dependências de runtime.** Usa o `fetch` global (Node 18+, browser).
   `zod`, React, Next, axios — nada disso entra. Pequeno e portátil.
3. **Tipos espelhados, não importados do monorepo.** Os tipos de domínio
   (`AssetType`, `Payment`, `KYC`, `ApiError`, etc.) são **cópias locais** em
   `src/types/`. Isso desacopla o SDK do monorepo e protege a propriedade
   intelectual interna.
4. **Desacoplado do transporte.** O contrato HTTP é o que importa. Trocar
   `baseUrl` do app para o BFF dedicado deve ser a única mudança no consumidor.

---

## 2. Arquitetura

```
PagFinanceClient        ← entrypoint, compõe Resources sobre 1 HttpClient
├── config (ResolvedConfig + TokenStore + AppMeta)
├── HttpClient          ← transporte: headers, envelope, erro, abort, authToken
└── Resources
    ├── AssetsResource   (assets, getAssetPrice, gatewayConfig)
    ├── PaymentsResource (validateCode, quote, create, submit, list, get)
    ├── ReceiptsResource (get — agnóstico ao tipo: pix/boleto/giftcard)
    ├── KycResource      (naturalProposal, legalProposal, documentUrl,
    │                     check, cpfValidate, userData)
    ├── UserResource     (me)
    └── AuthResource     (signIn, challenge, verify, setToken,
                          enableAutoRelogin, otpSend)
```

Cada Resource recebe o `HttpClient` (e a `ResolvedConfig`, quando precisa de
defaults como `defaultBlockchain`). Resources são finos: validam input mínimo,
chamam `http.request(path, opts)`, devolvem o tipo público.

### Mapa de arquivos

```
src/
  index.ts                 ← barrel: exporta tudo público
  config.ts                ← AppMeta, TokenStore, MemoryTokenStore, resolveConfig
  PagFinanceClient.ts      ← cola tudo
  http/
    HttpClient.ts          ← request<T>(path, opts) + envelopes
    headers.ts             ← buildHeaders (x-client-id, x-app-*, Authorization)
    PagFinanceError.ts     ← erro tipado lançado em qualquer falha
    extractApiError.ts     ← função pura portada do @pagfinance/core
  types/
    asset.ts, payment.ts, kyc.ts, transfer.ts, common.ts
  resources/
    AssetsResource.ts, PaymentsResource.ts, ReceiptsResource.ts,
    KycResource.ts, UserResource.ts, AuthResource.ts
examples/
  transaction-flow/        ← fluxo pix/boleto ponta-a-ponta
  auth-token/              ← login challenge-response + check-token.mjs
```

---

## 3. Camada HTTP — o coração do SDK

`HttpClient.request<T>(path, opts)` é a única forma de falar com o backend. Ele
faz **três coisas** que valem entender:

### 3.1 Envelopes (dois suportados + raw)

O backend mistura dois formatos de resposta. O cliente desempacota
automaticamente:

| Envelope                     | Onde aparece                                       | Falha quando        |
| ---------------------------- | -------------------------------------------------- | ------------------- |
| `{ success, data, message }` | pagamentos, assets, receipt, validate-code         | `success === false` |
| `{ ok, data, error }`        | KYC, auth/otp-send, email, bank/pix/keys           | `ok === false`      |
| **raw** (sem envelope)       | `/api/gatewayConfig`, `/api/me`, `/api/kyc/user-data` | só pelo HTTP status |

Regra de unwrap: se houver `data` no corpo, retorna `body.data`; caso contrário
retorna o corpo cru. Falha do envelope OU HTTP não-2xx → `PagFinanceError.fromApiBody`.

### 3.2 Erros são `PagFinanceError`

`PagFinanceError` carrega `messages: string[]`, `fieldErrors: Record<string,string>`,
`httpStatus`, `code`. É construído por `extractApiError` (versão portada do
`@pagfinance/core`), que entende tanto `{error:{message,code,details:{issues}}}`
quanto `fieldErrors` quanto `issues`. Erros de rede viram `PagFinanceError.local`
com `code: 'NETWORK_ERROR'`.

**Exceção importante:** `AbortError` (de `AbortController`) **não** é embrulhado
— é propagado cru para o caller poder usar `err.name === 'AbortError'`.

### 3.3 Opções de `request`

```ts
interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;             // serializado como JSON
  skipAuth?: boolean;         // não envia Authorization
  headers?: Record<string, string | undefined>;
  signal?: AbortSignal;       // cancela in-flight
  authToken?: string;         // Bearer por chamada (sobrescreve tokenStore)
}
```

Precedência da autenticação: `skipAuth > authToken > tokenStore.get()`.

---

## 4. Configuração e TokenStore

```ts
new PagFinanceClient({
  baseUrl: 'https://app.pag.finance',  // '' para same-origin no browser
  clientId: 'meu-app',
  appMeta: { name, version, domain },
  fetch?: typeof fetch,                 // default: globalThis.fetch
  tokenStore?: TokenStore,              // default: MemoryTokenStore
  defaultBlockchain?: 'solana',         // header `blockchain` em list/receipt
});
```

`TokenStore` é a **única abstração** que o app host implementa para integrar com
seu próprio storage (zustand, localStorage, cookies). O `MemoryTokenStore`
default não persiste — para uso real, plugue um adapter (ver
`apps/app/src/lib/pagSdk.ts` no monorepo: `ZustandTokenStore`).

`baseUrl: ''` é válido e útil: no browser, paths viram `/api/...` (relativos,
same-origin). É como o app do monorepo consome.

---

## 5. Auth — challenge-response (deep dive)

Este é o ponto mais delicado do SDK. Há **três invariantes** que, se quebradas,
fazem o token ser rejeitado pelos consumidores downstream (app routes que
validam o token, BFF, etc.).

### 5.1 O fluxo

```
client.auth.signIn({ address, blockchain }, signer)
   │
   ├─ POST /api/auth/challenge { address, blockchain }
   │     → { challenge, state, expiresAt }
   │
   ├─ signature = await signer(challenge)        ← app host assina
   │
   └─ POST /api/auth/verify { address, blockchain, signature, state }
         → { tokenJWT, registration, authorizedWallets, ... }
         (tokenStore.set(tokenJWT) automaticamente)
```

### 5.2 Invariantes — por que o token funciona em qualquer consumidor

O `tokenJWT` é um header.payload (sem 3ª parte JWT) **auto-verificável**:
qualquer consumidor reconstrói `getMessageAttestation(payload.iat, payload.pubkey)`
e checa a assinatura embutida (`payload.signature` para Solana, `payload.sig`
para outras chains).

Para que isso funcione, o servidor que emite o token **DEVE**:

1. **Assinar a mensagem canônica** — exatamente
   `PagCrypto\niat:${iat}\npubkey:${address}` (sem nonce, sem extras).
   Qualquer caractere diferente quebra a reconstrução downstream.
2. **Reutilizar o `iat` do desafio** ao montar o token (`token.iat === challenge.iat`).
   Se o servidor gerar um novo `iat` no momento da emissão, a mensagem que o
   downstream reconstrói não bate com a que foi assinada → `Token inválido`.
3. **Preservar o formato da `signature`** (number[] para Solana, string para EVM)
   tal qual veio do cliente. Não re-encodar.

Essas invariantes estão materializadas em `apps/app/src/lib/authChallenge.ts`.
**Se você mudar a mensagem assinada, mude também o downstream em coordenação.**

### 5.3 O signer

```ts
type WalletSigner = (challenge: string) =>
  Promise<string | number[] | Uint8Array> | string | number[] | Uint8Array;
```

- Solana: `wallet.signMessage(new TextEncoder().encode(challenge))` → `Uint8Array`.
- EVM/Tron/etc.: `wallet.signMessage(challenge)` → `string` (hex 0x…) ou objeto
  `{ signature }`.

O SDK normaliza `Uint8Array → number[]` antes de enviar. Strings passam cruas.

### 5.4 Helpers fora do `signIn`

- `challenge(params)` e `verify(params)` separados, se você precisar de
  controle fino.
- `setToken/getToken/clearToken` para token obtido por fora.
- `enableAutoRelogin(() => Promise<boolean>)` registra um handler chamado em 401:
  ele deve refazer o login (tipicamente chamando `signIn`) e devolver `true` se
  reautenticou; o SDK então repete a request original UMA vez.

---

## 6. Contrato de endpoints (referência rápida)

| Resource     | Método              | Path                          | Auth | Envelope         |
| ------------ | ------------------- | ----------------------------- | ---- | ---------------- |
| `assets`     | `acceptedCryptos`   | GET `/api/gatewayConfig`      | —    | raw              |
| `assets`     | `assets(chain?)`    | GET `/api/gatewayConfig`      | —    | raw (filtrado)   |
| `assets`     | `getAssetPrice`     | GET `/api/getAssetPrice`      | —    | passthrough BFF  |
| `payments`   | `validateCode`      | POST `/api/validate-code`     | —    | success/data     |
| `payments`   | `quote(in,{signal})`| POST `/api/payment/quote`     | opt. | success/data     |
| `payments`   | `create`            | POST `/api/payment/create`    | opt. | success/data     |
| `payments`   | `submit`            | POST `/api/payment/submit`    | sim  | success/data     |
| `payments`   | `list({format,bc})` | GET `/api/wallet-lists`       | sim  | success/data     |
| `payments`   | `get(id)`           | derivado de `list({format:'raw'})` + filtro client-side | sim | — |
| `receipts`   | `get({type,tx,chain})` | GET `/api/receipt/${type}` | sim  | success/data     |
| `kyc`        | `naturalProposal`   | POST `/api/kyc/natural-proposal` | opt. | ok/data       |
| `kyc`        | `legalProposal`     | POST `/api/kyc/legal-proposal`   | sim  | ok/data       |
| `kyc`        | `documentUrl`       | GET `/api/kyc/document`          | —    | ok/data       |
| `kyc`        | `check({idTok,bearer})` | GET `/api/kyc/check`         | sim  | raw           |
| `kyc`        | `cpfValidate`       | GET `/api/kyc/cpf-validate`      | —    | ok/data       |
| `kyc`        | `userData`          | GET `/api/kyc/user-data`         | sim  | raw           |
| `user`       | `me`                | GET `/api/me`                    | opt. | raw           |
| `auth`       | `challenge/verify/signIn` | POST `/api/auth/*`         | —    | success/data  |
| `auth`       | `otpSend`           | POST `/api/auth/otp-send`        | —    | ok/data       |

**Não cobertos** (e por que): `/api/auth` (legado, cifrado v0.2 — substituído por
`signIn`), `/api/create-payment` (legado Tron/XRPL, cifrado v0.2 — app continua
chamando direto). O SDK é deliberadamente crypto-free.

---

## 7. Build, tipos e publicação

- Build: **tsup** gera `dist/index.js` (ESM), `dist/index.cjs` (CJS) e
  `dist/index.d.ts/.d.cts`. Comando: `pnpm build`.
- `tsconfig.json` **precisa** ter `noEmit: false`, `incremental: false`,
  `declaration: true` para o dts não quebrar (o `tsconfig.base.json` do monorepo
  liga `incremental` que conflita com o build do tsup).
- `package.json` aponta `main`/`module`/`types`/`exports` para `dist/*`, e
  `files: ["dist"]` — só `dist/` vai pro npm.
- `sideEffects: false` para tree-shaking.
- Versão atual: **0.3.0**. Política: 0.x é pré-estável; mudanças aditivas =
  minor; quebras = nota de migração no README.

Verificação local:
```bash
pnpm --filter @pagfinance/sdk build       # ESM+CJS+dts
pnpm --filter @pagfinance/sdk typecheck   # tsc --noEmit
node packages/sdk/examples/auth-token/check-token.mjs "TOKEN"  # valida um token
```

---

## 8. Como evoluir o SDK

### 8.1 Adicionar um endpoint a um Resource existente

1. Adicione/atualize tipos em `src/types/<dominio>.ts`.
2. Adicione método ao Resource:
   ```ts
   meuMetodo(input: MeuInput, opts: { signal?: AbortSignal } = {}): Promise<Saida> {
     return this.http.request<Saida>('/api/...', {
       method: 'POST',
       body: input,
       signal: opts.signal,
     });
   }
   ```
3. Re-exporte tipos novos via `export *` em `src/index.ts` (o barrel já cobre
   `types/*` e `resources/*`).
4. `pnpm build && pnpm typecheck`.
5. Atualize a tabela de contratos acima.

### 8.2 Adicionar um novo Resource

1. `src/resources/MeuResource.ts` — classe que recebe `HttpClient` (e
   `ResolvedConfig` se precisar de defaults).
2. Em `PagFinanceClient`, instancie e atribua a um campo readonly.
3. Exporte em `src/index.ts`.

### 8.3 Mudar formato de envelope/erro

Se o backend introduzir um terceiro envelope, edite **só** `HttpClient.doRequest`
(detecção + unwrap) e `extractApiError` (parsing de erro). Resources não
precisam mudar — esse é o ponto da camada.

### 8.4 Quebrar compatibilidade (breaking change)

Só em major bump. Atualize: tipos exportados, exemplos, README e nota de
migração.

---

## 9. Armadilhas já pagas (lições)

Mantenha em mente — todas vieram de bugs reais nessa sessão:

1. **`EncryptedDataType` é `{v, iv, encryptedData}`**, não `{v, iv, data}`.
   (Bug histórico: a SDK enviava `data` e o servidor decodificava com a chave
   errada. Hoje a auth é challenge-response e isso não importa, mas vale como
   alerta para qualquer endpoint que aceite o tipo cifrado v0.2.)
2. **Mensagem canônica do attestation é exata.** Adicionar `nonce` no challenge
   quebra a re-verificação downstream do token. Mantenha
   `PagCrypto\niat:${iat}\npubkey:${address}` literal.
3. **`token.iat === challenge.iat`.** Se o `/verify` gerar um novo `iat`, o
   token nasce inválido para qualquer consumidor.
4. **`AbortError` não é `PagFinanceError`.** Quem usa `signal` espera
   `err.name === 'AbortError'`. Embrulhar quebra o padrão de cancelamento.
5. **`externalId` no `quote` é obrigatório** no BFF. Tipado como `string`
   (não optional) para falhar em compile time, não em runtime.
6. **`baseUrl: ''` é legítimo** para uso same-origin no browser. Não force
   um URL absoluto.
7. **`encodeBase64(number[])` e `encodeBase64(Uint8Array)` produzem o mesmo
   resultado** em Node — não tem bug aqui, mas evite re-encodar a assinatura
   no `/verify` para não introduzir um.
8. **Não cachear `tokenStore.get()`** dentro do `HttpClient` — é lido em cada
   request, intencionalmente, para refletir mudanças (login, logout, refresh).

---

## 10. Relação com o app e o BFF

Hoje o SDK aponta para o **app** (`https://app.pag.finance` → rotas Next.js
`/api/*`). O app proxia muitos endpoints para o BFF interno
(`https://api.pagcrypto.app`), adicionando segredos, validação e gravação no
Firestore. A SDK **não fala direto com o BFF** — isso é proposital (segurança,
CORS, lógica de negócio do app).

No futuro, quando houver um BFF dedicado público, a expectativa é que o consumo
do SDK seja só **trocar `baseUrl`**. Para isso continuar verdadeiro:

- Não introduza paths app-specific (ex.: `/api/wallet-lists`) sem que tenham
  contrapartida no BFF planejado.
- Não embuta lógica que só o app sabe fazer.
- Mantenha os Resources finos.

Existem 3 endpoints cuja única implementação hoje é no app e que o SDK depende:
`/api/auth/challenge`, `/api/auth/verify`, `/api/me`. Ver
`../../docs/sdk-integration.md` para o lado servidor.

---

## 11. Release & sync com o repo público

O SDK é desenvolvido aqui (monorepo) e **espelhado one-way** para um repositório
público no GitHub, do qual é publicado no npm. Não desenvolver direto no
público — qualquer mudança lá será sobrescrita pelo próximo release.

Fluxo automatizado via `.github/workflows/sdk-release.yml`:

```bash
# 1. Bump versão no package.json (este comando atualiza o campo "version"
#    em packages/sdk/package.json automaticamente - é obrigatório porque o
#    CI valida que a tag bate com a versão do package.json)
pnpm --filter @pagfinance/sdk version <NOVA_VERSAO>

# 2. Commit da alteração do package.json
git commit -am "chore(sdk): <NOVA_VERSAO>"

# 3. Tag + push - o CI cuida do subtree split, mirror e npm publish
git tag sdk-v<NOVA_VERSAO>
git push origin HEAD sdk-v<NOVA_VERSAO>
```

O workflow valida que `tag === packages/sdk/package.json:version`, faz
`git subtree split --prefix=packages/sdk`, força push pra `main` do repo
público, builda e roda `npm publish --access public --provenance`.

Secrets necessários no monorepo: `SDK_PUBLIC_REPO_URL` (HTTPS, ex.:
`https://github.com/org/pagfinance-sdk.git`), `SDK_PUBLIC_REPO_TOKEN`
(fine-grained PAT escopado ao repo público com Contents: Read and write — a
org PagFinance bloqueia deploy keys via policy, por isso PAT) e `NPM_TOKEN`.

Para trazer um patch ocasional de volta do público (raro):
`git subtree pull --prefix=packages/sdk sdk-public main --squash`.

## 12. Onde olhar primeiro ao mexer

| Quero...                                       | Olhe em                                |
| ---------------------------------------------- | -------------------------------------- |
| Adicionar/mudar endpoint                       | `src/resources/<X>.ts`                 |
| Mudar tipos públicos                           | `src/types/<dominio>.ts`               |
| Mudar como o erro é normalizado                | `src/http/extractApiError.ts`          |
| Mudar headers padrão                           | `src/http/headers.ts`                  |
| Mudar envelope/unwrap/abort/auth precedence    | `src/http/HttpClient.ts`               |
| Mudar config / TokenStore                      | `src/config.ts`                        |
| Validar um token na unha                       | `examples/auth-token/check-token.mjs`  |
| Entender o servidor da auth                    | `apps/app/src/lib/authChallenge.ts`    |
| Configurar/depurar o release                   | `.github/workflows/sdk-release.yml`    |
