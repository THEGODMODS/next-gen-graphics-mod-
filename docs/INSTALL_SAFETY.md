# Installation safety rules

These rules are mandatory for every installer and updater.

- Never clean a PES directory by deleting files merely because they are unfamiliar or absent from a guessed vanilla-file list.
- Never delete saves, option files, edit data, settings, screenshots, or unknown files as part of a mod installation.
- Treat a file as manager-owned only when it is recorded in the manager's own install journal with its path, module ID, hash, and backup reference.
- Before replacing an existing file, create and verify a backup.
- Stage package contents outside the live game path, validate paths and hashes, then apply changes.
- If an apply step fails, roll back all changes from that transaction.
- If an uninstall target has been modified since installation, preserve it and ask the user how to proceed.
- Show a human-readable change preview before applying a module.
- Keep backups until the user explicitly removes them or a configured retention policy expires with clear notice.
- Log every file operation and provide a diagnostics export.

Unknown files are preserved by default. Safety takes priority over automated cleanup.
