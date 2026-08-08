# Contributing to BidiForge 🤝

Thank you for your interest in contributing to **BidiForge**! We welcome bug fixes, documentation improvements, rule enhancements, and performance optimizations.

---

## 📜 Code of Conduct
Please be polite, respectful, and collaborative.

---

## 🛠️ How to Contribute

### 1. Fork & Clone
Fork the repository on GitHub and clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/bidiforge.git
cd bidiforge
npm install
```

### 2. Run Tests
Before making changes, verify that the existing test suite passes:
```bash
npm test
```

### 3. Adding Rules or Profiles
- **Rules**: Modular CSS and JS rules reside in `rules/`. Keep rules self-contained and scoped.
- **Profiles**: Application-specific overrides belong in `profiles/`. Generic behavior must remain in `profiles/generic-electron.js`.

### 4. Create a Pull Request
1. Create a feature branch (`git checkout -b feature/my-feature`).
2. Commit your changes (`git commit -m "feat: add support for X"`).
3. Push to your branch (`git push origin feature/my-feature`).
4. Open a Pull Request on GitHub.

---

## 🧪 Testing Checklist
- Ensure `npm test` passes without errors.
- Ensure no hardcoded local machine paths (`C:\Users\...`) or API secrets are committed.
- Verify that `BidiForge.bat` launches cleanly on Windows.
