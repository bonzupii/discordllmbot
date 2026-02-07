# ADR-002: VitePress Documentation Container

**Status:** Accepted
**Date:** 2026-02-07
**Deciders:** Gemini, Lawrence

## Context
The project documentation was becoming difficult to maintain and was not well-integrated with the codebase. A dynamic, automated documentation solution was needed to ensure that the documentation stays up-to-date as the project evolves.

## Options Considered
1. **Manual Documentation:** Continue to manually update the `README.md` file.
   - Pros: No new dependencies or setup required.
   - Cons: Prone to becoming outdated, difficult to navigate, and not easily extensible.

2. **VitePress Documentation Container:** Create a dedicated Docker container to serve a VitePress site.
   - Pros: Enables dynamic generation of documentation from the codebase, provides a clean and navigable interface, and is easily extensible.
   - Cons: Adds a new dependency and requires additional setup.

## Decision
We chose to implement a VitePress documentation container. This provides a robust and scalable solution for managing the project's documentation.

## Consequences
- ✅ The project now has a dedicated, dynamic documentation site.
- ✅ The documentation can be automatically generated from the codebase, ensuring it stays up-to-date.
- ⚠️ The development environment is now slightly more complex due to the addition of the `docs` container.

## Implementation Notes
- A new `docs` service was added to the `docker-compose.yml` file.
- A `Dockerfile.docs` was created to build the documentation container.
- A `generate-docs.js` script was created to dynamically generate documentation from the `README.md` and JSDoc comments.

## References
- Related to: Session 2026-02-07
