const { join } = require('path')
const { promisify } = require('util')
const fs = require('fs')
const tspawk = require('../../fixtures/tspawk')
const t = require('tap')

const spawk = tspawk(t)

const readFile = promisify(fs.readFile)

const Sandbox = require('../../fixtures/sandbox.js')

t.test('config no args', async t => {
  const sandbox = new Sandbox(t)

  await t.rejects(
    sandbox.run('config', []),
    {
      code: 'EUSAGE',
    },
    'rejects with usage'
  )
})

t.test('config ignores workspaces', async t => {
  const sandbox = new Sandbox(t)

  await t.rejects(
    sandbox.run('config', ['--workspaces']),
    {
      code: 'EUSAGE',
    },
    'rejects with usage'
  )

  t.match(
    sandbox.logs.warn,
    [['config', 'This command does not support workspaces.']],
    'logged the warning'
  )
})

t.test('config list', async t => {
  const sandbox = new Sandbox(t)

  const temp = t.testdir({
    global: {
      npmrc: 'globalloaded=yes',
    },
    project: {
      '.npmrc': 'projectloaded=yes',
    },
    home: {
      '.npmrc': 'userloaded=yes',
    },
  })
  const global = join(temp, 'global')
  const project = join(temp, 'project')
  const home = join(temp, 'home')

  await sandbox.run('config', ['list'], { global, project, home })

  t.matchSnapshot(sandbox.output, 'output matches snapshot')
})

t.test('config list --long', async t => {
  const temp = t.testdir({
    global: {
      npmrc: 'globalloaded=yes',
    },
    project: {
      '.npmrc': 'projectloaded=yes',
    },
    home: {
      '.npmrc': 'userloaded=yes',
    },
  })
  const global = join(temp, 'global')
  const project = join(temp, 'project')
  const home = join(temp, 'home')

  const sandbox = new Sandbox(t, { global, project, home })
  await sandbox.run('config', ['list', '--long'])

  t.matchSnapshot(sandbox.output, 'output matches snapshot')
})

t.test('config list --json', async t => {
  const temp = t.testdir({
    global: {
      npmrc: 'globalloaded=yes',
    },
    project: {
      '.npmrc': 'projectloaded=yes',
    },
    home: {
      '.npmrc': 'userloaded=yes',
    },
  })
  const global = join(temp, 'global')
  const project = join(temp, 'project')
  const home = join(temp, 'home')

  const sandbox = new Sandbox(t, { global, project, home })
  await sandbox.run('config', ['list', '--json'])

  t.matchSnapshot(sandbox.output, 'output matches snapshot')
})

t.test('config list with publishConfig', async t => {
  const temp = t.testdir({
    project: {
      'package.json': JSON.stringify({
        publishConfig: {
          registry: 'https://some.registry',
          _authToken: 'mytoken',
        },
      }),
    },
  })
  const project = join(temp, 'project')

  const sandbox = new Sandbox(t, { project })
  await sandbox.run('config', ['list', ''])
  await sandbox.run('config', ['list', '--global'])

  t.matchSnapshot(sandbox.output, 'output matches snapshot')
})

t.test('config delete no args', async t => {
  const sandbox = new Sandbox(t)

  await t.rejects(
    sandbox.run('config', ['delete']),
    {
      code: 'EUSAGE',
    },
    'rejects with usage'
  )
})

t.test('config delete single key', async t => {
  // location defaults to user, so we work with a userconfig
  const home = t.testdir({
    '.npmrc': 'foo=bar\nbar=baz',
  })

  const sandbox = new Sandbox(t)
  await sandbox.run('config', ['delete', 'foo'], { home })

  t.equal(sandbox.config.get('foo'), undefined, 'foo should no longer be set')

  const contents = await readFile(join(home, '.npmrc'), { encoding: 'utf8' })
  t.not(contents.includes('foo='), 'foo was removed on disk')
})

t.test('config delete multiple keys', async t => {
  const home = t.testdir({
    '.npmrc': 'foo=bar\nbar=baz\nbaz=buz',
  })

  const sandbox = new Sandbox(t)
  await sandbox.run('config', ['delete', 'foo', 'bar'], { home })

  t.equal(sandbox.config.get('foo'), undefined, 'foo should no longer be set')
  t.equal(sandbox.config.get('bar'), undefined, 'bar should no longer be set')

  const contents = await readFile(join(home, '.npmrc'), { encoding: 'utf8' })
  t.not(contents.includes('foo='), 'foo was removed on disk')
  t.not(contents.includes('bar='), 'bar was removed on disk')
})

t.test('config delete key --location=global', async t => {
  const global = t.testdir({
    npmrc: 'foo=bar\nbar=baz',
  })

  const sandbox = new Sandbox(t)
  await sandbox.run('config', ['delete', 'foo', '--location=global'], { global })

  t.equal(sandbox.config.get('foo', 'global'), undefined, 'foo should no longer be set')

  const contents = await readFile(join(global, 'npmrc'), { encoding: 'utf8' })
  t.not(contents.includes('foo='), 'foo was removed on disk')
})

t.test('config delete key --global', async t => {
  const global = t.testdir({
    npmrc: 'foo=bar\nbar=baz',
  })

  const sandbox = new Sandbox(t)
  await sandbox.run('config', ['delete', 'foo', '--global'], { global })

  t.equal(sandbox.config.get('foo', 'global'), undefined, 'foo should no longer be set')

  const contents = await readFile(join(global, 'npmrc'), { encoding: 'utf8' })
  t.not(contents.includes('foo='), 'foo was removed on disk')
})

t.test('config set no args', async t => {
  const sandbox = new Sandbox(t)

  await t.rejects(
    sandbox.run('config', ['set']),
    {
      code: 'EUSAGE',
    },
    'rejects with usage'
  )
})

t.test('config set key', async t => {
  const home = t.testdir({
    '.npmrc': 'foo=bar',
  })

  const sandbox = new Sandbox(t, { home })

  await sandbox.run('config', ['set', 'foo'])

  t.equal(sandbox.config.get('foo'), '', 'set the value for foo')

  const contents = await readFile(join(home, '.npmrc'), { encoding: 'utf8' })
  t.ok(contents.includes('foo='), 'wrote foo to disk')
})

t.test('config set key value', async t => {
  const home = t.testdir({
    '.npmrc': 'foo=bar',
  })

  const sandbox = new Sandbox(t, { home })

  await sandbox.run('config', ['set', 'foo', 'baz'])

  t.equal(sandbox.config.get('foo'), 'baz', 'set the value for foo')

  const contents = await readFile(join(home, '.npmrc'), { encoding: 'utf8' })
  t.ok(contents.includes('foo=baz'), 'wrote foo to disk')
})

t.test('config set key=value', async t => {
  const home = t.testdir({
    '.npmrc': 'foo=bar',
  })

  const sandbox = new Sandbox(t, { home })

  await sandbox.run('config', ['set', 'foo=baz'])

  t.equal(sandbox.config.get('foo'), 'baz', 'set the value for foo')

  const contents = await readFile(join(home, '.npmrc'), { encoding: 'utf8' })
  t.ok(contents.includes('foo=baz'), 'wrote foo to disk')
})

t.test('config set key1 value1 key2=value2 key3', async t => {
  const home = t.testdir({
    '.npmrc': 'foo=bar\nbar=baz\nbaz=foo',
  })

  const sandbox = new Sandbox(t, { home })
  await sandbox.run('config', ['set', 'foo', 'oof', 'bar=rab', 'baz'])

  t.equal(sandbox.config.get('foo'), 'oof', 'foo was set')
  t.equal(sandbox.config.get('bar'), 'rab', 'bar was set')
  t.equal(sandbox.config.get('baz'), '', 'baz was set')

  const contents = await readFile(join(home, '.npmrc'), { encoding: 'utf8' })
  t.ok(contents.includes('foo=oof'), 'foo was written to disk')
  t.ok(contents.includes('bar=rab'), 'bar was written to disk')
  t.ok(contents.includes('baz='), 'baz was written to disk')
})

t.test('config set invalid key logs warning', async t => {
  const sandbox = new Sandbox(t)

  // this doesn't reject, it only logs a warning
  await sandbox.run('config', ['set', 'access=foo'])
  t.match(
    sandbox.logs.warn,
    [['invalid config', 'access="foo"', `set in ${join(sandbox.home, '.npmrc')}`]],
    'logged warning'
  )
})

t.test('config set key=value --location=global', async t => {
  const global = t.testdir({
    npmrc: 'foo=bar\nbar=baz',
  })

  const sandbox = new Sandbox(t, { global })
  await sandbox.run('config', ['set', 'foo=buzz', '--location=global'])

  t.equal(sandbox.config.get('foo', 'global'), 'buzz', 'foo should be set')

  const contents = await readFile(join(global, 'npmrc'), { encoding: 'utf8' })
  t.not(contents.includes('foo=buzz'), 'foo was saved on disk')
})

t.test('config set key=value --global', async t => {
  const global = t.testdir({
    npmrc: 'foo=bar\nbar=baz',
  })

  const sandbox = new Sandbox(t, { global })
  await sandbox.run('config', ['set', 'foo=buzz', '--global'])

  t.equal(sandbox.config.get('foo', 'global'), 'buzz', 'foo should be set')

  const contents = await readFile(join(global, 'npmrc'), { encoding: 'utf8' })
  t.not(contents.includes('foo=buzz'), 'foo was saved on disk')
})

t.test('config get no args', async t => {
  const sandbox = new Sandbox(t)

  await sandbox.run('config', ['get'])
  const getOutput = sandbox.output

  sandbox.reset()

  await sandbox.run('config', ['list'])
  const listOutput = sandbox.output

  t.equal(listOutput, getOutput, 'get with no args outputs list')
})

t.test('config get single key', async t => {
  const sandbox = new Sandbox(t)

  await sandbox.run('config', ['get', 'all'])
  t.equal(sandbox.output, `${sandbox.config.get('all')}`, 'should get the value')
})

t.test('config get multiple keys', async t => {
  const sandbox = new Sandbox(t)

  await sandbox.run('config', ['get', 'yes', 'all'])
  t.ok(
    sandbox.output.includes(`yes=${sandbox.config.get('yes')}`),
    'outputs yes'
  )
  t.ok(
    sandbox.output.includes(`all=${sandbox.config.get('all')}`),
    'outputs all'
  )
})

t.test('config get private key', async t => {
  const sandbox = new Sandbox(t)

  await t.rejects(
    sandbox.run('config', ['get', '_authToken']),
    /_authToken option is protected/,
    'rejects with protected string'
  )

  await t.rejects(
    sandbox.run('config', ['get', '//localhost:8080/:_password']),
    /_password option is protected/,
    'rejects with protected string'
  )
})

t.test('config edit', async t => {
  const home = t.testdir({
    '.npmrc': 'foo=bar\nbar=baz',
  })

  const EDITOR = 'vim'
  const editor = spawk.spawn(EDITOR).exit(0)

  const sandbox = new Sandbox(t, { home })
  sandbox.process.env.EDITOR = EDITOR
  await sandbox.run('config', ['edit'])

  t.ok(editor.called, 'editor was spawned')
  t.same(
    editor.calledWith.args,
    [join(sandbox.home, '.npmrc')],
    'editor opened the user config file'
  )

  const contents = await readFile(join(home, '.npmrc'), { encoding: 'utf8' })
  t.ok(contents.includes('foo=bar'), 'kept foo')
  t.ok(contents.includes('bar=baz'), 'kept bar')
  t.ok(contents.includes('shown below with default values'), 'appends defaults to file')
})

t.test('config edit - editor exits non-0', async t => {
  const EDITOR = 'vim'
  const editor = spawk.spawn(EDITOR).exit(1)

  const sandbox = new Sandbox(t)
  sandbox.process.env.EDITOR = EDITOR
  await t.rejects(
    sandbox.run('config', ['edit']),
    {
      message: 'editor process exited with code: 1',
    },
    'rejects with error about editor code'
  )

  t.ok(editor.called, 'editor was spawned')
  t.same(
    editor.calledWith.args,
    [join(sandbox.home, '.npmrc')],
    'editor opened the user config file'
  )
})

t.test('config fix', (t) => {
  t.test('no problems', async (t) => {
    const home = t.testdir({
      '.npmrc': '',
    })

    const sandbox = new Sandbox(t, { home })
    await sandbox.run('config', ['fix'])
    t.equal(sandbox.output, '', 'printed nothing')
  })

  t.test('repairs all configs by default', async (t) => {
    const root = t.testdir({
      global: {
        npmrc: '_authtoken=notatoken\n_authToken=afaketoken',
      },
      home: {
        '.npmrc': '_authtoken=thisisinvalid\n_auth=beef',
      },
    })
    const registry = `//registry.npmjs.org/`

    const sandbox = new Sandbox(t, {
      global: join(root, 'global'),
      home: join(root, 'home'),
    })
    await sandbox.run('config', ['fix'])

    // global config fixes
    t.match(sandbox.output, '`_authtoken` deleted from global config',
      'output has deleted global _authtoken')
    t.match(sandbox.output, `\`_authToken\` renamed to \`${registry}:_authToken\` in global config`,
      'output has renamed global _authToken')
    t.not(sandbox.config.get('_authtoken', 'global'), '_authtoken is not set globally')
    t.not(sandbox.config.get('_authToken', 'global'), '_authToken is not set globally')
    t.equal(sandbox.config.get(`${registry}:_authToken`, 'global'), 'afaketoken',
      'global _authToken was scoped')
    const globalConfig = await readFile(join(root, 'global', 'npmrc'), { encoding: 'utf8' })
    t.equal(globalConfig, `${registry}:_authToken=afaketoken\n`, 'global config was written')

    // user config fixes
    t.match(sandbox.output, '`_authtoken` deleted from user config',
      'output has deleted user _authtoken')
    t.match(sandbox.output, `\`_auth\` renamed to \`${registry}:_auth\` in user config`,
      'output has renamed user _auth')
    t.not(sandbox.config.get('_authtoken', 'user'), '_authtoken is not set in user config')
    t.not(sandbox.config.get('_auth'), '_auth is not set in user config')
    t.equal(sandbox.config.get(`${registry}:_auth`, 'user'), 'beef', 'user _auth was scoped')
    const userConfig = await readFile(join(root, 'home', '.npmrc'), { encoding: 'utf8' })
    t.equal(userConfig, `${registry}:_auth=beef\n`, 'user config was written')
  })

  t.test('repairs only the config specified by --location if asked', async (t) => {
    const root = t.testdir({
      global: {
        npmrc: '_authtoken=notatoken\n_authToken=afaketoken',
      },
      home: {
        '.npmrc': '_authtoken=thisisinvalid\n_auth=beef',
      },
    })
    const registry = `//registry.npmjs.org/`

    const sandbox = new Sandbox(t, {
      global: join(root, 'global'),
      home: join(root, 'home'),
    })
    await sandbox.run('config', ['fix', '--location=user'])

    // global config should be untouched
    t.notMatch(sandbox.output, '`_authtoken` deleted from global',
      'output has deleted global _authtoken')
    t.notMatch(sandbox.output, `\`_authToken\` renamed to \`${registry}:_authToken\` in global`,
      'output has renamed global _authToken')
    t.equal(sandbox.config.get('_authtoken', 'global'), 'notatoken', 'global _authtoken untouched')
    t.equal(sandbox.config.get('_authToken', 'global'), 'afaketoken', 'global _authToken untouched')
    t.not(sandbox.config.get(`${registry}:_authToken`, 'global'), 'global _authToken not scoped')
    const globalConfig = await readFile(join(root, 'global', 'npmrc'), { encoding: 'utf8' })
    t.equal(globalConfig, '_authtoken=notatoken\n_authToken=afaketoken',
      'global config was not written')

    // user config fixes
    t.match(sandbox.output, '`_authtoken` deleted from user',
      'output has deleted user _authtoken')
    t.match(sandbox.output, `\`_auth\` renamed to \`${registry}:_auth\` in user`,
      'output has renamed user _auth')
    t.not(sandbox.config.get('_authtoken', 'user'), '_authtoken is not set in user config')
    t.not(sandbox.config.get('_auth', 'user'), '_auth is not set in user config')
    t.equal(sandbox.config.get(`${registry}:_auth`, 'user'), 'beef', 'user _auth was scoped')
    const userConfig = await readFile(join(root, 'home', '.npmrc'), { encoding: 'utf8' })
    t.equal(userConfig, `${registry}:_auth=beef\n`, 'user config was written')
  })

  t.end()
})

t.test('completion', async t => {
  const sandbox = new Sandbox(t)

  let allKeys
  const testComp = async (argv, expect) => {
    t.match(await sandbox.complete('config', argv), expect, argv.join(' '))
    if (!allKeys) {
      allKeys = Object.keys(sandbox.config.definitions)
    }
    sandbox.reset()
  }

  await testComp([], ['get', 'set', 'delete', 'ls', 'rm', 'edit', 'fix', 'list'])
  await testComp(['set', 'foo'], [])
  await testComp(['get'], allKeys)
  await testComp(['set'], allKeys)
  await testComp(['delete'], allKeys)
  await testComp(['rm'], allKeys)
  await testComp(['edit'], [])
  await testComp(['fix'], [])
  await testComp(['list'], [])
  await testComp(['ls'], [])

  const getCommand = await sandbox.complete('get')
  t.match(getCommand, allKeys, 'also works for just npm get')
  sandbox.reset()

  const partial = await sandbox.complete('config', 'l')
  t.match(partial, ['get', 'set', 'delete', 'ls', 'rm', 'edit'], 'and works on partials')
})
