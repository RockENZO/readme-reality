# Launch materials — drafts, not sent

## Show HN

Title: Show HN: Readme Reality — catch broken quickstart references without running them

I maintain several small open-source projects. Missing training scripts and renamed startup commands made it into their README instructions, so I extracted a small static checker from that experience.

It checks local Markdown references, declared npm/pnpm/yarn scripts, Python file paths and pip requirements files. Every result has a line number and repository evidence. Unknown shell syntax is explicitly skipped. No LLM, key, upload or target command execution.

Try the labelled browser examples or run the release bundle against a local checkout. It does not prove a command will run and overlaps with broader tools such as DocGuard. I'd particularly value minimal false-positive cases and feedback about installation friction.

## LinkedIn

Built Readme Reality: a small offline developer tool that checks README quickstart references against a repository snapshot. The CLI, GitHub Action and browser examples share one deterministic engine. It reports the evidence it checked and the instructions it could not analyze, rather than calling everything verified.

Project: https://github.com/RockENZO/readme-reality
Demo: https://rockenzo.github.io/readme-reality/

## Maintainer pilot

Draft invitation: “Would you be interested in trying an offline README checker on one project? I’m looking for installation problems and false positives, not a star exchange. Here are its supported checks and limitations: [README]. No need to share private code.”

Send individual invitations only after explicit authorization and to relevant, willing recipients. Aim for five genuine trials as an experiment, not a fabricated usage statistic. Follow each community's posting rules. No mass issues, unsolicited automated PR campaigns or coordinated stars.

Record only actual evidence: trial date, public project or consented identifier, installation outcome, confirmed useful finding, false positive and feedback permission. No users have been recruited by this release task. The 16-star milestone is an aspiration, not a delivery guarantee.
