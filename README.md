# dune

## overview

dune is an api for tracking usage of ai models across multiple projects. it
allows sharing a single api key while maintaining individual usage limits for
different projects. this helps in managing rate limits and switching to
alternative models when limits are exceeded.

it was designed for groq so the limits and other data is taken from their
pricing models and will not work with other ai providers. however, you can
modify the `data/models.json` file and fill it with the rate limit information
from your ai providers and in theory should work fine. this does not (yet) make
any request to any ai providers.

the database used is `supabase` but is designed to be easily swappable.

it is written in deno and uses the `hono` framework.

## authentication

dune uses bearer tokens for authentication. include the token in the
`authorization` header:

```
authorization: bearer your_token_here
```

the server does not check for the authenticity of the authorization tokens and
they are only used to query a certain user's usages. any random uuid is accepted
as a valid authorization header. to disallow access to everyone, use the
`X-Admin` header as shown [here](#security)

again, **no real authentication is done** and anyone can access the api unless you use the `ADMIN_KEY` environment variable and pass it in the `X-Admin` header.

## endpoints

### get `/models`

retrieves a list of available ai models.

**response:**

```json
[
  {
    "name": "name",
    "rpm": 0,
    "rpd": 0,
    "tpm": 0,
    "tpd": 0,
    "ash": 0,
    "asd": 0
  }
  // ...
]
```

the values are the maximum rate limits of the model as per `data/models.json`

### get `/models/:name`

retrieves details of a specific ai model.

**response:**

```json
{
  "name": "name",
  "rpm": 0,
  "rpd": 0,
  "tpm": 0,
  "tpd": 0,
  "ash": 0,
  "asd": 0
}
```

again, they are the maximum rate limits of the models.

### post `/models/:name/track`

tracks the usage of a specific ai model.

**request body:**

```json
{
  "requests": 1, // 1 by default
  "tokens": 123 // number by which tokens will be incremented
}
```

**response:**

```json
{
  "name": "name",
  "rpm": 0,
  "rpd": 0,
  "tpm": 0,
  "tpd": 0,
  "ash": 0,
  "asd": 0
}
```

this returns the usage information after tracking

### get `/models/:name/usage`

retrieves usage data for a specific model.

**response:**

```json
{
  "name": "name",
  "rpm": 0,
  "rpd": 0,
  "tpm": 0,
  "tpd": 0,
  "ash": 0,
  "asd": 0
}
```

### delete `/models/:name/usage`

resets usage data for a specific model.

**response:**

```json
{ "success": true }
```

### get `/models/:name/remaining`

retrieves the REMAINING token limits for a model.

**response:**

```json
{
  "name": "name",
  "rpm": 100,
  "rpd": 1000,
  "tpm": 5000,
  "tpd": 50000,
  "ash": 100,
  "asd": 100
}
```

### get `/me`

retrieves all usage data for the authenticated user.

**response:**

```json
[
  {
    "name": "name",
    "rpm": 100,
    "rpd": 1000,
    "tpm": 5000,
    "tpd": 50000,
    "ash": 100,
    "asd": 100
  },
  {
    "name": "name",
    "rpm": 100,
    "rpd": 1000,
    "tpm": 5000,
    "tpd": 50000,
    "ash": 100,
    "asd": 100
  }
]
```

### delete `/me`

deletes all usage data for the authenticated user.

**response:**

```json
{ "success": true }
```

### post `/select`

selects an available ai model based on priority and fallback settings.

**request body:**

```json
{
  "modelPriority": ["model1", "model2"],
  "fallbackAll": false,
  "excludeModels": ["model3"]
}
```

at least `modelPriority` should have values or `fallbackAll` should be `true`.
setting `fallbackAll` to `true` will also include other models in result if
`modelPriority` models are not available.

models are sorted in the order of importance:

1. models in `modelPriority` as is
2. other models (if `fallbackAll` is `true`)

models that do not have usage remaining are filtered out.

after choosing, models provided in `excludeModels` are filtered out, and the
remaining models are returned as an array. might return empty array if no models
to choose from.

returns the usage REMAINING of the chosen models.

**response:**

```json
[
  {
    "name": "model1",
    "rpm": 100,
    "rpd": 1000,
    "tpm": 5000,
    "tpd": 50000,
    "ash": 100,
    "asd": 100
  },
  {
    "name": "model2",
    "rpm": 100,
    "rpd": 1000,
    "tpm": 5000,
    "tpd": 50000,
    "ash": 100,
    "asd": 100
  }
]
```

## security

to prevent anyone from accessing and using the API, a master key can be set as
the `ADMIN_KEY` environment variable which should be provided in the `X-Admin`
header. there is probably a better way to do this, but i do not intend to make
this a public API and will remain as a personal web service to keep track of my
project's rate limits so its good to go.

## for dummies

if you need this section, why are you using this API?

`rpm` -> number of requests made per minute
`rpd` -> number of requests made per day
`tpm` -> tokens per minute
`tpd` -> tokens per day
`ash` -> number of seconds of audio processed per hour
`asd` -> number of seconds of audio processed per day

if these values are `null`, i assume it means there is no limit on that value and what you can use is only limited by other values. 

> **_example_**: if `tpm` is `null`, it means groq does not enforce any strict limit on that, and as long as you did not exceed your `rpd` and `rpm` limits you can freely use it.

once again, this is just my assumption.
