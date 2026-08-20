# 릴리스 절차

npm 배포가 매번 다른 데서 막혀서, **막혔던 지점과 그때의 정확한 화면·명령**까지 적어둔다.
처음이면 [사전 준비](#사전-준비-계정당-한-번)부터, 이미 세팅돼 있으면 [릴리스](#릴리스)로 바로 간다.

---

## TL;DR

세팅이 끝나 있다면 이게 전부다.

```bash
git checkout main && git pull
npm run typecheck && npm test && npm run build   # 미리 깨진 걸 잡는다
npm version 0.3.0 -m "chore: release %s"          # package.json + 커밋 + v0.3.0 태그
npm publish --access public
git push origin main && git push origin v0.3.0
```

---

## 사전 준비 (계정당 한 번)

**세 곳을 봐야 한다.** 하나라도 어긋나면 `npm publish` 가 `EOTP` 로 죽는데, 에러 메시지는
셋 다 똑같이 "one-time password 를 넣어라"라고만 해서 어디가 문제인지 안 알려준다.

### 1. 계정 2FA — write actions 해제

npmjs.com → 우상단 아바타 → **Account** → **Two-Factor Authentication**
→ 페이지 **하단의 `Additional Options`** 섹션

1. `Additional Options` 로 내려간다
2. **`Require two-factor authentication for write actions`** 체크를 **해제**한다
3. 바로 아래 **`Update Preferences`** 버튼을 눌러 저장한다

> 체크만 풀고 `Update Preferences` 를 안 누르면 저장이 안 된다. 화면상 해제돼 보여도
> 서버에는 반영되지 않는다.

확인:

```bash
npm profile get | grep two-factor
# two-factor auth: auth-only        ← 이래야 한다
# two-factor auth: auth-and-writes  ← 이러면 publish 마다 OTP 를 묻는다
```

### 2. 패키지 2FA 요구 — 끌 수 없다 (2026-08 확인)

npm 이 **모든 패키지에 2FA 요구를 강제**한다. 끄려고 하면 거부당한다:

```bash
$ npm access set mfa=none react-path-picker
npm error 403 Forbidden - POST https://registry.npmjs.org/-/package/react-path-picker/access
npm error 403 Two factor authentication package setting is required on all packages.
```

**여기서 따라오는 결론이 이 문서에서 제일 중요하다:**

- 로컬 `npm publish` 는 **TOTP 6자리가 반드시 필요하다**
- 보안키·패스키만 등록된 계정은 그 6자리를 만들 수 없다 → **CLI 직접 배포가 불가능하다**
- 계정 2FA 를 `auth-only` 로 낮춰도 **이건 안 풀린다.** 패키지 정책이 따로 걸리기 때문이다.
  (낮췄다면 되돌려라 — 배포에 도움이 안 되면서 계정 보안만 내려간다.)

그래서 길은 둘뿐이다:

| 방법 | 배포할 때 하는 일 | 비고 |
|---|---|---|
| **인증 앱(TOTP) 추가** | 매번 `--otp=<6자리>` 를 직접 친다 | 로컬 배포 유지 |
| **CI 에서 배포** | 태그만 민다 | OTP 없음. [아래 참고](#ci-로-배포하기) |

### 3. 로그인 — 세션으로, 토큰 말고

```bash
npm login --auth-type=web
```

`--auth-type=web` 를 **반드시 붙인다.** 안 붙이면 legacy 방식으로 떨어져서 브라우저 URL 을
띄우면서 동시에 `Username:` 을 묻고, 그대로 두면 exit 1 로 끝난다.

보안키·패스키를 쓰면 브라우저에서 그대로 인증된다 — 6자리 코드가 없어도 된다.

확인:

```bash
npm whoami                              # jay-kiboko
npm access list packages | grep react-path-picker   # react-path-picker: read-write
```

---

## 릴리스

### 버전 정하기

`0.x` 라 **minor 자리가 파괴적 변경을 알리는 자리**다.

| 무엇이 바뀌었나 | 올릴 자리 | 예 |
|---|---|---|
| 기본 동작·기본값이 바뀌어 기존 사용자가 체감한다 | **minor** | 기본 단축키 `alt+p` → `shift shift` (0.1.9 → 0.2.0) |
| 기능 추가인데 기존 동작은 그대로 | minor | |
| 버그 수정·문서 | patch | 0.2.0 → 0.2.1 |

### 순서

```bash
# 1. main 에 합치고 최신화
git checkout main && git pull
git merge <feature-branch>

# 2. 먼저 초록인지 확인 — prepublishOnly 가 또 돌지만, 여기서 깨지면 로그가 더 읽기 쉽다
npm run typecheck && npm test && npm run build

# 3. 무엇이 올라가는지 눈으로 본다 (dist + README + LICENSE 만 나가야 한다)
npm pack --dry-run

# 4. 버전 + 커밋 + 태그를 한 번에
npm version 0.3.0 -m "chore: release %s"

# 5. 배포 — prepublishOnly 가 typecheck·test·build 를 다시 돌린다
npm publish --access public

# 6. 푸시 (main 을 먼저, 태그를 나중에)
git push origin main
git push origin v0.3.0
```

**문서를 고칠 게 있으면 4번 전에 끝내라.** `README.md` 는 tarball 에 같이 올라가므로,
버전을 올린 뒤 README 를 고치면 npm 에는 옛 README 가 박힌다.

### 배포 후 확인

```bash
npm view react-path-picker version      # 방금 올린 버전
npm view react-path-picker dist-tags    # latest 가 그 버전인지

cd $(mktemp -d) && npm init -y >/dev/null && npm i react-path-picker
node -e "console.log(Object.keys(require('react-path-picker')))"
```

---

## 막혔을 때

### `npm error code EOTP`

> This operation requires a one-time password from your authenticator.

**메시지는 하나인데 원인은 셋이다.** 위에서부터 순서대로 확인한다.

| # | 원인 | 확인 | 해결 |
|---|---|---|---|
| 1 | 계정이 `auth-and-writes` | `npm profile get \| grep two-factor` | [사전 준비 1](#1-계정-2fa--write-actions-해제) |
| 2 | CLI 가 **granular access token** 으로 인증 중 | `npm token list` 가 비어 있고 `~/.npmrc` 에 `npm_` 40자 항목이 있다 | `npm login --auth-type=web` 로 세션 재발급 |
| 3 | 패키지 publish 요구사항 | 웹에서만 확인 가능 | [사전 준비 2](#2-패키지-publish-요구사항) |

2번은 특히 헷갈린다. **`npm whoami` 는 통과하는데 `publish` 만 거부된다.** npm 이 2FA 우회
토큰의 직접 배포를 제한하는 중이라 그렇다 (`npm login` 실행 시 뜨는 경고 참고:
<https://gh.io/npm-gat-bypass2fa-deprecation>).

`--auth-type=web` 는 **login 에만** 적용된다. `npm publish --auth-type=web` 는 아무 효과가 없다 —
publish 는 여전히 TOTP 6자리만 받는다.

### 보안키·패스키만 쓰는데 6자리가 없다

`npm publish --otp=` 에 넣을 코드를 만들 방법이 없고, 패키지 2FA 요구는 끌 수 없다
(위 [사전 준비 2](#2-패키지-2fa-요구--끌-수-없다-2026-08-확인)). 둘 중 하나를 골라야 한다.

- npmjs.com → Account → Two-Factor Authentication → **authenticator app 추가**.
  6자리가 생기니 `npm publish --access public --otp=<6자리>` 로 로컬 배포가 된다.
- 또는 [CI 로 배포](#ci-로-배포하기). 태그만 밀면 되고 OTP 를 안 본다.

계정 2FA 를 `auth-only` 로 낮추는 건 **해결책이 아니다.** 이 경로로 시간을 버리지 마라.

### 버전을 이미 써버렸다

npm 은 같은 버전 재업로드를 **영구히** 거절한다. 다음 patch 로 올려서 다시 낸다.

배포 **전에** 실패했다면 그 번호는 아직 살아 있다. 태그만 물리면 된다:

```bash
git tag -d v0.3.0
git reset --hard HEAD~1     # chore: release 커밋 취소
```

푸시까지 했다면:

```bash
git push origin :refs/tags/v0.3.0
```

---

## CI 로 배포하기

`.github/workflows/release.yml` 이 `v*` 태그 푸시에 반응한다. **패키지 2FA 요구는 자동화 토큰과
Trusted Publishing 으로 충족되므로, OTP 없이 배포되는 유일한 경로다.** provenance 서명도 붙는다.

### 켜는 법

npm 토큰을 GitHub 시크릿에 넣는다.

```bash
gh secret set NPM_TOKEN --repo kiboko-ai/react-path-picker
# ? Paste your secret:  ← 여기에 토큰을 붙여넣는다
```

> **`gh secret set` 의 인자는 값이 아니라 이름이다.**
> `gh secret set npm_abc123...` 처럼 토큰을 인자로 주면 **토큰이 시크릿 이름**이 되고,
> 값은 비어버린다. 시크릿 **이름은 마스킹되지 않아서** GitHub UI·API 에 평문으로 노출된다.
> 이렇게 만들었다면 즉시 지우고 토큰을 폐기해라:
> ```bash
> gh secret delete <잘못된-이름> --repo kiboko-ai/react-path-picker
> ```

확인:

```bash
gh secret list --repo kiboko-ai/react-path-picker   # NPM_TOKEN 이 보여야 한다
```

### 쓸 때

```bash
npm version 0.3.0 -m "chore: release %s"
git push origin main
git push origin v0.3.0        # ← 이 줄이 배포를 트리거한다
gh run watch
```

워크플로 순서: 태그↔`package.json` 일치 → 이미 배포됐는지 → typecheck → test → build → publish.

이미 올라간 버전이면 **실패가 아니라 publish 단계만 건너뛴다.** 손으로 먼저 배포하고 태그를
나중에 붙여도 초록으로 끝난다. (`v0.1.9` 가 그 순서였고, 예전 가드는 `exit 1` 이라 빨간 X 로 남았다.)

### 토큰 없이 (Trusted Publishing)

npmjs.com 패키지 설정에서 이 저장소·워크플로를 신뢰하도록 등록하면 토큰 자체가 필요 없다.
발급·보관·폐기할 것이 없어진다. 등록 후 `release.yml` 의 `NODE_AUTH_TOKEN` 줄을 지우면 된다
(`id-token: write` 는 이미 있다).

---

## 토큰을 다룰 때

- 토큰을 **채팅·이슈·커밋·파일에 붙여넣지 않는다.** 한 번 새어나가면 폐기 말고는 방법이 없다.
- 넣을 때는 항상 **프롬프트에 붙여넣는 방식**을 쓴다 (`gh secret set NPM_TOKEN`,
  `npm login --auth-type=web`). 명령행 인자로 주면 셸 히스토리에 남는다.
- 노출됐다면: npmjs.com → **Access Tokens** → 해당 토큰 **Revoke** → 새로 발급.
