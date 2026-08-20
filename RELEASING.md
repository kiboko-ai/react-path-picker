# 릴리스 절차

**배포는 GitHub Actions 가 한다. `npm publish` 를 손으로 치지 않는다.**
토큰도 필요 없다 — npmjs.com 에 이 저장소가 Trusted Publisher 로 등록돼 있다.

태그를 밀면 워크플로가 검사·빌드를 거쳐 **npm 에 실제로 올린다.** 0.2.0 이 이 방식으로 나갔다.

> 여기까지 오는 데 여러 번 막혔다. 막힌 지점과 그때의 정확한 화면·명령을
> [막혔을 때](#막혔을-때)에 남겨뒀다. 같은 자리에서 두 번 헤매지 않으려고 적은 것이다.

---

## TL;DR

```bash
git checkout main && git pull
git merge <feature-branch>

npm run typecheck && npm test && npm run build   # 미리 깨진 걸 잡는다
npm pack --dry-run                                # 무엇이 올라가는지 눈으로 본다

npm version 0.3.0 -m "chore: release %s"          # package.json + 커밋 + v0.3.0 태그
git push origin main
git push origin v0.3.0                            # ← 이 줄이 npm 배포까지 한다
gh run watch
```

**문서를 고칠 게 있으면 `npm version` 전에 끝내라.** `README.md` 는 tarball 에 같이
올라가므로, 버전을 올린 뒤 고치면 npm 에는 옛 README 가 박힌다.

### 버전 정하기

`0.x` 라 **minor 자리가 파괴적 변경을 알리는 자리**다.

| 무엇이 바뀌었나 | 올릴 자리 | 예 |
|---|---|---|
| 기본 동작·기본값이 바뀌어 기존 사용자가 체감한다 | **minor** | 기본 단축키 `alt+p` → `shift shift` (0.1.9 → 0.2.0) |
| 기능 추가인데 기존 동작은 그대로 | minor | |
| 버그 수정·문서 | patch | 0.2.0 → 0.2.1 |

### 배포 후 확인

```bash
npm view react-path-picker version                       # 방금 올린 버전
npm view react-path-picker@0.3.0 dist.attestations       # provenance 서명 확인

cd $(mktemp -d) && npm init -y >/dev/null && npm i react-path-picker
node -e "console.log(Object.keys(require('react-path-picker')))"
```

---

## 왜 CI 로만 배포하는가

로컬 `npm publish` 는 **이 계정에서 성립하지 않는다.** 세 가지가 맞물려 있다.

1. npm 은 **모든 패키지에 2FA publish 를 강제한다.** 끌 수 없다:

   ```
   $ npm access set mfa=none react-path-picker
   npm error 403 Two factor authentication package setting is required on all packages.
   ```

2. `npm publish` 가 받는 2FA 는 **`--otp=<6자리>` 뿐**이다.

3. npm 의 2FA 수단은 **보안키뿐이다** — Touch ID·Face ID·Windows Hello·YubiKey.
   authenticator app(TOTP)은 지원 목록에 없다
   (<https://docs.npmjs.com/about-two-factor-authentication>).

만들 수 있는 6자리가 없으니 로컬 CLI 배포는 불가능하다. 남는 건 CI 다.

---

## 세팅 (한 번만, 이미 되어 있음)

### npmjs.com — Trusted Publisher 등록

npmjs.com → 프로필 → **Packages** → **react-path-picker** → **Settings**
→ **Trusted Publisher** → **GitHub Actions**

| 항목 | 값 |
|---|---|
| Organization or user | `kiboko-ai` |
| Repository | `react-path-picker` |
| Workflow filename | `release.yml` |
| Environment | (비워둔다) |

이걸로 끝이다. **토큰을 만들지 않는다.** GitHub Actions 가 OIDC 로 받은 단기 신원으로
배포하므로 발급·보관·폐기·만료가 전부 사라진다.

### GitHub — 할 일 없음

`release.yml` 에 시크릿 참조가 없다. `permissions: id-token: write` 만 있으면 되고
이미 들어가 있다.

### 워크플로가 지켜야 하는 것

- **`node-version: 24`** — Trusted Publishing 은 npm 11.5.1+ 에서만 동작한다.
  Node 20 은 npm 10 을 싣고 오고, `npm i -g npm@latest` 로 올리려 해도 npm 12 가
  Node 22+ 를 요구해 `EBADENGINE` 으로 설치조차 안 된다.
- **`npm publish --provenance --access public`** — 토큰 env 없이.

---

## 워크플로가 하는 일

`v*` 태그 푸시(또는 수동 실행)에 반응한다.

```
태그↔package.json 버전 일치 확인   ← 어긋나면 여기서 중단
이미 npm 에 있는 버전인지 확인      ← 있으면 publish 만 건너뛰고 초록으로 끝낸다
npm ci → typecheck → test → build
npm publish --provenance --access public   ← 실제 npm 업로드
```

중복 확인이 **실패가 아니라 건너뛰기**인 이유: 손으로 먼저 배포하고 태그를 나중에 붙이는
순서에서도 빨간 X 가 안 뜨게 하려고. (`v0.1.9` 가 그 순서였고 예전 가드는 `exit 1` 이었다.)

수동 실행:

```bash
gh workflow run "Publish to npm" --ref main
gh run watch
```

태그 없이 `main` 기준으로 돌면 버전 일치 검사는 건너뛰고 `package.json` 버전으로 배포한다.

---

## 막혔을 때

### `EOTP` — one-time password 를 요구한다

로컬에서 `npm publish` 를 친 것이다. [쓸 수 없다](#왜-ci-로만-배포하는가). CI 로 가라.

`--auth-type=web` 는 **login 에만** 적용된다. `npm publish --auth-type=web` 는 아무 효과가 없다.

계정 2FA 를 `auth-only` 로 낮추는 것도, 패키지 `mfa=none` 도 **해결책이 아니다.**
이 두 경로로 시간을 버리지 마라 — 0.2.0 때 그렇게 버렸다.

### `E404 Not Found - PUT https://registry.npmjs.org/react-path-picker`

**npm 은 권한 없음(403)을 404 로 숨긴다** — 패키지 존재를 노출하지 않으려고.
인증은 됐는데 그 자격으로 이 패키지에 쓸 수 없다는 뜻이다.

토큰 방식에서 이게 계속 났고, 결국 Trusted Publishing 으로 옮겨서 해결했다.
토큰이 유효한지 따로 확인하려면 (토큰을 파일 밖으로 내보내지 않는다):

```bash
TMPRC=$(mktemp)
printf '//registry.npmjs.org/:_authToken=%s\n' '<토큰>' > "$TMPRC"
NPM_CONFIG_USERCONFIG="$TMPRC" npm access list packages
rm "$TMPRC"
```

`react-path-picker: read-write` 가 나와야 정상이다.

### `E401 Unauthorized - GET /-/whoami` (CI 안에서)

granular access token 은 `whoami` 에 필요한 스코프가 없어 401 이 날 수 있다.
**토큰이 죽었다는 뜻이 아니다.** 판정은 `publish` 응답으로 해라.

### `EBADENGINE` — npm 12 가 안 깔린다

```
Required: {"node":"^22.22.2 || ^24.15.0 || >=26.0.0"}  Actual: {"node":"v20.20.2"}
```

`node-version` 을 24 로 올려라. npm 을 따로 설치할 필요가 없어진다.

### 버전을 이미 써버렸다

npm 은 같은 버전 재업로드를 **영구히** 거절한다. 다음 patch 로 올려서 다시 낸다.

배포 **전에** 실패했다면 그 번호는 아직 살아 있다:

```bash
git tag -d v0.3.0
git reset --hard HEAD~1            # chore: release 커밋 취소
git push origin :refs/tags/v0.3.0  # 태그를 이미 밀었다면
```

---

## 토큰을 다룰 때

Trusted Publishing 을 쓰면 토큰이 필요 없다. 그래도 어딘가에서 쓰게 된다면:

- 토큰을 **채팅·이슈·커밋·파일에 붙여넣지 않는다.** 한 번 새어나가면 폐기 말고는 방법이 없다.
- `gh secret set` 의 **인자는 값이 아니라 이름이다.**

  ```bash
  gh secret set NPM_TOKEN --repo kiboko-ai/react-path-picker
  #             ^^^^^^^^^ 이름. 글자 그대로 친다
  # ? Paste your secret:  ← 토큰은 여기에 붙여넣는다 (가려진다)
  ```

  토큰을 인자로 주면 **토큰이 시크릿 이름**이 되고 값은 비어버린다. 시크릿 이름은
  마스킹되지 않아 GitHub UI·API 에 평문으로 노출된다.
- 파이프로 넣지 마라 (`echo "$T" | gh secret set ...`). 줄바꿈이 딸려 들어가 401 이 난다.
- 노출됐다면: npmjs.com → **Access Tokens** → **Revoke** → 새로 발급.
