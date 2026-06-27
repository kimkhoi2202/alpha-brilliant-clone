# BrainLift for AlphaBrilliant Phase 2: Koji, the Voice-First AI Tutor

## Owners

Khoi Lam (Primary Owner)

---

## Purpose

**Primary Purpose:** To articulate the pedagogical and architectural thesis behind **Phase 2 of AlphaBrilliant** (a Brilliant.org-style, learn-by-doing course on the Pythagorean theorem) as it grows an AI layer on top of a deliberately zero-AI Phase 1 engine. The central bet is that the right way to put a large language model into a *teaching* product is **voice-first, answer-withholding, and architecturally subordinate to a deterministic truth engine**. The AI companion, **Koji**, can *talk and listen*, *see the lesson's typed state*, and *operate the app* via tools, but he is never allowed to be the source of mathematical truth, and the app must still teach completely with AI switched off.

This document captures the *thinking*: the spiky points of view, the learning science that grounds them, and the experts whose work shaped them, not the build log.



### In Scope

- The **pedagogy of an AI math tutor**: when to help, how to help, and (most importantly) when to *refuse* to help.
- The case for **voice as the primary learning modality** for an at-home consumer learning app, and the cognitive science that both supports and complicates it.
- The **reliability architecture** that lets an unreliable, hallucination-prone model power a product where a single wrong answer is disqualifying (the "verification firewall").
- **Grounding / context engineering**: feeding the model typed lesson state rather than scraped screen text.
- **Additivity**: why "AI-native" must be a leverage claim, not a dependency claim.
- Verified, adaptive problem generation ("Infinite Practice") as an application of the same firewall principle.



### Out of Scope

- Building a general-purpose chatbot or open-ended conversational agent. Koji is grounded and tool-scoped, not a chat box.
- AI-authored **pedagogy**: new lessons, new interaction kinds, AI-generated figures, or AI-rewritten feedback. Generation is restricted to *problems within the proven schema*.
- **Learning-science scheduling**: spaced repetition, mastery sequencing, and full adaptive *sequencing* are deferred to Phase 3. Phase 2 adapts only *difficulty*.
- Subjects beyond the Pythagorean theorem; multi-learner / classroom features; a parent/teacher analytics dashboard.
- Claims about voice that this build does not yet earn, e.g. measured retention lifts. Where the science is contested, this document says so rather than overclaiming.

---

## DOK 4: Spiky Points of View (SPOVs)

> Each Spiky POV names the conventional view, then the contrarian stance that overturns it. Every one below is a defensible position, synthesized from the learning science in the Knowledge Tree and grounded in how the product was actually built.



### SPOV 1: The study-science default treats serious learning as a product of effortful *writing*. For an at-home learning app, though, **voice is the superior primary modality**, because the binding constraint is engagement, not per-rep encoding depth, and a learner reasoning *aloud* is doing real encoding anyway.

**The consensus counter-view, stated honestly and at full strength.** The study-science default would pick text, and it has good reasons. Robert Bjork's **desirable difficulties** framework holds that conditions which *slow you down* during learning, making you work harder to produce and retrieve, are exactly what produce durable long-term retention (Bjork, 1994; Soderstrom & Bjork, 2015). The **generation effect** (Slamecka & Graf, 1978) shows that information a learner *generates* is remembered better than information merely read, and typing forces generation. Writing is slow, effortful, and legible to the writer's own metacognition; it is the canonical "desirable difficulty." A serious learning scientist, handed the choice between "the student types out their reasoning" and "the student chats with a friendly voice," would, all else equal, pick the keyboard. Three of this document's own experts lean this way: Justin Sung warns that the moment a learner stops actively constructing and starts passively listening, encoding quality collapses; Mayer's **modality principle** has a documented boundary condition: printed words can beat spoken words precisely when the material is *symbol-heavy and technical* (Mayer, 2005), and mathematics is nothing if not symbol-heavy; and the production-effect literature is explicit that producing information aloud improves *retention and distinctiveness* but **does not** improve deep comprehension or inference (MacLeod & Bodner, 2017). On the merits of a single, controlled study rep, text has the stronger hand.

**The spiky case for voice-first.** That entire argument quietly assumes the realistic alternative to "talking to Koji" is "carefully writing an essay-length chain of reasoning." For a consumer app a teenager uses on a phone, on a couch, on a Tuesday night, **it is not.** The realistic alternative to talking is *quitting*: closing the app. The binding constraint for at-home learning is not the encoding depth of any given repetition; it is **whether the learner takes the next repetition at all.** Voice has the lowest activation energy of any input modality: no typing math notation on a touch keyboard, no friction, no "ugh, later." It keeps the learner *inside the productive-struggle loop* long enough for the loop to matter. A slightly shallower rep that actually happens beats a textbook-perfect rep that doesn't. This is the same logic Bloom's 2-sigma problem rests on (the gains come from *staying in* a tight feedback loop with a responsive tutor) and the same logic the Freeman et al. (2014) active-learning meta-analysis rests on: the intervention only works if students keep participating.

Voice is also not as cognitively cheap as the consensus assumes; when designed correctly, it is itself a strong encoding act:

- **The production effect.** Saying material *aloud* reliably beats reading it silently, an effect named and characterized by MacLeod, Gopie, Hourihan, Neary & Ozubko (2010). The mechanism is *distinctiveness*: a spoken record is more discriminable at retrieval. Crucially, the benefit accrues to **the person doing the producing.** So when the design forces the *learner*, not Koji, to talk through their reasoning, voice converts from a passive channel into an active encoding event.
- **Mayer's modality principle.** People learn more deeply from graphics + spoken words than from graphics + on-screen text, because audio offloads the words onto the verbal channel and frees the visual channel for the figure (Mayer, 2005; modality effect median *d* ≈ 1.0). Koji speaks while the triangle and the KaTeX equation stay on screen: eyes on the problem, words in the ear. The visual channel is never asked to read prose *and* parse a diagram at once.
- **Sung's active-encoding lens.** Voice aligns with high-quality encoding *if and only if* it is engineered so the learner reasons aloud rather than passively absorbing Koji's explanation.

**Why this is a strong SPOV and not a hot take: the failure mode is real, and the product is built to defeat it.** Voice's obvious failure mode is degenerating into passive listening: Koji explains, the learner nods, nothing is encoded. The science above is precisely what tells us how to avoid it, and the build implements those mitigations as code, not vibes:

- Koji is forbidden from stating answers. His realtime persona reads, verbatim: *"Never say the final numeric answer yourself, and never compute it out loud"*. The correct answer is deliberately **omitted from the voice prompt entirely**: the grounding step that feeds Koji the lesson state is built from the givens and the learner's own answer, never from the correct answer.
- The reveal is **effort-gated**, and one of the two ways to satisfy the gate is *talking it through*: the gate checks whether the learner has talked to Koji. The design literally rewards the learner for producing speech, which is the production effect operationalized.
- Koji's instructions tell him to *"Celebrate effort, not just correct answers"* and to nudge, not lecture.

And the honest scope: voice is an **engagement-and-retention** lever, not a comprehension silver bullet. The production effect doesn't deepen understanding on its own, so comprehension still rides on the *active reasoning* Koji elicits, the on-screen visuals, and the verified engine underneath. Voice-first is the right *primary* bet; text stays available in the same unified thread for the learner who wants to slow down and write.

### SPOV 2: The reflex for making an LLM safe in a teaching product is better prompt engineering. In fact, **for anything checkable, prompting is the wrong layer: you make the model *irrelevant to correctness* with a deterministic verification firewall, and demote the LLM to a phrasing engine.**

The industry reflex when an AI says something wrong is to write a better prompt: "Be accurate." "Do not hallucinate." "Double-check your math." This is fundamentally unsound for a *teaching* product, where the cost function is asymmetric and brutal: a tutor that confidently emits a wrong Pythagorean answer even 1% of the time is not 99% good: it is disqualified, because it teaches the wrong thing with authority. And generative models are structurally bad at exactly this: as Khan Academy's own engineers put it, generative AI "was not designed to handle mathematical reasoning… it uses all of the language it is trained on to predict the most probable numbers… The most probable number in the training data is not always the correct answer" (Khan Academy, 2024).

So Phase 2 refuses to negotiate with the model about truth. The architecture draws a hard line: **a pure, deterministic engine owns correctness, and nothing AI-proposed reaches the learner until that engine certifies it.**

- Ground truth is the deterministic grading engine from Phase 1, plus an independent math check for recomputation.
- Every generated problem must pass a **round-trip**: the deterministic grading engine must regrade its own generated answer as correct, *and* numeric relationships (e.g. √(a²+b²)) are independently re-derived with an independent math check, *and* any figure must reference one of the hand-built visual templates. A numeric problem the firewall cannot independently recompute **fails closed**: it is discarded, never shown.
- Even "reveal the answer" is **engine-computed**, never model-generated.
- Hints get a second backstop: the server post-checks the model's hint text for the rendered answer and swaps in a static hint if it leaks: a server-side answer-leak check plus a client-side answer-leak check. Defense in depth.

This is not anti-AI; it is the only design that makes the AI *safe to be additive*. The model still does what models are uniquely good at: warm, personalized, context-aware *phrasing*. It just never gets to decide what's true. Khanmigo arrived at the same conclusion independently, bolting a behind-the-scenes "math agent" onto GPT-4 to verify calculations against verified content (Khan Academy, 2024): strong convergent evidence that *demoting the model below a deterministic checker* is the correct architecture for math tutoring, not a quirk of this build.

### SPOV 3: It is taken for granted that the best AI tutor is the most *helpful* one: fast, complete answers on demand. In reality, **the most pedagogically valuable thing an AI tutor can do is *refuse to give the answer***: making the answer *earned* protects the retrieval and productive-struggle loop where learning actually happens.

An LLM's default temperament is sycophantic completion: ask for the answer, get the answer. For a search engine that's the product; for a tutor it is **actively harmful**, because it short-circuits the single most evidence-backed mechanism in all of learning science. Roediger & Karpicke (2006) and Karpicke & Roediger (2008) show that *retrieval practice*, the effortful act of producing an answer from memory, produces dramatically better long-term retention than restudying, and, damningly, that students **cannot feel this working** (their confidence is uncorrelated with their actual retention). A tutor that hands over answers feels great and teaches little. It optimizes the learner's *comfort* against the learner's *learning*.

So Koji is built to withhold, and the withholding is enforced structurally, not just requested in a prompt:

- **Effort-gated.** The reveal tool refuses unless the learner has made a genuine attempt **and** engaged Koji (a hint or a conversation). No effort, no answer. The old instant "See answer" button is removed while AI is on.
- **Learner-initiated only.** Koji's persona forbids auto-revealing; the gate is the enforced backstop.
- **Personalized to the gap, not just the number.** When the reveal *is* earned, it names the learner's specific misconception, diagnosed deterministically (recognizing "added the legs," "forgot the square root," "subtracted the legs," "counted one square," "picked a leg, not the hypotenuse," …), then walks them through the engine-computed working.
- **Marked as assisted.** A revealed step never counts as first-try mastery, so the learner's progress signal stays honest.

This is the practitioner consensus among people who actually ship tutors: Khanmigo's headline design choice is that, *"unlike other AI tools such as ChatGPT, Khanmigo doesn't just give answers… it guides learners to find the answer themselves,"* and Khan Academy tracks "giving the answer away before a student submitted" as a *guardrail metric to minimize* (Khan Academy, 2024). Restraint is the feature.

### SPOV 4: The fashionable reading of "AI-native" is that the AI *is* the product. But **"AI-native" must mean *additive, never load-bearing***: you build the AI-off path *first*, so that with the flag off the app is byte-for-byte the Phase-1 MVP and the AI can never break the product.

"AI-native" is fashionable and usually means "the app falls over if the model is down, slow, rate-limited, or having a bad day." That is a *dependency* claim dressed up as an innovation claim, and it is a liability for a product whose job is to reliably teach. The spiky inversion: **AI-native is a *leverage* claim, not a dependency claim.** The AI should multiply the value of a product that already works without it.

Phase 2 enforces this by construction:

- A single AI feature flag gates everything. With it off (the default), AlphaBrilliant behaves *byte-for-byte* like the Phase-1 MVP: hand-written hints, hand-authored feedback, the fixed lesson path, zero AI, zero network calls to AI endpoints.
- Every client wrapper **early-returns a safe empty result** when the AI feature flag is off, so no AI code path can even execute. The Koji panel is gated at the host so it *does not exist* with AI off.
- On *any* runtime error or timeout, AI paths degrade gracefully to the Phase-1 static hints/feedback. The learner never hits a broken tutor or a dead end.
- The hand-written feedback isn't legacy cruft; it is *deliberately retained as the fallback*, which is why AI-rewriting it is explicitly out of scope.

Building the off-path first is what makes the firewall (SPOV 2) and the restraint (SPOV 3) cheap to guarantee: there is always a correct, hand-authored thing to fall back to. AI as the upgrade, never the foundation.

### SPOV 5: The assumed lever for better AI output is a cleverer prompt. In practice, **context engineering beats prompt engineering**: ground the model in *typed lesson state*, never scraped DOM or rendered KaTeX.

Most "AI tutor" integrations feed the model the rendered page (the HTML, the KaTeX, the screen text) and then try to coax good behavior with prompt incantations. This is backwards. The rendered page is lossy, noisy, ambiguous, and expensive in tokens; a rendered snippet of KaTeX tells the model far less, far less reliably, than the structured object that *generated* it. The higher-leverage move is **context engineering**: hand the model the same typed state the app's own logic runs on.

In Phase 2:

- The grounding step that feeds Koji the lesson state constructs a compact, JSON-safe payload from the structured lesson state, the learner's typed answer, and their attempt history, **never** from rendered DOM, KaTeX, or screen text.
- The payload carries the engine-computed correct answer so the model never has to *compute* a fact (it only phrases around one), and a human-readable rendering of every answer so the server's leak-check has a real target.
- Both the text agent and the realtime voice agent are grounded from this one typed payload, so all surfaces see the same clean state.

Smaller prompts, lower cost, fewer hallucinations, and (because the givens are typed) the diagnosis and verification layers can reason about the same objects the model sees. Prompt engineering tunes *how* the model talks; context engineering controls *what it knows*, and what it knows is what makes it correct.

---



## DOK 3: Insights

> Synthesized realizations that bridge the Knowledge Tree (DOK 2) and the SPOVs (DOK 4). Each carries an explicit SPOV connection.

**Insight 1: For home learning, engagement is the binding constraint, so the modality that keeps the learner *in the loop* wins, even at some cost to per-rep encoding depth.** Bloom's 2-sigma gains and the Freeman active-learning gains both depend on the learner *continuing to participate* in a tight feedback loop. In a consumer setting the dominant failure mode isn't a shallow repetition; it's *abandonment*. Lowering the activation energy of the next interaction is therefore the highest-leverage design decision, and voice has the lowest activation energy of any input.

> **SPOV Connection:** Primary support for **SPOV 1 (voice-first)**; also underpins **SPOV 3** (an earned answer keeps them in the loop rather than ending it).

**Insight 2: Speaking your reasoning aloud is simultaneously the *lowest-friction input* and a *high-quality encoding act*, but only when the learner does the talking.** The production effect means the spoken word benefits *the producer*. This collapses what looks like a trade-off ("convenient OR effective") into a synergy ("convenient AND effective"), conditional on a design that makes the *learner* reason aloud rather than passively receive Koji's explanation.

> **SPOV Connection:** Core of **SPOV 1 (voice-first)**; the "learner must produce" condition is enforced by the answer-withholding persona and the talk-to-unlock reveal gate of **SPOV 3**.

**Insight 3: An LLM that can be wrong about math is *disqualifying*, so reliability cannot be a prompt property: it must be an architectural one.** Because the cost of a confidently-wrong math answer is categorical (not marginal), no amount of prompt tuning reaches an acceptable error rate. The only sound response is to move correctness *out of the model* into a deterministic checker the model cannot override. Khanmigo's independently-invented "math agent" is convergent evidence.

> **SPOV Connection:** Direct foundation of **SPOV 2 (verification firewall)**; also enables **SPOV 4** by guaranteeing a correct fallback always exists.

**Insight 4: The single most valuable behavior an AI tutor can exhibit is *restraint*: withholding the answer to protect retrieval practice.** Retrieval practice is the best-evidenced mechanism in learning science, and learners are metacognitively blind to it: they will *ask* for the very thing that undermines their learning. A good tutor must therefore protect the learner from their own (rational-feeling) request for the answer.

> **SPOV Connection:** Core of **SPOV 3 (effort-gated reveal)**; the restraint is only safe to enforce because **SPOV 4** guarantees a graceful, complete experience around it.

**Insight 5: "AI-native" is a *leverage* claim, not a *dependency* claim.** A product that breaks when the model is unavailable has taken on risk, not added capability. The defensible version of "AI-native" is an app that fully works without AI and is *multiplied* by it, which is also the only way the firewall and the restraint are cheap to guarantee (there's always a correct hand-authored thing to fall back to).

> **SPOV Connection:** Core of **SPOV 4 (additive, not load-bearing)**; the precondition that makes **SPOV 2** and **SPOV 3** practical to ship.

**Insight 6: Typed state is a better prompt than rendered text: what the model *knows* matters more than how you *ask*.** The structured object that produced the screen is a richer, cheaper, less ambiguous context than the screen itself. Grounding in typed state shrinks prompts, cuts cost, reduces hallucination, and (because the model and the verifier reason over the same objects) makes the firewall coherent.

> **SPOV Connection:** Core of **SPOV 5 (context engineering)**; the structured correct answer it carries is what makes **SPOV 2's** leak-checks and round-trips possible.

**Insight 7: Mayer's modality boundary condition is a *design constraint*, not a refutation of voice.** Printed words can beat spoken words for symbol-heavy, technical material, and math is symbol-heavy. The correct reading isn't "don't use voice"; it's "keep the *symbols* visual and make the *conversation* audio." Koji talks; the equation and triangle stay on screen. Voice and visuals are split along exactly the channel boundary Mayer's theory prescribes.

> **SPOV Connection:** Strengthens and honestly bounds **SPOV 1 (voice-first)**; an application of the dual-channel basis from the Multimedia & Modality knowledge category.

---



## Experts

> Researched for accuracy of frameworks, contributions, and handles. Justin Sung is primary (the owner's anchor); the roster is kept at six by folding closely-related researchers (Bjork, MacLeod; Ericsson) into the entries they're most associated with.



### 1. Justin Sung (*primary*)

**Who:** Former medical doctor turned learning coach; co-founder of **iCanStudy**; widely-followed educator on the science of *how* to learn.

**Focus / main views:** Sung's central claim is that most students fail not at *retrieval* or *storage* but at **encoding**, and specifically at *higher-quality* encoding, i.e. building integrated, relational, **higher-order knowledge structures** rather than shallow ones (a constructivist framing tied to the upper tiers of **Bloom's taxonomy**). He argues retrieval practice (flashcards, testing) is genuinely useful but *easy to execute and over-relied upon*, while the harder, higher-leverage skill (elaborative, self-regulated encoding) is what students neglect. He teaches **cognitive load management**, **metacognition / self-regulated learning**, **SIR** (spaced interleaved retrieval), and the **GRINDE** mind-mapping framework (**G**rouped, **R**eflective/relational, **I**nterconnected, **N**on-verbal, **D**irectional, **E**mphasized) as a tool for forcing high-order encoding. He is pointedly critical of passive techniques: rereading, highlighting, and leaning on flashcards/spaced repetition *without* good encoding underneath.

**Why Follow:** Sung is the owner's anchor expert and serves a deliberately *double* role in this BrainLift. He **supports** the active-processing design: Koji is built to make the learner *do the cognitive work* (reason aloud, attempt before reveal) rather than receive answers, which is exactly Sung's encoding-first prescription. And he **honestly complicates SPOV 1**: Sung is the expert most likely to warn that voice can decay into passive listening, the lowest-quality encoding state. Holding both at once is what makes the voice SPOV a real argument rather than a slogan: the product's answer-withholding persona and talk-to-unlock reveal gate are precisely the mechanisms that keep voice on the active-encoding side of Sung's line.

**Where:**

- iCanStudy: [https://icanstudy.com/](https://icanstudy.com/)
- YouTube: [https://www.youtube.com/@JustinSung](https://www.youtube.com/@JustinSung)
- Reference notes on his framework: [https://notes.alexandriathylane.com/Learning-Science--and--Pedagogy/iCanStudy---Justin-Sung/Justin-Sung-on-learning](https://notes.alexandriathylane.com/Learning-Science--and--Pedagogy/iCanStudy---Justin-Sung/Justin-Sung-on-learning)



### 2. Benjamin Bloom

**Who:** Educational psychologist (1913–1999), University of Chicago; author of Bloom's taxonomy and originator of the **2-sigma problem**.

**Focus / main views:** Bloom (1984) reported that students tutored one-to-one with **mastery-learning** techniques performed about **two standard deviations** above conventionally-taught peers (the average tutored student outscoring 98% of the control class), with mastery learning alone worth about +1 sigma. He framed this not as a victory but as a *problem*: one-to-one tutoring is too costly to scale, so the challenge is to find group methods that approach its effect. He is also the namesake of **Bloom's taxonomy** of cognitive objectives (remember → understand → apply → analyze → evaluate → create).

**Why Follow:** The 2-sigma problem is the foundational business and pedagogical case for an AI tutor: software is the first plausible way to give *every* learner a responsive, mastery-oriented 1:1 tutor at near-zero marginal cost. His taxonomy is also the backbone of Sung's "higher-order learning" language. Cited honestly: modern meta-analyses suggest the original 2-sigma figure is likely overstated (real tutoring effects often land nearer 0.3–0.7 SD), so this BrainLift treats "2 sigma" as a directional north star, not a literal promise.

**Where:**

- Bloom, B. S. (1984). *The 2 Sigma Problem.* Educational Researcher, 13(6): [https://gwern.net/doc/psychology/1984-bloom.pdf](https://gwern.net/doc/psychology/1984-bloom.pdf)
- Overview: [https://en.wikipedia.org/wiki/Bloom%27s_2_sigma_problem](https://en.wikipedia.org/wiki/Bloom%27s_2_sigma_problem)



### 3. Richard E. Mayer

**Who:** Distinguished Professor of Psychology, UC Santa Barbara; originator of the **Cognitive Theory of Multimedia Learning (CTML)**.

**Focus / main views:** CTML rests on three assumptions: **dual channels** (separate visual/pictorial and auditory/verbal processing), **limited capacity** per channel, and **active processing**. From these Mayer derives design principles, including the **modality principle** (people learn more deeply from graphics + *spoken* words than graphics + on-screen text; median *d* ≈ 1.0), the **redundancy principle** (graphics + narration beats graphics + narration + identical on-screen text; *d* ≈ 0.86), and **coherence** (remove extraneous material; *d* ≈ 0.86). He also documents *boundary conditions*, e.g. printed words can be preferable for technical terms/symbols, non-native speakers, or hearing-impaired learners.

**Why Follow:** Mayer supplies the cognitive-load basis for the voice SPOV: speaking while the eyes stay on the figure offloads the verbal channel and protects the visual channel from overload. Equally important, his boundary condition (text can win for symbol-heavy material) is the honest constraint that shapes the design: keep the *equation and triangle visual*, make the *conversation audio*. Mayer turns "voice feels nicer" into a falsifiable, channel-level claim.

**Where:**

- Modality principle (Cambridge Handbook): [https://www.cambridge.org/core/books/multimedia-learning/modality-principle/E5CD6E01CEA0B568CE260F66A3CD0D1F](https://www.cambridge.org/core/books/multimedia-learning/modality-principle/E5CD6E01CEA0B568CE260F66A3CD0D1F)
- Mayer, R. E. (2017). *Using multimedia for e-learning.* J. Computer Assisted Learning: [https://onlinelibrary.wiley.com/doi/10.1111/jcal.12197](https://onlinelibrary.wiley.com/doi/10.1111/jcal.12197)



### 4. Henry L. Roediger III & Jeffrey D. Karpicke (*with Robert A. Bjork & Colin M. MacLeod*)

**Who:** Roediger (Washington University in St. Louis) and Karpicke (Purdue) are the leading modern researchers of the **testing/retrieval effect**; Robert A. Bjork (UCLA) coined **desirable difficulties**; Colin M. MacLeod (University of Waterloo) named and characterized the **production effect**.

**Focus / main views:** Roediger & Karpicke (2006) and Karpicke & Roediger (2008, *Science*) show that **retrieval practice**, effortfully producing an answer from memory, produces far better long-term retention than restudying, and that learners are **metacognitively blind** to this benefit. Bjork's **desirable difficulties** (1994) frames such effortful conditions as *good for retention even though they slow initial performance*. The **generation effect** (Slamecka & Graf, 1978) shows self-generated material is better remembered than read material. MacLeod, Gopie, Hourihan, Neary & Ozubko (2010) named the **production effect**: producing information *aloud* beats silent reading via added encoding *distinctiveness*.

**Why Follow:** This cluster is the scientific backbone of two SPOVs at once. The testing/generation/desirable-difficulty work is the case for **answer-withholding** (SPOV 3): the answer must be *retrieved*, not received. The production effect is a load-bearing pillar of **voice-first** (SPOV 1): when the *learner* speaks their reasoning, voice *is* a strong encoding act. Cited honestly: the production effect is strongest in *mixed-list* designs and improves *retention/distinctiveness*, not deep comprehension, which is exactly why this BrainLift positions voice as an engagement-and-retention lever, with comprehension carried by active reasoning + the engine + visuals.

**Where:**

- Karpicke & Roediger (2008), *The Critical Importance of Retrieval for Learning*, Science: [https://www.science.org/doi/10.1126/science.1152408](https://www.science.org/doi/10.1126/science.1152408)
- MacLeod & Bodner (2017), *The Production Effect in Memory*, Current Directions in Psychological Science: [https://journals.sagepub.com/doi/10.1177/0963721417691356](https://journals.sagepub.com/doi/10.1177/0963721417691356)
- Roediger & Karpicke (2006), testing-effect article (PDF): [http://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Roediger-Karpicke-2006_PPS.pdf](http://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Roediger-Karpicke-2006_PPS.pdf)



### 5. Sal Khan / Khanmigo (Khan Academy)

**Who:** Sal Khan, founder of Khan Academy; **Khanmigo** is its GPT-4-based AI tutor (piloted March 2023).

**Focus / main views:** Khanmigo is explicitly designed to **guide rather than give answers**: *"unlike other AI tools such as ChatGPT, Khanmigo doesn't just give answers… it guides learners to find the answer themselves,"* using Socratic prompting. To handle math reliably, Khan Academy added a behind-the-scenes **"math agent"** that verifies calculations and checks expressions against *verified content*, generated textual representations of graphics so the model can "see" them, and tracks **guardrail metrics** including math error rate and *"giving the answer away before a student submitted."*

**Why Follow:** Khanmigo is the real-world precedent for Koji on *both* contested SPOVs. Its answer-withholding Socratic stance validates **SPOV 3 (restraint)** at production scale. Its math-agent-over-verified-content architecture is independent convergent evidence for **SPOV 2 (verification firewall)**: the same conclusion that *generative models must be demoted below a deterministic checker for math*. And Khan Academy's candid admission that genAI "was not designed to handle mathematical reasoning" is the clearest statement of the hallucination risk the firewall exists to neutralize.

**Where:**

- Khanmigo: [https://www.khanmigo.ai/](https://www.khanmigo.ai/)
- Khan Academy (2024), *Khanmigo Math Computation and Tutoring Updates*: [https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/](https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/)
- *How Khan Academy Is Building a Better AI Tutor*: [https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/)



### 6. Carl Wieman (*with Anders Ericsson, deliberate practice*)

**Who:** Nobel-laureate physicist (Stanford) turned science-education researcher; a leading champion of **active learning**. Anders Ericsson (1947–2020) was the originator of **deliberate practice**.

**Focus / main views:** Wieman argues that learning is doing: students must actively grapple with problems, not passively receive lectures. The landmark Freeman et al. (2014) PNAS meta-analysis (225 STEM studies), which Wieman championed, found active learning raised exam scores by ~0.47 SD and that students in traditional lecture courses were **1.5× more likely to fail** (33.8% vs 21.8%). Ericsson's **deliberate practice** adds that expertise comes from *effortful, feedback-rich, targeted* practice at the edge of current ability, not mere repetition.

**Why Follow:** Wieman is the empirical case that *learning-by-doing beats passive reception*: the foundation of AlphaBrilliant's entire "learn-by-doing course" premise and a direct support for **SPOV 1** (voice that keeps learners *actively participating*) and **SPOV 3** (productive struggle over spoon-fed answers). Ericsson's deliberate-practice lens motivates **Infinite Practice**: targeted problems at adaptive difficulty with immediate, verified feedback.

**Where:**

- Freeman et al. (2014), *Active learning increases student performance in STEM*, PNAS: [https://www.pnas.org/doi/10.1073/pnas.1319030111](https://www.pnas.org/doi/10.1073/pnas.1319030111)
- Wieman, C. (2014), *Large-scale comparison of science teaching methods sends clear message*, PNAS commentary: [https://www.pnas.org/doi/10.1073/pnas.1407304111](https://www.pnas.org/doi/10.1073/pnas.1407304111)

---



## DOK 2: Knowledge Tree

> Organized broad → specific: each category lists **DOK 1: Facts** (concrete, cited) then a **DOK 2: Summary & Analysis** that ties the facts to the product and to specific SPOVs.



### Category 1: The 2-Sigma Problem & Mastery Learning



#### 1.1 One-to-one tutoring + mastery learning

**Source:** Bloom, B. S. (1984). *The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring.* Educational Researcher, 13(6), 4–16. [https://gwern.net/doc/psychology/1984-bloom.pdf](https://gwern.net/doc/psychology/1984-bloom.pdf)

**DOK 1: Facts**

- The average one-to-one-tutored student (with mastery learning) scored ~**2 SD** above the conventional-class average, outperforming **98%** of the control class.
- Mastery learning *alone* (in a 30-student class) produced ~**+1 SD** (above ~84% of the control class).
- Time-on-task rose from ~65% (conventional) to ~75% (mastery) to ~90%+ (tutoring); attitudes/interest were most positive under tutoring.
- Bloom framed the result as a *scalability problem*: tutoring is "too costly for most societies to bear on a large scale."
- Later meta-analyses suggest the 2-sigma figure is likely overstated; real tutoring effects often land closer to 0.3–0.7 SD.

**DOK 2: Summary & Analysis** Bloom is *why an AI tutor is worth building at all*: he quantified the prize (a responsive, mastery-oriented 1:1 tutor) and named the obstacle (cost/scale) that software is uniquely positioned to dissolve. Note the mechanism behind his numbers: *time-on-task* climbs steeply with tutoring. That is the empirical seed of **Insight 1** and **SPOV 1**: the tutoring advantage is, in large part, an *engagement* advantage, which is exactly what a low-friction voice companion is designed to maximize at home. It also motivates **SPOV 3**: tutoring works through tight feedback and correction loops, not answer-dispensing. Cited honestly (the overstatement caveat), it functions here as a directional north star, not a promised effect size.

### Category 2: Encoding & Higher-Order Learning (Sung)



#### 2.1 Encoding vs. retrieval; higher-order knowledge structures; GRINDE

**Source:** Justin Sung / iCanStudy, interview notes and framework summaries. [https://notes.alexandriathylane.com/Learning-Science--and--Pedagogy/iCanStudy---Justin-Sung/Justin-Sung-on-learning](https://notes.alexandriathylane.com/Learning-Science--and--Pedagogy/iCanStudy---Justin-Sung/Justin-Sung-on-learning) · [https://www.youtube.com/@JustinSung](https://www.youtube.com/@JustinSung)

**DOK 1: Facts**

- Sung distinguishes **encoding** (forming knowledge structures) from **storage/retrieval** (accessing them) and argues most students fail at *higher-quality encoding*.
- "Higher-quality encoding" = higher-order thinking that builds **integrated, relational knowledge structures**, correlated with more durable, meaningful retention (a constructivist framing).
- He teaches **SIR** (spaced interleaved retrieval) and warns that retrieval practice is *easy to execute and over-relied upon* relative to harder encoding skills (elaboration, self-explanation, mind-mapping).
- **GRINDE** mind-mapping = **G**rouped, **R**eflective, **I**nterconnected, **N**on-verbal, **D**irectional, **E**mphasized: a protocol for forcing high-order encoding.
- He is critical of passive techniques: rereading, highlighting, and flashcards/spaced-rep *without* good encoding.

**DOK 2: Summary & Analysis** Sung is the lens that keeps the voice bet honest. His encoding-first view *demands* that the learner do active cognitive work, and the product obliges: Koji withholds answers and pushes the learner to reason, and the reveal is unlocked by *engaging* (ideally *talking through*) the problem. But Sung is also the strongest internal critic of **SPOV 1**: he'd flag that listening to Koji explain is exactly the passive, low-quality encoding he warns against. The resolution baked into the design (learner produces, Koji nudges) is what moves voice from passive reception to active encoding, satisfying Sung rather than contradicting him. His higher-order/Bloom framing also informs why generation is restricted to *problems within the proven schema*: Phase 2 doesn't ask the model to invent pedagogy.

### Category 3: Retrieval, Generation & Production Effects (the "speak aloud" evidence)



#### 3.1 The testing / retrieval-practice effect

**Source:** Karpicke, J. D., & Roediger, H. L. (2008). *The Critical Importance of Retrieval for Learning.* Science, 319(5865), 966–968. [https://www.science.org/doi/10.1126/science.1152408](https://www.science.org/doi/10.1126/science.1152408)

**DOK 1: Facts**

- Repeated **testing** (retrieval) produced a large positive effect on delayed recall; repeated **studying after learning** had essentially *no* added effect.
- Students' **predictions of their own performance were uncorrelated** with actual retention: a metacognitive blind spot.
- The effect is robust across materials and designs (Roediger & Karpicke, 2006).



#### 3.2 The generation effect & desirable difficulties

**Source:** Slamecka & Graf (1978), the generation effect; Bjork, R. A. (1994), *desirable difficulties* (see Soderstrom & Bjork, 2015). Overview via Roediger & Karpicke (2011), *Intricacies of Spaced Retrieval*. [http://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Roediger-Karpicke-2011.pdf](http://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Roediger-Karpicke-2011.pdf)

**DOK 1: Facts**

- **Generation effect:** self-generated items are remembered better than read items.
- **Desirable difficulties:** conditions that *slow* acquisition (testing, generation, varied/spaced practice) often *improve* long-term retention and transfer.
- Boundary: desirable difficulties can become *un*desirable when working-memory load (element interactivity) is too high (cognitive-load moderation).



#### 3.3 The production effect

**Source:** MacLeod, C. M., & Bodner, G. E. (2017). *The Production Effect in Memory.* Current Directions in Psychological Science. [https://journals.sagepub.com/doi/10.1177/0963721417691356](https://journals.sagepub.com/doi/10.1177/0963721417691356) (effect named by MacLeod, Gopie, Hourihan, Neary & Ozubko, 2010).

**DOK 1: Facts**

- Producing material **aloud** yields substantially better memory than silent reading; the mechanism is encoding **distinctiveness**.
- Speaking gives the largest benefit, but writing, typing, and even mouthing also help.
- The effect is **strongest in mixed-list designs** (some items produced, some not); producing *everything* can shrink it.
- It improves **retention/recognition**, but **not** deep comprehension or inference.

**DOK 2: Summary & Analysis** This is the category that makes **SPOV 1** more than a convenience argument and **SPOV 3** more than a UX preference. The testing/generation/desirable-difficulty research is the hard case for **answer-withholding**: the learner must *retrieve and generate*, not receive, and they will be *blind to why that's good*, which is exactly why restraint must be enforced in code (the reveal tool's effort gate) rather than left to the learner's judgment. The production effect is the pillar under voice-first: when the *learner speaks their reasoning*, voice becomes a distinctiveness-boosting encoding act, turning the "convenient vs. effective" trade-off into a synergy (**Insight 2**). The honesty is built into the citations: production helps retention, not comprehension, and shines in *mixed* production, so the design treats voice as one channel among several (visuals + verified engine carry comprehension) rather than a cure-all, and keeps both spoken and typed turns available.

### Category 4: Multimedia & Modality (the cognitive-load basis for voice)



#### 4.1 The Cognitive Theory of Multimedia Learning; the modality & redundancy principles

**Source:** Mayer, R. E. (2005/2009). *Modality Principle*, in The Cambridge Handbook of Multimedia Learning; Mayer (2017), *Using multimedia for e-learning*, JCAL. [https://www.cambridge.org/core/books/multimedia-learning/modality-principle/E5CD6E01CEA0B568CE260F66A3CD0D1F](https://www.cambridge.org/core/books/multimedia-learning/modality-principle/E5CD6E01CEA0B568CE260F66A3CD0D1F) · [https://onlinelibrary.wiley.com/doi/10.1111/jcal.12197](https://onlinelibrary.wiley.com/doi/10.1111/jcal.12197)

**DOK 1: Facts**

- CTML assumes **dual channels** (visual + auditory), **limited capacity** per channel, and **active processing**.
- **Modality principle:** deeper learning from graphics + *spoken* words than graphics + on-screen text (median *d* ≈ 1.0; 17/17 tests in one review): audio offloads words to the verbal channel and frees the visual channel for the figure.
- **Redundancy principle:** graphics + narration beats graphics + narration + identical on-screen text (*d* ≈ 0.86).
- **Boundary conditions:** printed words may be preferable for **technical terms/symbols**, non-native speakers, or hearing-impaired learners; modality helps most when material is complex and fast-paced.

**DOK 2: Summary & Analysis** Mayer converts the voice bet from aesthetic preference into a channel-level, falsifiable claim, and supplies its honest constraint. The supportive read (**SPOV 1**): Koji *speaks* while the triangle/equation stay on screen, so the learner's eyes process the figure while the ears process the words: textbook modality-principle design, and the reason voice + visuals beats text-on-text here. The constraining read (**Insight 7**): because math is symbol-heavy, the boundary condition warns against trying to convey the *equation itself* by voice. The design respects this exactly: symbols remain *visual* (on-screen KaTeX), conversation is *audio*. This is also why the build skips AI-generated visuals and keeps the hand-built visual templates: the visual channel is too important to hand to an unverified generator.

### Category 5: Active Learning & Deliberate Practice



#### 5.1 Active learning vs. lecture (large-scale meta-analysis)

**Source:** Freeman, S., et al. (2014). *Active learning increases student performance in science, engineering, and mathematics.* PNAS, 111(23), 8410–8415. [https://www.pnas.org/doi/10.1073/pnas.1319030111](https://www.pnas.org/doi/10.1073/pnas.1319030111) (commentary: Wieman, 2014).

**DOK 1: Facts**

- Meta-analysis of **225 STEM studies**: active learning raised exam/concept-inventory scores by **~0.47 SD** (~6% on exams).
- Failure rates were **33.8% under lecture vs 21.8% under active learning**: lecture students **1.5× more likely to fail** (a 55% relative increase).
- Effects held across disciplines and class sizes; largest in small classes; robust to publication-bias checks.
- Ericsson's **deliberate practice**: expertise comes from effortful, feedback-rich practice targeted at the edge of current ability.

**DOK 2: Summary & Analysis** This is the empirical floor under AlphaBrilliant's whole premise (a *learn-by-doing* course, not a video lecture) and a direct support for both **SPOV 1** and **SPOV 3**. "Active" is not décor; it is the variable that moves failure rates by half. Voice-first matters here because the cheapest way to *keep* a learner active at home is to remove input friction (**Insight 1**). Deliberate practice grounds **Infinite Practice**: not random drills but *adaptive-difficulty* problems with immediate, *verified* feedback: difficulty derived from the learner's own attempt history (first-try rate ≥ 0.8 and low attempts → harder; struggling → easier), each problem checked by the firewall before display.

### Category 6: AI Tutors in Practice & Their Failure Modes



#### 6.1 Khanmigo: Socratic restraint + a math-verification agent

**Source:** Khan Academy (2024). *Khanmigo Math Computation and Tutoring Updates* and *How Khan Academy Is Building a Better AI Tutor.* [https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/](https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/) · [https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/)

**DOK 1: Facts**

- Khanmigo is designed **not to give direct answers**; it uses Socratic questioning to guide students to the answer themselves.
- Generative AI "was not designed to handle mathematical reasoning… it predicts the most probable numbers… not always the correct answer."
- Khan Academy added a behind-the-scenes **"math agent"** that verifies calculations and checks expressions against **verified content**; it also generates **textual descriptions of graphics** so the model can "see" them.
- Guardrail metrics tracked include **math error rate** and **"giving the answer away before a student submitted"**; prompts require evaluation harnesses because identical prompts yield different outputs and long prompts get partially ignored.

**DOK 2: Summary & Analysis** Khanmigo is the strongest real-world corroboration in this BrainLift, and it lands on *three* SPOVs at once. (1) Its answer-withholding Socratic design is independent validation of **SPOV 3 (restraint)**, and it operationalizes the very gate Koji enforces ("don't give the answer away before they've attempted"). (2) Its math-agent-over-verified-content architecture is convergent evidence for **SPOV 2 (verification firewall)**: a leading team independently concluded that *the model must be demoted below a deterministic checker for math*. (3) Khan's note that prompts are non-deterministic and partially-ignored validates **SPOV 2** further: you cannot prompt your way to reliability, so AlphaBrilliant does the same thing structurally with round-trips through the deterministic grading engine plus an independent math check, and server/client leak firewalls. Khan's practice of grounding in *typed/verified content* (and converting graphics to text) is the same instinct as **SPOV 5 (context engineering)**: ground in structured truth, not rendered pixels.

#### 6.2 Hallucination as a categorical risk for teaching

**Source:** Synthesis of Khan Academy (2024, above) and the structural nature of LLMs.

**DOK 1: Facts**

- LLMs generate the *most probable* token sequence, which for arithmetic need not be the correct value.
- For a tutor, a confidently-wrong answer mis-teaches with authority: an asymmetric, categorical cost, not a marginal one.

**DOK 2: Summary & Analysis** This fact is the entire reason **SPOV 2** and **SPOV 4** exist. Because the downside is categorical, the response can't be "reduce the error rate a bit with prompting"; it must be "make the model unable to determine truth" (firewall) and "guarantee a correct hand-authored fallback always exists" (additive/AI-off-first). Together they convert an unreliable component into a safe one: the model phrases; the engine decides; and if the model is absent or wrong, the Phase-1 experience is right there underneath.

---



## References

- Bloom, B. S. (1984). The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring. *Educational Researcher, 13*(6), 4–16. [https://gwern.net/doc/psychology/1984-bloom.pdf](https://gwern.net/doc/psychology/1984-bloom.pdf)
- Freeman, S., Eddy, S. L., McDonough, M., Smith, M. K., Okorafor, N., Jordt, H., & Wenderoth, M. P. (2014). Active learning increases student performance in science, engineering, and mathematics. *PNAS, 111*(23), 8410–8415. [https://www.pnas.org/doi/10.1073/pnas.1319030111](https://www.pnas.org/doi/10.1073/pnas.1319030111)
- Karpicke, J. D., & Roediger, H. L. (2008). The Critical Importance of Retrieval for Learning. *Science, 319*(5865), 966–968. [https://www.science.org/doi/10.1126/science.1152408](https://www.science.org/doi/10.1126/science.1152408)
- Khan Academy (2024). Khanmigo Math Computation and Tutoring Updates. [https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/](https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/)
- Khan Academy (2024). How Khan Academy Is Building a Better AI Tutor. [https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/)
- MacLeod, C. M., & Bodner, G. E. (2017). The Production Effect in Memory. *Current Directions in Psychological Science, 26*(4), 390–395. [https://journals.sagepub.com/doi/10.1177/0963721417691356](https://journals.sagepub.com/doi/10.1177/0963721417691356)
- MacLeod, C. M., Gopie, N., Hourihan, K. L., Neary, K. R., & Ozubko, J. D. (2010). The production effect: Delineation of a phenomenon. *JEP: LMC, 36*(3), 671–685. [https://pubmed.ncbi.nlm.nih.gov/20438265/](https://pubmed.ncbi.nlm.nih.gov/20438265/)
- Mayer, R. E. (2005/2009). The Modality Principle. In *The Cambridge Handbook of Multimedia Learning.* [https://www.cambridge.org/core/books/multimedia-learning/modality-principle/E5CD6E01CEA0B568CE260F66A3CD0D1F](https://www.cambridge.org/core/books/multimedia-learning/modality-principle/E5CD6E01CEA0B568CE260F66A3CD0D1F)
- Mayer, R. E. (2017). Using multimedia for e-learning. *Journal of Computer Assisted Learning, 33*(5), 403–423. [https://onlinelibrary.wiley.com/doi/10.1111/jcal.12197](https://onlinelibrary.wiley.com/doi/10.1111/jcal.12197)
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science, 17*(3), 249–255. [http://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Roediger-Karpicke-2006_PPS.pdf](http://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Roediger-Karpicke-2006_PPS.pdf)
- Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. *JEP: Human Learning and Memory, 4*(6), 592–604.
- Soderstrom, N. C., & Bjork, R. A. (2015). Learning versus performance: An integrative review. *Perspectives on Psychological Science, 10*(2), 176–199.
- Sung, J. / iCanStudy. Encoding vs. retrieval; higher-order learning; the GRINDE framework. [https://icanstudy.com/](https://icanstudy.com/) · [https://www.youtube.com/@JustinSung](https://www.youtube.com/@JustinSung)
- Wieman, C. E. (2014). Large-scale comparison of science teaching methods sends clear message. *PNAS, 111*(23), 8319–8320. [https://www.pnas.org/doi/10.1073/pnas.1407304111](https://www.pnas.org/doi/10.1073/pnas.1407304111)

---



## Appendix A: How Phase 2 Was Actually Built

> The original build-retrospective BrainLift, preserved. Where the body of this document is about the *thinking*, this appendix is about the *making*: tools, workflow, prompting strategies, the shipped/skipped/deferred ledger, and the AI-vs-human code split.



### A.1 Tools & workflow

- **Cursor** as the editor/agent host, driving a **10-agent orchestrated swarm** with roles: ai-foundation, backend-functions, tools, tutor-text, voice, generation, reveal-pedagogy, ui-animation, code-reviewer, and qa-swarm-lead.
- **Disjoint ownership + git worktrees.** Each agent owned one slice and worked in a sibling worktree, on a feature branch, merged by PR into stacked integration branches (problem generation, then the Koji tutor, then the AI features). Cross-agent contracts were pinned in code so parallel work composed without collisions.
- **Ralph-style looping.** A standing task brief defines a binary Done-bar (both pillars, AI-never-wrong, AI-off-safe, green type-check / lint / build, UI bar); the loop iterates until every box is true rather than stopping at "looks done."
- **Multi-pass review cadence.** Code review re-reviews after fixes until explicit APPROVE; **Emil** design/animation runs ≥3 passes; the **impeccable-swarm** UI/UX QA runs partition→inspect→fix→re-verify loops; **ponytail** complexity passes (a per-diff review and a pre-promotion audit) cut over-engineering. The git history shows this directly (e.g. commits for backend review fixes, ponytail safe cuts, and Emil UI passes).



### A.2 Prompting strategies that worked

1. **Grounded-state tool briefs.** Every agent was told to build prompts from *typed state* serialized as compact JSON, never scraped DOM/KaTeX. This kept prompts small, cheap, and correct. *(This is SPOV 5 in practice.)*
2. **"Verify with the engine; the model only phrases."** Ground truth is the deterministic grading engine plus an independent math check. Generated problems must pass a grading **round-trip** before display; reveals are engine-computed; the model is demoted to a phrasing layer. *(SPOV 2.)*
3. **Disjoint-ownership parallel agents with explicit contracts.** Rather than one agent doing everything, each owned a file set behind a typed interface, so foundation/backend/voice/generation could be built simultaneously and merged cleanly.
4. **Don't trust the prompt: add a code backstop.** Hint prompts say "DO NOT state the value," *and* a server-side leak firewall re-checks the output and swaps in a static hint if the answer slips through. Defense in depth, not vibes.
5. **AI-off-first / additive.** Build the fallback path first: every client wrapper early-returns a safe empty result when the AI feature flag is off, so no AI path can break the app. *(SPOV 4.)*



### A.3 Phase 2 decisions: shipped / skipped / deferred


| Decision                                                                                                                                                                                                                                                 | Status               | Why                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Koji grounded tutor**: progressive text hints, deterministic-diagnosis explanations, **realtime voice**, **app tool-control** | ✅ Shipped            | The core "AI-native" ask: a tutor that *sees* lesson state and *operates* the app with the learner.                                                                       |
| **Effort-gated, personalized reveal**                                                                                                                                                                                                                    | ✅ Shipped            | Protects the learn-by-doing loop: answer is earned (genuine attempt + Koji engagement), engine-computed, marked assisted.                                               |
| **Verified adaptive generation / "Infinite Practice"**                                                                                                                                                                                                   | ✅ Shipped            | Course never runs dry; every problem passes the verification firewall.                                                                                                    |
| **Voice-first Koji panel** (mascot + mic + unified voice/text thread; typing rides the same realtime session)                                                                                                                                            | ✅ Shipped            | Voice is the primary modality; text shares one thread.                                                                                    |
| **Open web chatbot**                                                                                                                                                                                                                                     | ❌ Skipped            | Koji is grounded and tool-scoped, not a free-form chat box.                                                                                                               |
| **AI-generated visuals / whole lessons / feedback-rewrite**                                                                                                                                                                                              | ❌ Skipped            | Use the safe hand-built visual templates and hand-written feedback (the latter *is* the AI-off fallback); generate problems *within* the proven schema, not new pedagogy. |
| **Spaced repetition / mastery scheduling / full adaptive sequencing**                                                                                                                                                                                    | ⏭ Deferred → Phase 3 | That's learning-science scheduling. Phase 2 adapts only *difficulty* inside generation.                                                                                   |




### A.4 Code analysis: AI-generated vs hand-written

Honestly: **this build is ~entirely AI-generated and AI-orchestrated.** Effectively all shipped code (the AI layer, the backend functions, the API, the practice components, and the Koji UI) was written by the agent swarm. The human contribution was *direction and judgment*, not code: the PRD and locked decisions, the headline voice-first thesis, the agent role definitions and prompts, the architectural guardrails (additive flag, verification firewall, secrets server-side), and the review/merge gating. So the split is roughly **~100% AI-written code / 100% human-decided constraints**: the leverage was in framing the problem so the swarm couldn't ship something wrong.

### A.5 Key learnings (the seeds of the SPOVs above)

- **A verification firewall beats prompt engineering.** Reliability came from code that *checks* the model (round-trip grading, leak detection), not from a cleverer prompt. → **SPOV 2.**
- **Ground in typed state, not screen text.** Feeding the model the structured lesson state and the learner's typed answer made prompts smaller, cheaper, and far more accurate than scraping the rendered page. → **SPOV 5.**
- **Build AI-off first; AI is the upgrade, not the product.** Because the flag-gated app is byte-for-byte Phase 1 with AI off, the AI is never load-bearing and there's always a graceful fallback. → **SPOV 4.**
- **Restraint is a feature.** The hardest pedagogy decision was making the tutor *refuse* the answer until it's earned. → **SPOV 3.**
- **Voice is the main use case, designed to stay active.** Voice wins on engagement and (when the learner talks) on encoding, provided the design keeps the learner producing rather than passively listening. → **SPOV 1.**
- **The swarm's bottleneck is review, not authoring.** Parallel agents produce code fast; the multi-pass review/ponytail cadence is what keeps quality and complexity in check, and counters the model's instinct to over-build.

