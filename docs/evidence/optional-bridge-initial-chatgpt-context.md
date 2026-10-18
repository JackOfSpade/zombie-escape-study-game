# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chatgpt-handoff.spec.ts >> ChatGPT handoff UI: exact generation survives reload, tutoring stays private, world completion precedes separate assisted assessment
- Location: tests/browser/chatgpt-handoff.spec.ts:11:1

# Error details

```
Error: page.evaluate: TypeError: Cannot convert undefined or null to object
    at Object.assign (<anonymous>)
    at eval (eval at evaluate (:370:30), <anonymous>:5:14)
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
          - strong [ref=f3e19]: 00:03
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
      - status [ref=f3e30]: "Live study profile: original curriculum state retained; development visits are not academic evidence."
    - generic [ref=f3e31]:
      - generic [ref=f3e32]:
        - generic [ref=f3e33]:
          - text: LINKED ROOM · ONE WORKSPACE / PERSONAL STAIR ACCESS
          - heading "Controlled handoff question" [level=2] [ref=f3e34]
        - button "Leave Esc" [ref=f3e35] [cursor=pointer]
      - generic [ref=f3e36]: ChatGPT handoff · Native Study Mode unverified
      - generic [ref=f3e37]:
        - article [ref=f3e38]: Explain the contract and its boundaries. Synthetic transport fixture.
        - generic [ref=f3e39]:
          - text: Shared workspace
          - generic [ref=f3e40]: v1
        - textbox "Puzzle workspace" [ref=f3e41]: Human-authored synthetic reasoning after a supplied boundary hint; this does not demonstrate independent mastery.
        - generic [ref=f3e42]:
          - button "Submit captured revision ↗" [ref=f3e43] [cursor=pointer]
          - generic [ref=f3e44]: Edits save immediately. Survival continues.
        - generic [ref=f3e45]:
          - button "Terminal AI · private" [ref=f3e46] [cursor=pointer]
          - button "Group frequency" [active] [ref=f3e47] [cursor=pointer]
        - generic [ref=f3e49]:
          - strong [ref=f3e50]: You
          - paragraph [ref=f3e51]: Which boundary remains unresolved?
        - paragraph [ref=f3e52]: Preparing a summary of recorded group work… Survival continues.
        - group [ref=f3e53]:
          - generic "Recorded group work (1)" [ref=f3e54]
        - paragraph [ref=f3e56]:
          - text: Application restarted; retry the exact saved group question.
          - button "Retry saved group question" [ref=f3e57] [cursor=pointer]
        - generic [ref=f3e58]:
          - textbox "Message" [ref=f3e59]:
            - /placeholder: Ask, reason, or share an observation…
          - button "Send ↑" [ref=f3e60] [cursor=pointer]
```