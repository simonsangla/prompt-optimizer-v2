# Feature Specification: Prompt Optimizer App

**Feature Directory**: `specs/001-prompt-optimizer-app`
**Created**: 2026-08-31
**Status**: Draft
**Input**: "for my new prompt optimizer app"

## Overview

People write rough, half-formed prompts. Existing prompt-improvement tools rewrite them into something polished — and in the process quietly change what was asked for: they add requirements nobody stated, drop constraints that mattered, and hand back a confident result with no way to tell what was altered. The user cannot check the rewrite without re-reading it word by word against their original, which defeats the point of using the tool.

This product turns a rough prompt into a clear, structured, executable one **and shows the user what it did not change**. Every result carries a fidelity report. Where information is genuinely missing, the product asks a question or labels an assumption instead of inventing an answer.

## User Scenarios & Testing *(mandatory)*

### Primary User Story

A person has a rough idea of what they want from an AI assistant. They paste their unpolished prompt, choose where it is headed (a coding agent, a chat assistant, an API call, an image model), and get back a structured prompt they can copy and use immediately — accompanied by a plain statement of whether their meaning survived, and a list of anything the product had to guess or could not determine.

### Acceptance Scenarios

1. **Given** a rough prompt containing specific details (a budget, a deadline, a named tool, an excluded technology), **When** the user optimizes it, **Then** every one of those details appears in the result and the fidelity report confirms none were lost.

2. **Given** a rough prompt that omits the desired output format, **When** the user optimizes it, **Then** the result does not invent a format and instead surfaces an explicit open question asking for one.

3. **Given** a rewrite that introduces a requirement absent from the original (a word count, a platform limit, a technology choice), **When** the fidelity check runs, **Then** the result is flagged rather than presented as clean, and the invented item is named.

4. **Given** a prompt written in a language other than English, **When** the user optimizes it, **Then** the result is returned in the same language and is never silently translated.

5. **Given** a prompt that is already well-structured, **When** the user optimizes it, **Then** the product does not degrade it or pad it with invented sections.

6. **Given** the user has a result they are satisfied with, **When** they copy it, **Then** they receive the complete prompt text ready to paste elsewhere.

### Edge Cases

- Contradictory instructions in the source (for example, "very detailed" and "under 100 words"): the contradiction is preserved and surfaced, not silently resolved in one direction.
- A prompt so vague that little can be structured: the product asks rather than fabricating a plausible-sounding brief.
- A very long prompt: the product either handles it or refuses clearly; it never truncates silently.
- The optimization engine is unavailable: the user still gets a usable, meaning-safe result rather than an error page, and is told the capability is reduced.
- An attempted improvement that makes fidelity worse: the user receives the better of the available results, never a regression.

## Requirements *(mandatory)*

### Functional Requirements

**Core transformation**

- **FR-001**: The product MUST accept a free-form prompt of any structure and return a restructured version organized into labelled sections.
- **FR-002**: The product MUST let the user state the intended destination of the prompt, and MUST shape the section structure to suit that destination.
- **FR-003**: The product MUST accept optional additional context from the user and treat it as source material of equal standing to the prompt itself.
- **FR-004**: The product MUST return the result in the same language as the source prompt.

**Meaning preservation — the core promise**

- **FR-005**: The product MUST NOT introduce any requirement, fact, quantity, or named entity that is not present in, or directly implied by, the user's source material.
- **FR-006**: The product MUST preserve every specific detail from the source verbatim, including quantities, names, references, and excluded options.
- **FR-007**: When information needed for a complete prompt is missing, the product MUST surface it as an explicit open question rather than supplying a plausible value.
- **FR-008**: When the product makes a minor inference to keep the prompt coherent, it MUST label that inference visibly as an assumption.
- **FR-009**: The product MUST NOT silently discard a requirement present in the source.

**Verification and evidence — what makes the promise checkable**

- **FR-010**: The product MUST verify every result against the source before presenting it, and MUST display the outcome of that verification alongside the result.
- **FR-011**: The verification MUST distinguish outcomes it can determine reliably from outcomes that are advisory judgement, and MUST NOT let an advisory signal alone condemn a result as failed.
- **FR-012**: The product MUST present a clear overall verdict distinguishing at minimum: meaning confirmed intact, needs human review, and fidelity problem detected.
- **FR-013**: When verification finds a problem, the product MUST name the specific item at fault rather than reporting a generic failure.
- **FR-014**: The product MUST attempt to correct a result that fails verification, and MUST return the better of the original and corrected attempts rather than assuming the correction improved matters.
- **FR-015**: The product MUST NOT present a result as verified when verification did not actually run or could not complete; unavailable verification MUST be shown as unavailable, never as a pass.

**Delivery**

- **FR-016**: The product MUST let the user copy the finished prompt in one action.
- **FR-017**: The product MUST state which processing capability is currently active whenever that affects the quality the user receives.
- **FR-018**: The product MUST remain usable when its highest-capability engine is unavailable, degrading to a mode that cannot violate FR-005.

**Hosted operation**

- **FR-019**: The publicly reachable version MUST perform full rewriting, at the same fidelity standard as local use. A restructuring-only production experience does not satisfy this specification.
- **FR-020**: Because the hosted rewriting engine is metered against the operator's own account and the product has no user accounts, the product MUST prevent people other than the operator from consuming it. An unauthenticated public URL backed by a metered engine is a defect, not a launch state.
- **FR-021**: The product MUST make clear to the operator that hosted rewriting sends prompt text to a third-party provider, since that is a change from the local mode's guarantee that nothing leaves the machine.

### Key Entities

- **Source prompt**: the user's original text, plus any extra context supplied. The reference against which everything is judged.
- **Protected detail**: a specific element of the source (quantity, name, reference, exclusion, quoted phrase) that must survive into the result unchanged.
- **Optimized prompt**: the restructured result, organized into destination-appropriate sections.
- **Assumption**: an inference the product made, shown to the user rather than hidden.
- **Open question**: information the product needed, could not derive, and refused to invent.
- **Fidelity report**: the set of verification outcomes plus the overall verdict, presented with the result.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across a representative set of rough prompts, 100% of specific source details (quantities, names, references, exclusions) appear in the optimized result.
- **SC-002**: When a rewrite is deliberately corrupted — a constraint removed, a number altered, a fact added, the audience swapped, the language changed — the product detects and reports every such corruption, while a faithful rewrite is never falsely accused.
- **SC-003**: A user can tell, without re-reading their original prompt line by line, whether their meaning survived.
- **SC-004**: A user can go from pasting a rough prompt to holding a usable optimized prompt in under one minute.
- **SC-005**: Zero results are presented as verified when a fidelity problem was actually detected.
- **SC-006**: When the product lacks information, it asks rather than invents — measured as zero fabricated requirements across the representative set.
- **SC-007**: A first-time user understands what the fidelity report is telling them without needing documentation.
- **SC-008**: The hosted version produces results of the same standard as local use, measured on the same representative prompt set; no capability gap between "the version I run" and "the version that is deployed".
- **SC-009**: No one other than the operator can trigger a metered rewrite in production.

## Assumptions

- The user supplies the prompt text; the product does not fetch or infer context from external systems on the user's behalf.
- The product optimizes prompts; it does not execute them or return the answer to the underlying task.
- Preserving meaning outranks producing elegant prose. Where the two conflict, fidelity wins, even if the result reads less smoothly.
- Verification that cannot be performed is reported as unavailable rather than assumed to pass.
- The product has no user accounts. Restricting hosted use to the operator (FR-020) is an access-control concern, not a user-management feature.
- Sending prompt text to a third-party provider is an accepted tradeoff for hosted rewriting. The local mode remains the option where nothing leaves the machine.
- A representative prompt set spans the realistic range of use: coding tasks, writing tasks, analysis, image generation, vague requests, contradictory requests, already-structured prompts, and non-English prompts.

## Out of Scope

- Executing the optimized prompt or evaluating the answer it produces.
- Storing prompt history, versions, or a shared prompt library.
- Team accounts, collaboration, or sharing.
- Usage tiers, billing, or abuse-handling product surfaces (single-operator tool).
- Automatically improving prompts without the user asking.

## Dependencies

- Rewriting depends on a language model being reachable. Locally this is a model on the operator's own machine; in production it is a third-party provider, which introduces a per-request cost and a data-handling consideration. Behaviour when the model is unreachable is specified in FR-018.

## Resolved Decisions

Recorded 2026-08-31. These were the three questions with no defensible default.

- **Product boundary**: **Standalone product.** This specification describes a product in its own right, not a capability contributed into the existing prompt-optimizer line. That line continues or retires on its own schedule; nothing here depends on it.
- **Hosted capability**: **Full rewriting is required in production.** Hosted language-model access is therefore in scope, along with its cost per request and the fact that prompt text reaches a third-party provider (FR-019, FR-021).
- **Audience**: **Personal tool, single operator.** No user accounts, no multi-tenant concerns, no abuse-handling product surface.

### Consequence of combining the last two

"Personal tool" and "publicly reachable production URL" are not the same statement. A single-operator product with no accounts, served from a public URL and backed by an engine metered to the operator's own account, lets any passer-by spend the operator's money. FR-020 exists because of this pairing: access must be restricted to the operator even though the product has no notion of user accounts. Absent that, the correct production configuration is the restructuring-only engine, which costs nothing per request.
