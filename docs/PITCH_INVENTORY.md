# Pitch resource inventory

The inventory command is a read-only first pass over one Stadium Server stadium folder. It does not modify the stadium or game installation.

```bash
npm run inventory:pitch -- "<path-to-one-stadium-folder>"
```

The selected folder must contain `common/bg/model/bg/pitch`. The command recursively records each regular file's relative path, extension, byte size, and SHA-256. File hashing is streamed rather than loading each complete asset into memory. DDS auditing reads only the header and compares its declared mip-chain size with the on-disk file size. Symbolic links are recorded but never followed.

Save the JSON output with the stadium's name/ID and keep it private if it exposes locally installed third-party content. The inventory is a discovery artifact, not proof that every listed file is loaded by PES 2017. Use Sider logs and one-file-at-a-time tests to establish runtime requests before creating replacements.

The inventory intentionally does not extract, convert, rewrite, or package any resource. It does not claim support for proprietary Ftex/container formats.
