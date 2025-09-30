# Organized Codebase - Automation Rules

## Documentation Management Automation
- Update README.md table of contents when adding new files to PLANNING/ directory
- Validate Markdown formatting in all documentation files after editing
- Sync project brief changes to architecture documentation automatically
- Generate documentation index when files are added to DOCUMENTATION/ directory
- Check for broken internal links in markdown files after editing
- Update project description in README.md when PLANNING/01-project-brief.md changes

## Planning Synchronization Automation
- Update PLANNING/05-implementation-roadmap.md when PLANNING/02-requirements.md changes
- Sync PLANNING/04-user-stories.md with PLANNING/03-architecture.md when either changes
- Validate completion checklist consistency when AGENT-HANDOFF/ files are modified
- Update project timeline when implementation roadmap milestones change
- Generate planning summary when multiple planning files are edited in same session
- Cross-reference user stories with requirements when either document is updated

## Agent Handoff Coordination Automation
- Update AGENT-HANDOFF/coding-instructions.md when PLANNING/03-architecture.md changes
- Validate AGENT-HANDOFF/completion-checklist.md when project scope changes in planning
- Sync AGENT-HANDOFF/file-structure.md when new directories are created in project
- Generate agent context summary when handoff files are updated
- Create handoff package when iteration reaches completion criteria
- Update dependencies list when architecture or requirements change

## Iteration Management Automation
- Create new iteration folder in ITERATIONS/ when version number increases in project brief
- Update iteration status when completing tasks in any version folder
- Sync AGENT-HANDOFF/dependencies.md when file structure changes
- Generate iteration summary when completing version milestones
- Archive completed iterations to maintain project organization
- Track iteration progress across all planning documents

## Project Structure Maintenance Automation
- Update setup-template.sh when project structure changes
- Validate all referenced files exist when documentation is updated
- Generate project tree structure when directories are added or removed
- Update .gitignore when new file types are introduced
- Maintain consistent formatting across all markdown files
- Create backup of planning files before making structural changes

## Quality Assurance Automation
- Spell check all markdown files after editing
- Validate internal document references are correct
- Check that all user stories have corresponding architecture sections
- Ensure implementation roadmap aligns with project requirements
- Verify completion checklist covers all planned features
- Generate quality report when major planning changes are made