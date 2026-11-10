# Shopfront

The back end of a small online store: a catalog, a cart, pricing,
shipping, payments, orders and exports. It is the project of
**Design Patterns in Practice**, Level 1, on
[devfoxlabs.com](https://www.devfoxlabs.com): every module of the
course refactors it one pattern further.

The same store is written three times, once per language. Pick the
one you chose in the course and work in its folder only:

| Folder                      | Runs on                         |
| --------------------------- | ------------------------------- |
| [`python/`](python)         | Python 3.14                     |
| [`javascript/`](javascript) | Node.js 24.11 (24 LTS) or later |
| [`typescript/`](typescript) | Node.js 24.11 or later, TS 7    |

Everything runs in memory: no database, no network, no account
anywhere. The services a real store would call (a shipping
provider, a payment gateway, a tax service, a mailer, analytics)
are small stand-ins in each language's `vendor/` folder, and
Shopfront's own code treats them exactly as it would the real
SDKs.

## Get it

```bash
git clone https://github.com/antonii-devfoxlabs/shopfront.git
cd shopfront
```

## Run it

Each version has a demo that puts one order through the whole
store and prints it, and a test suite.

### Python

With [uv](https://docs.astral.sh/uv/):

```bash
cd python
uv run python -m shopfront
uv run pytest
```

Without uv, in a virtual environment:

```bash
cd python
python3.14 -m venv .venv
source .venv/bin/activate
pip install "pytest>=9"
python -m shopfront
pytest
```

On Windows, create the environment with `py -3.14 -m venv .venv`
and activate it with `.venv\Scripts\activate`.

### JavaScript

```bash
cd javascript
npm start
npm test
```

### TypeScript

```bash
cd typescript
npm install
npm start
npm test
```

`npm start` and `npm test` both check the types with `tsc` first,
so a type error stops the demo as it stops the tests. Then Node.js
runs the `.ts` files directly: it removes the types and runs what is
left (without a warning since 24.11, the first Node.js 24 LTS
release).

Every version prints the same order:

```text
Order SF-00001 placed
  subtotal  33.90 EUR
  discount -3.39 EUR
  tax       5.80 EUR
  shipping  4.90 EUR
  total     41.21 EUR
Email sent to ada@example.com
```

## One tag per module

The code is written plainly on purpose, the way a store grows
before anyone stops to design it, and the course takes it apart
one module at a time. Each module's starting point is a tag: `m01`
is the code at the start of Module 1, `m02` the code at the start
of Module 2, and so on. A module's tag appears once the course
reaches that module.

If you skipped a module, or your copy went astray, start the next
module on a branch of your own made from its tag (here Module 2,
on a branch named `my-module-2`), so your commits stay yours:

```bash
git switch -c my-module-2 m02
```

`main` is always the newest state the course has reached.

## License

[MIT](LICENSE): your copy is yours to change and keep.
