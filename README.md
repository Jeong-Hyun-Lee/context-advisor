# context-advisor

Claude Code 모드(mod). 현재 세션의 컨텍스트·토큰·사용 한도를 카드로 보여주고, 토큰 최적화를 위해 **계속 / 압축 / 새 세션** 중 무엇을 할지 추천합니다.

```
╭──────────────────────────────────────────────────────────────────╮
│ ● 컨텍스트 여유 — 계속 진행               Opus 5.5 · effort high [ EN ] │
│ 컨텍스트  ▓▓▓▓▓░░░░░░░░░░░░░░░   25%  254k/1.0M                       │
│ 5시간     ▓▓▓░░░░░░░░░░░░░░░░░   13%  리셋 3h27m                      │
│ 주간      ░░░░░░░░░░░░░░░░░░░░    2%  리셋 6d11h                      │
│ 세션 1h26m · 토큰 1.8M (캐시 99%) · $6.26                             │
╰──────────────────────────────────────────────────────────────────╯
```

## 요구 사항

- Claude Code **2.1.296 이상** (모드 API는 early access라 버전마다 바뀔 수 있음. 2.1.299에서 확인)
- 터미널 세션에서 설치 (`/plugin install`은 터미널 명령)

## 설치

Claude Code 터미널 프롬프트에서:

```
/plugin install context-advisor --marketplace Jeong-Hyun-Lee/context-advisor
```

`Add marketplace?`에 `y`, 범위는 **user**(기본)를 Enter로 선택. 설치한 세션부터 바로 동작하고, user 범위면 이후 모든 프로젝트·세션에서 로드됩니다.

## 표시 위치

| 화면 | 표시 |
|---|---|
| 터미널 | 프롬프트 위 카드 (둥근 테두리, 막대 그라데이션) |
| Claude 데스크톱 앱, VS Code 확장, 모바일 | 세션 시작 시 패널 자동 열림 (SVG 카드) |
| 공통 | `/ctx` 명령으로 패널 열기 |

카드는 첫 응답 이후부터 표시됩니다 (그 전엔 사용량 값 없음).

## 추천 단계

| 단계 | 기본 기준 (percent) | 문구 |
|---|---|---|
| ● 초록 | 50% 미만 | 컨텍스트 여유 — 계속 진행 |
| ◐ 노랑 | 50~69% | 대화 길어짐 — /compact 권장 |
| ▲ 빨강 | 70% 이상 | 토큰 낭비 큼 — 새 세션 권장 |

단계가 오르는 순간 토스트 1회.

## 설정 (`/config` 또는 설치 시)

| 키 | 기본값 | 설명 |
|---|---|---|
| `basis` | `percent` | `percent`: 컨텍스트 창 대비 %, `tokens`: 컨텍스트 토큰 절대값 |
| `warnPercent` / `highPercent` | 50 / 70 | `basis=percent` 기준 |
| `warnTokens` / `highTokens` | 100000 / 200000 | `basis=tokens` 기준. 1M 창 모델이면 이쪽 권장 |
| `showPanel` | `true` | `false`면 추천 한 줄만 |

## 언어

카드의 `EN` / `KO` 버튼으로 한국어·영어 전환 (터미널: 클릭, 또는 ctrl+x tab 후 `l`). 선택은 다음 세션에도 유지.

## 개발

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

## License

MIT
