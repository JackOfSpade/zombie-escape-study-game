# Fall damage calibration

The game uses a deterministic injury curve with a full-health lethal endpoint of 15 m, replacing the former 9 m endpoint. This is a gameplay approximation informed by adult fall-height research, not a prediction of an individual's survival or a claim that 15 m falls always kill.

## Research

There is no single average number of survivable storeys. Height, impact surface, age and injuries affect outcomes; survival with hospital treatment also does not imply being able to continue moving normally.

- Spearpoint and Hopkin's empirical model estimates 50% fatality likelihood at 15 m for an adult falling onto a hard surface, and 90% at 23.8 m. Its limitations include incomplete treatment of injury details and medical care. This provides a useful height scale, not a guaranteed-death threshold. [Fire Safety Journal, 2020](https://doi.org/10.1016/j.firesaf.2020.102973).
- Dickinson and colleagues studied 117 prehospital patients aged 16 or older, including people who died at the scene. Their estimated height for 50% mortality varied from 10.5 m with head/chest injuries to 22.4 m without those injuries. This selected emergency cohort illustrates why height alone is insufficient. [Falls from height: injury and mortality, 2012](https://pubmed.ncbi.nlm.nih.gov/22860503/).
- Smith and colleagues' trauma-center series included 97 patients. Their median-lethal-height estimate changed from approximately 15 m to 20 m when the assumed storey height changed. Hospital selection and uncertain height conversions limit generalization. [Some patients live after trauma, 2017](https://doi.org/10.1177/1460408616689807).

Use metres for calibration. A game storey is 3.6 m, so 15 m is approximately 4.2 game storeys; real buildings need not have the same floor spacing.

## Gameplay curve

`fallDamage` in `src/engine.ts` linearly interpolates between these anchors and caps damage at 100 HP:

| Drop         | Game storeys | Damage | HP remaining from 100 |
| ------------ | ------------ | ------ | --------------------- |
| Up to 2.5 m  | Up to 0.69   | 0      | 100                   |
| 3.6 m        | 1            | 17     | 83                    |
| 7.2 m        | 2            | 50     | 50                    |
| 10.8 m       | 3            | 75     | 25                    |
| 14.4 m       | 4            | 95     | 5                     |
| 15 m or more | 4.17 or more | 100    | 0                     |

The existing 2.5 m grace preserves jumping and short drops as gameplay conveniences; it is not a real-world safe height. One-storey injury stays approximately unchanged, while longer falls can leave a full-health survivor badly injured. The curve uses the research's median-risk region as a deterministic endpoint, rather than adding random deaths. HP values are balance choices, not mortality percentages. Previously injured actors can die from shorter falls.

Damage uses the highest feet position since the last grounded support, so jumping can increase the eventual drop. Standing on a new surface resets that peak. The roof plate is 14.4 m high; standing on its 1 m parapet and stepping off produces a lethal 15.4 m fall.

Unit checks cover anchors, interpolation, the short-drop allowance and the lethal boundary. GameTest fixtures cover actual one-storey and three-storey gallery falls, the roof-parapet fall, airborne save/reload continuity and fall events. Browser coverage checks the one-storey landing and a subsequent harmless jump.
