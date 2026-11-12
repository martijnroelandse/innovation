# Innovation — STM conference prototypes

Three separate experiments for STM Innovation & Integrity Days 2026:
- [DeltaX](deltax/): compare manuscript versions.
- [InspectX](inspectx/): inspect papers, authors, source evidence and publication notices.
- [RefleX](reflex/): stress-test tools and model organisational impact.

Part of martijnroelandse.dev bv. Public build only; no source PDFs, private corpus, credentials or user uploads. Article snapshots retain their CC BY licences and provenance in the app. Author profile requests are live public API lookups and are not bundled as assessments of people. No integrity or misconduct verdicts.

Retraction Watch metadata: official Crossref/Retraction Watch CSV, derived into exact-DOI shards. Snapshot retrieval time, upstream URL, record counts and SHA256 are retained in inspectx/data/retractions/meta.json. Attribution: Retraction Watch / Center for Scientific Integrity and Crossref. Source: https://www.crossref.org/documentation/retrieve-metadata/retraction-watch/ . No match is not a clearance; corrections, retractions, expressions of concern and reinstatements remain distinct notice records.

Source maintained in the private spielerei experiment workspace; regenerate with experiments/build-innovation.py. Independent paper UI in experiments/reflex/inspectx.html, inspect-ui.js, inspect-context.js and inspect-context-ui.js. This repository is an allowlisted static release, not the private source repository.
