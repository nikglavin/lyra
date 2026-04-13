# LLM Efficiency and Context Management Playbook Aussie Edition

Core Philosophy Treat the LLM like a top tier consultant you are paying by the minute. Stop having a yarn with the bot and
start architecturing the context.

## Principle 1 The Kill the Thread Strategy

Long chat threads are the main reason models start losing the plot. As a thread grows, the model’s attention gets bogged down
by old irrelevant rubbish.

- The Checkpoint Method Once a sub task is sorted (e.g. the outline is done or the bug is found), grab that result.
- The Hard Reset Start a fresh thread for the next stage. Paste only the final result from the last thread as your Current
  State.
- Benefit Keeps the model’s IQ high by cutting out Token Bloat and historical noise.

## Principle 2 The Master Context Document

Stop repeating yourself like a broken record. Keep a single Source of Truth file for your project.

- Content Include your Aussie English preferences (S instead of Z, etc.), brand voice, target audience, and non negotiable
  rules.
- Usage Upload this file or paste it right at the start of every new thread.
- Library Tip Name this \_CONSTRAINTS.md or \_PROJECT_RULES.txt.

## Principle 3 Modular Execution Step by Step

Asking for a massive complex output in one go is a dog's breakfast—the model will get lazy and give you generic results.

- The Workflow
  1.  Phase A: Brainstorm/Outline.
  2.  Phase B: Section by section drafting.
  3.  Phase C: Review/Optimisation.
- The Instruction Tell the model straight: "Don't write the whole thing yet. First, give me the structure for [Task]. I'll
  tell you when to crack on with step 1."

## Principle 4 Negative Prompting and Filtering

Tokens are mental bandwidth. Every irrelevant word you feed the AI distracts it from the actual job at hand.

- Cut the Noise If you’re providing a massive dataset, tell the model what to ignore (e.g. "Ignore the CSS, just focus on the
  JavaScript logic").
- Format Enforcement Use No Fluff instructions.
- Example: "Give me the solution directly. No preamble, no 'No worries, I can help with that,' and no summary at the end."

## Principle 5 The Consultant Prompting Frame

Stop giving the AI simple commands and start giving it Objectives and Roles.

| Instead of...                 | Use the Expert Frame...                                                                                             |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| "Check this code for errors." | "You are a Senior Security Engineer. Audit this code for vulnerabilities and suggest performance optimisations."    |
| "Write a blog post about X."  | "Act as a Content Strategist. Create an outline for X that targets an Australian audience and avoids Americanisms." |

## Quick Checklist for Every New Prompt

- Is this a fresh thread? (If the chat is getting long, bin it and start over.)
- Is the Objective isolated? (Am I asking for one specific thing?)
- Are delimiters used? (Using triple backticks or tags to separate instructions from data.)
- Is the Source of Truth included? (Project rules/context.)
- Is the output format specified? (Bullet points, JSON, Markdown, etc.)

Pro Tip If the AI starts giving short half baked answers, it’s Context Poisoned. Copy the last good bit of work and move to a
clean thread.
