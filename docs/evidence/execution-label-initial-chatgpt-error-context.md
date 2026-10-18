# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chatgpt-handoff.spec.ts >> ChatGPT handoff UI: exact generation survives reload, tutoring stays private, world completion precedes separate assisted assessment
- Location: tests/browser/chatgpt-handoff.spec.ts:11:1

# Error details

```
Error: page.evaluate: TypeError: Cannot read properties of undefined (reading 'game')
    at eval (eval at evaluate (:370:30), <anonymous>:2:34)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```

# Page snapshot

```yaml
- generic [ref=f3e2]:
  - banner [ref=f3e3]:
    - link "zombie-escape-study-game home" [ref=f3e4] [cursor=pointer]:
      - /url: "#"
      - generic [ref=f3e5]: ◈
      - generic [ref=f3e6]: zombie-escape-study-game
      - generic [ref=f3e7]: STUDY / ESCAPE
    - generic [ref=f3e8]:
      - generic [ref=f3e10]: ChatGPT handoff · live profile
      - button "Settings" [ref=f3e11] [cursor=pointer]
      - button "Save run" [ref=f3e12] [cursor=pointer]
  - main [ref=f3e13]:
    - generic [ref=f3e14]:
      - generic [ref=f3e15]:
        - generic [ref=f3e16]:
          - text: FLOOR 01 / 4
          - heading "RECEPTION / INTAKE" [level=1] [ref=f3e17]
        - generic [ref=f3e18]:
          - text: RUN TIME
          - strong [ref=f3e19]: 00:04
      - generic [ref=f3e20]:
        - generic "Top-down survival game. Use WASD or arrow keys to move." [ref=f3e21]
        - status
        - generic [ref=f3e22]: N ↑
      - generic [ref=f3e23]:
        - generic [ref=f3e24]: WASD move
        - generic [ref=f3e25]: E interact / climb
        - generic [ref=f3e26]: G + move furniture
        - generic [ref=f3e27]: R rotate
        - generic [ref=f3e28]: Space vault
        - generic [ref=f3e29]: Esc leave terminal
      - status [ref=f3e30]: Run saved locally. Export a backup from Settings to move between browsers.
    - complementary [ref=f3e31]:
      - generic [ref=f3e32]:
        - generic [ref=f3e33]: SURVIVOR / YOU
        - generic [ref=f3e34]:
          - strong [ref=f3e35]: "100"
          - generic [ref=f3e36]: HEALTH
          - generic [ref=f3e37]: ACCESS LOCKED
        - generic [ref=f3e40]:
          - generic [ref=f3e41]:
            - strong [ref=f3e42]: "2"
            - generic [ref=f3e43]: STILL HERE
          - generic [ref=f3e44]:
            - strong [ref=f3e45]: "0"
            - generic [ref=f3e46]: EXTRACTED
          - generic [ref=f3e47]:
            - strong [ref=f3e48]: "0"
            - generic [ref=f3e49]: LOST
      - generic [ref=f3e50]:
        - text: NEXT MOVE
        - heading "Buy yourself some time." [level=2] [ref=f3e51]
        - paragraph [ref=f3e52]: Find a glowing terminal. Solo work or meaningful shared-room defense can earn your credential. Hold G + movement to place furniture; rotate it to seal a doorway.
      - generic [ref=f3e53]:
        - generic [ref=f3e54]:
          - generic [ref=f3e55]: PACK / 3 / 6 KG
          - generic [ref=f3e56]: click to use
        - generic [ref=f3e57]:
          - button [ref=f3e58] [cursor=pointer]:
            - text: "1"
            - strong [ref=f3e59]: Medkit
            - generic [ref=f3e60]: 1 use · 2kgRestore 55 HP
          - button [ref=f3e61] [cursor=pointer]:
            - text: "2"
            - strong [ref=f3e62]: Flare
            - generic [ref=f3e63]: 2 uses · 1kgLight · 65s
          - group [ref=f3e64]:
            - generic "Equipment effects" [ref=f3e65] [cursor=pointer]
      - generic [ref=f3e66]:
        - generic [ref=f3e67]:
          - generic [ref=f3e68]: LEARNING CONTINUITY
          - button "Inspect ↗" [ref=f3e69] [cursor=pointer]
        - generic [ref=f3e70]:
          - generic [ref=f3e71]: PY
          - generic [ref=f3e72]:
            - strong [ref=f3e73]: Tier 1 · repair verify
            - generic [ref=f3e74]: 2 / 80 D1 checkpoints verified
          - generic [ref=f3e75]: "02"
        - generic [ref=f3e76]:
          - generic [ref=f3e77]: PE
          - generic [ref=f3e78]:
            - strong [ref=f3e79]: Tier 1 · diagnose all
            - generic [ref=f3e80]: 8 / 112 D1 checkpoints verified
          - generic [ref=f3e81]: "08"
        - paragraph [ref=f3e82]: "1 PY : 2 PE · Next: PY retention review · D1"
        - generic [ref=f3e83]: ◇ Original roadmap preserved · revision 9
      - generic [ref=f3e84]:
        - text: BUILDING FREQUENCY
        - paragraph [ref=f3e86]: The stairwell radio is quiet.
```