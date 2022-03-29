# Use-case Runner

Perform use-case from local files without OneSDK bind lifecycle.

## Installation

```shell
npm install @superfaceai/usecase-runner
```

## Usage

```js
const { perform } = require('@superfaceai/usecase-runner');

async function main() {
  const profile = `
    name = "demo"
    version = "1.0.0"

    usecase Demo {
      input {
        input! string!
      }

      result {
        env! string!
        input! string!
      }
    }
  `;

  const map = `
    profile = "demo@1.0"
    provider = "demo"

    map Demo {
      map result {
        env = parameters.param
        input = input.input
      }
    }
  `;

  const provider = `
    {
      "name": "demo",
      "services": [
        {
          "id": "default",
          "baseUrl": "noop.localhost"
        }
      ],
      "defaultService": "default",
      "parameters": [
        {
          "name": "param"
        }
      ]
    }
  `;

  const env = 'DEMO_PARAM="env value"';

  try {
    const result = await perform({
      profile,
      provider,
      map,
      env,
      usecase: 'Demo',
      input: { input: 'input value' },
    });

    console.log(result);
  } catch (err) {
    console.error(err);
  }
}

main();
```
