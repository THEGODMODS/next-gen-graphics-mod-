# Desktop manager development

## Requirements

- Windows 10/11 or a supported development host
- Node.js LTS and npm
- Git

## Run locally

```bash
npm install
npm run dev
```

## Typecheck and build

```bash
npm run typecheck
npm run build
```

## Build Windows installer

```bash
npm run dist:win
```

The NSIS installer is written to `release/`.

## Current implementation scope

The first app milestone includes a secure Electron shell, a premium renderer UI, manual PES directory selection, detection of PES2017.exe / PES2017patched.exe, detection of sider.exe and sider.ini in the selected directory, basic LiveCPK/Lua setting inspection, and a Sider launch action.

The manager currently assumes Sider is in the selected game directory. A later milestone will add independent Sider path selection, robust INI parsing, managed configuration transactions, module package validation, file journaling, backups, rollback, and tests.

The UI deliberately labels unimplemented module workflows as in development rather than pretending that installation is available.
