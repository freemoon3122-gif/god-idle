# 신 키우기 (god-idle)

@AGENTS.md

## 1. 프로젝트 목적
아기 신에서 시작해 제우스나 포세이돈이 되는 **방치형(Idle) 모바일 RPG**.
- 필드에서 몬스터 무리를 자동 공격하고, 골드로 강화하고, 스테이지(난이도당 5000)를 올린다.
- 성장 단계: 아기(Lv.1) → 청소년(1000) → 성인(2000) → 신 선택(3000). 단계마다 스킬 3개, 배운 스킬은 계속 남는다.
- 콘텐츠: 스토리 10장, 난이도 4단계, 무기(드롭·뽑기·등급업), 일일 던전(기간토마키아), 레이드(티포에우스), 패시브 스킬.
- 게임 규칙과 수치의 자세한 설명은 `README.md`, 기획서는 `docs/신키우기_GDD_기능정의.hwpx`.

## 2. 기술과 도구
| 구분 | 내용 (package.json 기준) |
|---|---|
| 프레임워크 | Expo SDK 57 (`expo ~57.0.30`), React Native 0.86.3, React 19.2.3 |
| 언어 | TypeScript ~6.0 (`tsconfig.json`: `expo/tsconfig.base` + `strict: true`) |
| 그림 | `react-native-svg` 15.15.4 (캐릭터·배경·이펙트를 모두 코드로 그림, 이미지 파일 없음) |
| 저장 | `@react-native-async-storage/async-storage` 2.2.0 |
| 기타 | `react-native-safe-area-context`, `expo-status-bar`, `react-native-web` (웹 실행) |
| 개발 도구 | `tsx` (시뮬레이터 실행), EAS (`eas.json`: development / preview / production) |
| 실행 환경 | 사용자는 아이폰 **Expo Go**로 실행한다 → 네이티브 모듈이 필요한 라이브러리를 추가하면 Expo Go에서 안 돌아간다 |

명령어:
```bash
npx expo start --tunnel --clear   # 사용자가 쓰는 실행 방법 (아이폰 Expo Go)
npm run typecheck                 # = tsc --noEmit
npm run simulate [poseidon]       # 밸런스 시뮬레이터 (수 분 걸림)
npm run raid-sim [zeus|poseidon] [분]   # 레이드·일일 던전 시뮬레이터
```
- ESLint 설정 파일과 테스트 프레임워크는 **없다**. 검증은 타입 체크 + 시뮬레이터 + 웹 빌드 화면 확인으로 한다.
- Expo Router는 쓰지 않는다. 화면은 `App.tsx` 하나이고, 탭·창(Sheet)·모달로 전환한다.

## 3. 폴더와 파일
```
index.ts               # 진입점 (registerRootComponent)
App.tsx                # 게임 루프(50ms setInterval), 저장/불러오기, 전체 화면 레이아웃, 탭 내용
src/game/              # 게임 엔진 (React를 import하지 않는 순수 TypeScript)
  types.ts             #   GameState, SkillId 등 모든 타입
  balance.ts           #   밸런스 공식·상수: 레벨, 체력, 골드, 강화(UPGRADES), 신(GODS), 스킬(SKILLS, STAGE_SKILLS)
  engine.ts            #   tick, castSkill, 강화·무기·레이드 행동, migrate(저장 데이터 변환), SAVE_VERSION
  field.ts             #   필드 좌표·몬스터 무리 생성·이동·자동 이동(autoMove)
  economy.ts           #   다이아·강화코인·뽑기 확률·스킬 강화·패시브 수치
  raids.ts             #   레이드·일일 던전 정의와 보상 수치
  weapons.ts           #   무기 목록·등급·드롭
  story.ts             #   스토리·컷신 대사
  format.ts            #   큰 숫자 표기 (K, M, B, T, aa…)
src/storage/save.ts    # AsyncStorage 저장/불러오기 (불러올 때 migrate)
src/ui/                # 화면 (React Native 컴포넌트)
  BattleView.tsx       #   전투 화면: 카메라, 몬스터, 조이스틱, 스킬·타격 연출
  effects.tsx          #   이펙트 컴포넌트 (번개, 참격, 파도, 배너, 알림…)
  Hud.tsx              #   스킬 버튼(SkillDock), 하단 탭, 아래에서 올라오는 창(Sheet), 자동 이동 버튼
  Panels.tsx           #   상단 정보, 난이도, 무기 창, 힘강화 목록
  ShopUI.tsx / RaidUI.tsx / Modals.tsx / DevPanel.tsx   # 상점·스킬강화·패시브 / 레이드 / 모달 / 개발자 버튼(__DEV__에서만)
  Background.tsx       #   맵 배경 3종 (SVG)
  PixelSprite.tsx      #   그림 렌더러: art/에 벡터 그림이 있으면 벡터, 없으면 sprites.ts 픽셀 그림
  HeroSprite.tsx       #   신 + 탈것(구름·상어) 합성
  art/                 #   카툰 벡터 그림 (kit.tsx 도구, heroes·monsters·raid·zeus·poseidon.tsx)
  sprites.ts / theme.ts #  예전 픽셀 그림 데이터 / 색상
scripts/               # simulate.ts, raid-sim.ts (엔진을 그대로 돌리는 시뮬레이터)
tools/                 # 그림 제작 도구 (파이썬 픽셀 아트 스크립트, art-preview: 벡터 그림 미리보기)
docs/                  # 기획서 (GDD·기능 정의 표, 한글 .hwpx)
```

## 4. 작업 규칙
### 디자인
- 깔끔하고 미니멀한 디자인을 사용합니다.
- 모바일 화면에서도 잘 보이도록 제작합니다. (세로 화면 고정, 작은 폰 320pt 폭까지 확인)
- 불필요한 애니메이션은 사용하지 않습니다.

### 작업 방식
- 기존에 구현된 기능을 먼저 확인합니다.
- 작업에 필요한 파일을 확인한 뒤 수정합니다.
- 작업이 끝나면 변경한 내용을 설명합니다. (사용자는 컴퓨터공학과 학생: **한국어로**, 필요하면 Java 비유를 들어 자세히)
- 끝내기 전에 `npm run typecheck`를 통과시킨다. 밸런스를 바꿨으면 `npm run simulate`로 확인한다.
- 커밋 후 `main`에 푸시한다. 사용자는 `git pull origin main` 후 실행한다.

### 주의사항
- 요청하지 않은 기능은 임의로 추가하지 않습니다.
- 기존 기능을 삭제하기 전에 사용자에게 확인합니다.

## 5. 코드 작성 기준
- **엔진과 화면을 분리한다.** 게임 규칙은 `src/game/`(React 없음)에, 그리기는 `src/ui/`에. 그래야 시뮬레이터가 엔진을 그대로 돌릴 수 있다.
- **상태는 불변으로 다룬다.** 엔진 함수는 `GameState`를 받아 새 객체를 돌려준다 (`{ ...state, ... }`). 연출이 필요한 결과는 `ActionResult`(hits, casts, drops…)로 돌려준다.
- **수치는 `balance.ts` / `economy.ts` / `raids.ts`의 상수로 둔다.** 화면 문구에 숫자를 쓸 때는 상수와 맞는지 확인한다 (README도 함께 갱신).
- **그림은 코드로 그린다.** 새 캐릭터는 `src/ui/art/`에 `ArtDef`로 추가하고, 색은 반드시 `p.fill()` / `p.grad()` / `p.line`을 거친다 (맞았을 때 실루엣 표시용). 크기는 기존 그림과 같은 칸 수로.
- **주석은 한국어**로, 주변 코드와 같은 밀도로 쓴다. "왜 이렇게 했는지"를 적는다.
- 새 라이브러리는 `npx expo install`로 설치하고, Expo Go에서 동작하는지 먼저 확인한다.

## 6. 주의할 점
- **저장 데이터 호환**: `GameState`에 필드를 추가·삭제하면 `engine.ts`의 `migrate()`에 기본값/정리 코드를 넣는다. 기존 플레이어의 저장이 깨지면 안 된다.
- **숫자 범위**: 체력·골드가 10³⁰⁸(JavaScript 숫자 한계) 가까이 커진다. 극악 난이도가 한계 바로 아래라 공식을 키우면 `Infinity`가 될 수 있다.
- **밸런스 폭주**: 지수로 커지는 체력에 곱셈(지수) 보너스를 더하면 성장이 폭주한다. 무제한 강화는 더하기(+%p) 방식으로.
- **화면 크기**: 스킬 버튼은 7개가 넘으면 두 줄이 되고(`skillDockLayout`), `App.tsx`의 아래 UI 높이 계산과 맞물려 있다. 레이아웃을 바꾸면 둘 다 확인한다.
- **게임 루프 성능**: 50ms마다 렌더링된다. 무거운 SVG 그림은 `memo`로 감싸고, 이펙트 개수(`MAX_EFFECTS`)를 넘기지 않는다.
- `dist/`, `tools/art-preview/out/`은 빌드 결과물이라 커밋하지 않는다 (`.gitignore`).
- `docs/*.hwpx`는 사용자가 한글에서 직접 고칠 수 있는 파일이다. 다시 만들기 전에 사용자에게 확인한다.
