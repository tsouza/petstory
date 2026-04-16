---
description: Review a visualization file/component against PetStory viz simplicity + Data Humanism rules.
argument-hint: <file-path>
---

Run the `viz-judge` sub-agent on the file at `$ARGUMENTS`.

Steps:

1. Read the file.
2. Invoke `use viz-judge on $ARGUMENTS`.
3. Report the verdict (APPROVED / NEEDS WORK / REJECTED) with all violations and concrete recommendations.
4. If any visual design is present, also invoke `use brand-guardian on $ARGUMENTS`.
5. If the viz renders AI-generated text about pet health, also invoke `use clinical-safety-reviewer on $ARGUMENTS`.

Do not make changes automatically. Report only. Ask the user whether to apply the suggested fixes.
