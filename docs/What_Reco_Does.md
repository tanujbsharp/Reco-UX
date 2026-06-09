# What Reco Does

## Overview

Reco is a guided retail recommendation system for laptops.

Its job is to take a customer from:

- a vague or incomplete requirement

to:

- a clear shortlist of three recommended systems
- an explanation of why those systems fit
- a path to compare, discuss, share, and hand off the recommendation

Reco is not just a search tool and not just a chatbot. It is a guided decision system that tries to understand who the laptop is for, how it will be used, what matters most to that person, and which products in the catalog are the best fit.

## What Problem It Solves

In a retail setting, customers often do not walk in with a clean technical requirement. They usually say things like:

- "I need something for college."
- "This is for my child."
- "I want something good for coding."
- "I need something light but still powerful."
- "I am not sure what I need."

Reco is built to handle that uncertainty.

Instead of expecting the customer to know exact specs, it helps translate human needs into product recommendations.

## What Reco Is Trying To Do

Reco tries to answer four questions:

1. Who is this laptop really for?
2. What will it actually be used for?
3. What kind of experience matters most?
4. Which three products in the catalog best fit those needs?

Everything in the system is built around answering those four questions well.

## How The Journey Works

### 1. Start A Customer Session

A store user starts a recommendation session for a customer.

That session becomes the container for everything that follows:

- discovery input
- guided answers
- recommendations
- comparison choices
- feedback
- lead capture and share actions

### 2. Understand The Customer

Reco can begin in more than one way:

- voice input
- typed input
- direct question flow

If the customer speaks or types freely, Reco tries to interpret what they mean early:

- likely user type
- likely use case
- signals like portability, simplicity, performance, reliability, or premium preference

This first layer is meant to reduce ambiguity before the main question flow begins.

### 3. Ask Guided Questions

Reco then asks a short guided sequence of questions.

The goal is not to ask generic survey questions. The goal is to ask the few most useful questions that reduce uncertainty and improve recommendation quality.

The flow is built to understand things like:

- primary user
- main use case
- workload depth
- mobility pattern
- practical tradeoffs
- what matters most in day-to-day use

The ideal outcome is that by the end of the questions, Reco knows enough to stop guessing.

### 4. Turn Human Needs Into Product Fit

Reco does not rely only on what the customer literally says.

It tries to interpret the meaning behind the answers.

For example:

- "student" is not just a label, it may imply value sensitivity, mobility, and practical use
- "coding" is not automatically the same as gaming or creator use
- "for my child" can imply durability, simplicity, and support needs
- "moving between classes" should matter differently than "mostly stays on a desk"

Reco tries to build an internal picture of the customer need and then judge catalog products against that picture.

### 5. Produce A Shortlist

The output is a top-three shortlist.

Each recommendation is meant to answer:

- why this is a fit
- what it is good for
- what tradeoffs come with it

Reco is not trying to return every vaguely relevant product. It is trying to narrow the choice down to a small set of defendable recommendations.

## What Makes Reco Different From Simple Filtering

Reco is not a standard filter interface where the customer selects:

- price
- RAM
- processor
- screen size

Instead, it tries to reason from needs first.

That means the system is designed to work with natural customer intent such as:

- "for school"
- "for my parent"
- "for full-stack development"
- "lightweight and portable"
- "practical and durable"

The purpose is to recommend based on fit, not just on spec strength.

## What Reco Produces For The Customer

At the end of the flow, Reco produces:

- three recommended systems
- a rank order
- a fit explanation for each one
- benefit highlights
- comparison paths
- product detail access
- product Q&A support

The customer should leave the journey with more clarity than they started with.

## What Reco Produces For The Retail Team

Reco is also a sales-support system.

It helps the retail team by turning a conversation into:

- a structured customer need
- a recommendation outcome
- a lead or handoff opportunity
- an email/shareable result
- feedback on recommendation quality

So it is not just recommending products. It is also helping the store convert intent into a usable sales outcome.

## Key Functional Parts Of Reco

### Discovery

Reco accepts unstructured input and tries to understand it.

This is the part that handles:

- voice transcription
- typed discovery
- early interpretation of customer intent

### Guided Decision Flow

Reco uses guided questions to sharpen understanding.

This is the part that tries to move from broad intent to actionable product fit.

### Recommendation Engine

Reco evaluates products against the interpreted customer need.

This is where shortlist quality is decided.

### Explanation Layer

Reco explains why a recommendation was made.

This matters because a recommendation is only useful if the user can understand and trust it.

### Comparison

Reco allows side-by-side product comparison so the shortlist becomes easier to evaluate.

### Product Q&A

Reco supports product-specific questions after the shortlist is produced.

This helps when the customer wants clarification before making a choice.

### Lead / Handoff / Share

Reco captures the outcome of the interaction so it can be used by the sales team.

## What Good Reco Behavior Looks Like

When Reco is working well, it should:

- understand the customer without forcing technical language
- ask focused questions instead of repetitive ones
- distinguish between similar but different needs
- avoid over-recommending unnecessary power
- avoid under-recommending weak products
- explain recommendations in customer language
- give a shortlist that feels credible and tailored

If a customer says:

- student
- coding
- assignments
- moving between classes
- practical and durable

then Reco should not behave like the customer asked for:

- gaming
- rendering
- premium creator workflows

That kind of distinction is central to what Reco is supposed to do.

## What Reco Depends On To Work Well

Reco quality depends on several things going right together:

- the system must understand the customer input correctly
- the question flow must ask the right follow-ups
- the catalog data must accurately describe the products
- the recommendation logic must reward the right kind of fit
- the explanation must reflect the real reason a product was chosen

If any one of those layers is weak, the final recommendation quality drops.

## What Reco Is Ultimately Meant To Be

Reco is meant to act like a strong assisted-selling layer for laptop retail.

Its purpose is not just:

- classify a customer
- collect answers
- score products

Its real purpose is to help a customer feel:

- understood
- narrowed in
- more confident

and to help the store feel:

- more consistent
- more explainable
- more effective at converting uncertain shoppers into qualified buyers

## One-Line Summary

Reco is a guided retail decision engine that turns vague laptop-buying intent into a clear, explainable top-three recommendation shortlist, with comparison, product Q&A, and lead capture built around it.
