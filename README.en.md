# context-advisor

[한국어](README.md) | English

A Claude Code mod. It shows the current session's context, token and rate-limit usage as a card, and recommends whether to **keep going, compact, or start a new session** to save tokens.

![context-advisor card](docs/screenshot.png)

## Requirements

- Claude Code **2.1.296 or later** (the mod API is early access and may change between releases; verified on 2.1.299)
- Install from a terminal session (`/plugin install` is a terminal command)

## Install

At the Claude Code terminal prompt:

```
/plugin install context-advisor --marketplace Jeong-Hyun-Lee/context-advisor
```

Answer `y` to `Add marketplace?`, then press Enter to pick the **user** scope (the default). It runs in that session right away, and at user scope it loads in every project and session after.

## Update

When a new version is published, from a terminal:

```
claude plugin update context-advisor@context-advisor
```

Or inside Claude Code: `/plugin` → Installed → context-advisor → Update. Restart Claude Code to apply it (a new session in the desktop app or VS Code).

If the new version does not show up, refresh the marketplace first: `claude plugin marketplace update context-advisor`.

## Where it shows

| Surface | Display |
|---|---|
| Terminal | Card above the prompt (rounded border, gradient bars) |
| Claude desktop app, VS Code extension, mobile | Pane opened automatically when the session starts (card follows the IDE / app theme) |
| All | `/ctx` opens the pane |

Before the first reply (new session, resumed session, right after `/compact`) the card shows a local estimate (`~42k/1.0M (est.)`, no API request sent).

The `Fold` / `Unfold` button on the desktop / VS Code card: folded, only one line shows, `5h 4% · Weekly 1%` (context % when there are no rate limits). Not on the terminal card; the choice is kept for later sessions. The card's size follows the IDE / app font size and zoom.

## What the numbers mean

| Item | Source |
|---|---|
| Context | Input tokens of the last reply ÷ the model's context window |
| 5h / Weekly | Rate limits reported by this session's last API response. Marked `· 25m old` once older than 5 minutes |
| Session tokens | Input + output + cache read + cache write, summed (kept per session id, so a resumed session continues the count) |
| Cache hit | Cache read ÷ (input + cache read + cache write), the same formula as the desktop app's usage panel |
| Cost | Same value as `/cost` |

A mod cannot query account usage directly, so usage from other sessions or claude.ai appears with this session's next reply. Tokens used before the mod was installed are not counted. The card refreshes every minute.

## Recommendation levels

| Level | Default threshold (percent) | Message |
|---|---|---|
| ● green | below 50% | Context OK — keep going |
| ◐ yellow | 50–69% | Long conversation — /compact advised |
| ▲ red | 70% and above | Token waste — start a new session |

A toast appears once when the level goes up.

## Settings (`/config`, or at install)

| Key | Default | Description |
|---|---|---|
| `basis` | `percent` | `percent`: share of the context window, `tokens`: absolute context tokens |
| `warnPercent` / `highPercent` | 50 / 70 | Used when `basis=percent` |
| `warnTokens` / `highTokens` | 100000 / 200000 | Used when `basis=tokens`. Recommended for 1M-window models |
| `showPanel` | `true` | `false` shows the recommendation line only |

## Language

The `EN` / `KO` button on the card switches between Korean and English (terminal: click it, or ctrl+x tab then `l`). The choice is kept for later sessions.

## Development

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

## License

MIT
