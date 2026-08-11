# Contributing to BidiForge

First off, thank you for considering contributing! 🪬 BidiForge is a community effort — every fix, profile, and idea makes Arabic/RTL desktop computing better for 400+ million speakers.

## 🧭 Ways to Contribute

- **🐛 Report bugs** — open an [issue](https://github.com/Jenzo0/BidiForge/issues) with the app name, version, and a screenshot of the broken text.
- **📱 Submit app profiles** — got an Electron app rendering Arabic wrong? Add a profile under `profiles/`.
- **🛠️ Fix bugs** — pick any open issue and send a pull request.
- **📚 Improve docs** — the README, `docs/`, and CHANGELOG always welcome polish.
- **⭐ Spread the word** — starring the repo and telling a friend is a real contribution!

## 🚀 Getting Started

```bash
git clone https://github.com/Jenzo0/BidiForge.git
cd BidiForge
npm install
npm test        # full suite must pass before submitting
```

## 🔀 Branching & Commits

- Work on a feature branch: `git checkout -b feat/my-awesome-feature`
- Follow [Conventional Commits](https://www.conventionalcommits.org/): `fix:`, `feat:`, `docs:`, `chore:`, `test:`
- One logical change per commit; keep diffs small and reviewable.

## 🧪 Testing

```bash
npm test
```

All **21 tests** must pass. New features should ship with tests — see `tests/runner.js` for the pattern.

## 🐛 Reporting Bugs

Include:

1. App name + exact version (e.g., `Discord 1.0.9251`)
2. Steps to reproduce
3. Expected vs. actual rendering (screenshot of Arabic text)
4. Output of `node index.js health <app> --json`

## ✅ Pull Request Checklist

- [ ] `npm test` passes (21/21)
- [ ] Changes are minimal and scoped
- [ ] Commit message follows Conventional Commits
- [ ] Docs/CHANGELOG updated if user-facing behavior changed

## 📜 Code of Conduct

Be kind, be constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) — harassment or hostile behavior is not tolerated.

## 📄 License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
