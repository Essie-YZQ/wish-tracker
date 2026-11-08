const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const clone = value => JSON.parse(JSON.stringify(value));
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8')
  .replace(/^import .*;\n/gm, '')
  .replace(/\nloadFromFirebase\(\)[\s\S]*$/, '');

// Two clients share a versioned backend. A conflicting transaction reruns its
// callback against a new snapshot, matching Firestore's optimistic concurrency.
function backend(balances = [0, 0, 30]) {
  return {
    data: { sBalance: balances[0], kkBalance: balances[1], poolBalance: balances[2] },
    version: 0, retries: 0, writes: [], fail: false,
    async transaction(callback) {
      for (let attempt = 0; attempt < 30; attempt++) {
        if (this.fail) throw new Error('offline');
        const version = this.version;
        const data = clone(this.data);
        let update;
        const result = await callback({
          get: async () => ({ exists: () => true, data: () => clone(data) }),
          update: (_ref, values) => { update = clone(values); }
        });
        if (version !== this.version) { this.retries++; continue; }
        if (update) {
          Object.assign(this.data, update);
          this.writes.push(update);
          this.version++;
        }
        return result;
      }
      throw new Error('Too much contention');
    }
  };
}

function client(server) {
  const storage = new Map();
  const context = vm.createContext({
    console: { log() {}, error() {} },
    document: { addEventListener() {} },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    db: {}, doc: () => ({}), serverTimestamp: () => 'SERVER_TIMESTAMP',
    runTransaction: (_db, callback) => server.transaction(callback),
    getDoc: async () => ({ exists: () => true, data: () => clone(server.data) }),
    updateDoc: async (_ref, update) => {
      Object.assign(server.data, clone(update));
      server.writes.push(clone(update));
      server.version++;
    },
    confetti: () => { context.confetti_count++; }, confetti_count: 0
  });
  vm.runInContext(source, context);
  vm.runInContext(`
    render_app = () => {};
    show_seed_reveal = () => {};
    show_seed_fail_reveal = () => {};
    set_dog_companion_mode = async () => {};
    save_state(create_initial_state());
  `, context);
  const state = vm.runInContext('get_state()', context);
  server.data.weekStart ||= state.week_start_date;
  return {
    context,
    run: code => vm.runInContext(code, context),
    action: (type, id = 's') => context.perform_balance_action(type, {
      dataset: { userId: id, otherUserId: id === 's' ? 'kk' : 's' }
    }),
    toggle: (id, habit, date) => context.toggle_habit_day(id, habit, date),
    seed: id => context.perform_mystery_seed_draw(id),
    state: () => clone(vm.runInContext('get_state()', context))
  };
}

function balances(server) {
  const values = ['sBalance', 'kkBalance', 'poolBalance'].map(key => server.data[key]);
  assert.equal(values.reduce((a, b) => a + b, 0), 30);
  assert.ok(values.every(value => Number.isSafeInteger(value) && value >= 0));
  return values;
}

test('spent habit reward cannot create a refund; retry after withdrawing works', async () => {
  const server = backend();
  const app = client(server);
  const date = Object.keys(app.state().users[0].habits[8].daily_status)[0];
  await app.toggle('s', 's_meet_friends', date);
  assert.deepEqual(balances(server), [1, 0, 29]);
  await app.action('return_to_pool');
  await app.toggle('s', 's_meet_friends', date);
  assert.deepEqual(balances(server), [0, 0, 30]);
  assert.equal(server.data.sHabitStatus.s_meet_friends[date], true);
  assert.equal(server.data.sHabitStatus.s_meet_friends.is_reward_claimed, true);
  assert.match(app.state().ui_message, /need 1 wish/);
  await app.action('withdraw_from_pool');
  await app.toggle('s', 's_meet_friends', date);
  assert.deepEqual(balances(server), [0, 0, 30]);
  assert.equal(server.data.sHabitStatus.s_meet_friends.is_reward_claimed, false);
});

test('Donate, Withdraw, Give and each Undo conserve wishes', async () => {
  const server = backend([5, 3, 22]);
  const app = client(server);
  for (const action of ['return_to_pool', 'withdraw_from_pool', 'give_to_other']) {
    await app.action(action);
    balances(server);
    await app.action('undo_last_action');
    assert.deepEqual(balances(server), [5, 3, 22]);
  }
});

test('two devices competing for the last pool wish never overdraw', async () => {
  const server = backend([29, 0, 1]);
  const a = client(server), b = client(server);
  await Promise.all([a.action('withdraw_from_pool'), b.action('withdraw_from_pool', 'kk')]);
  assert.equal(balances(server)[2], 0);
  assert.ok(server.retries > 0);
});

test('two devices spending the same last wish cannot create negative personal balances', async () => {
  const server = backend([1, 0, 29]);
  const a = client(server), b = client(server);
  await Promise.all([a.action('give_to_other'), b.action('return_to_pool')]);
  assert.equal(balances(server)[0], 0);
  assert.ok(server.retries > 0);
});

test('concurrent habit completion uses server claim state and awards only once', async () => {
  const server = backend();
  const a = client(server), b = client(server);
  const dates = Object.keys(a.state().users[0].habits[2].daily_status);
  server.data.sHabitStatus = { s_workout: { [dates[0]]: true, is_reward_claimed: false } };
  await Promise.all([
    a.toggle('s', 's_workout', dates[1]), b.toggle('s', 's_workout', dates[2])
  ]);
  assert.deepEqual(balances(server), [1, 0, 29]);
  assert.equal(server.data.sHabitStatus.s_workout.done_count, 3);
  assert.equal(a.context.confetti_count + b.context.confetti_count, 1);
});

test('both seed outcomes return the cost to Pool', async () => {
  for (const roll of [0, 0.9]) {
    const server = backend([2, 0, 28]);
    const app = client(server);
    app.run(`Math.random = () => ${roll}`);
    await app.seed('s');
    assert.deepEqual(balances(server), [0, 0, 30]);
    assert.equal(server.data.sUnlockedFlowers.length, roll === 0 ? 2 : 1);
  }
});

test('concurrent seed draws with only two wishes charge exactly once', async () => {
  const server = backend([2, 0, 28]);
  const a = client(server), b = client(server);
  a.run('Math.random = () => 0'); b.run('Math.random = () => 0');
  await Promise.all([a.seed('s'), b.seed('s')]);
  assert.deepEqual(balances(server), [0, 0, 30]);
  assert.equal(server.data.sUnlockedFlowers.length, 2);
});

test('invalid reducer and malformed server balances are rejected before writing', async () => {
  const server = backend();
  const app = client(server);
  await app.run(`commit_wish_action('s', state => { state.pool_balance++; })`);
  assert.equal(server.writes.length, 0);
  for (const values of [[22, 2, 8], [-1, 0, 31], [0.5, 0, 29.5]]) {
    [server.data.sBalance, server.data.kkBalance, server.data.poolBalance] = values;
    await app.action('withdraw_from_pool');
    assert.equal(server.writes.length, 0);
  }
});

test('offline failure leaves habit state and balances unchanged, with no confetti', async () => {
  const server = backend();
  const app = client(server);
  const date = Object.keys(app.state().users[0].habits[8].daily_status)[0];
  server.fail = true;
  await app.toggle('s', 's_meet_friends', date);
  assert.deepEqual(balances(server), [0, 0, 30]);
  assert.equal(app.state().users[0].habits[8].daily_status[date], false);
  assert.equal(app.context.confetti_count, 0);
  assert.match(app.state().ui_message, /Couldn't save/);
});

test('vase-only save omits balance and habit fields', async () => {
  const server = backend([5, 3, 22]);
  const app = client(server);
  await app.run('saveBalancesToFirebase(get_state())');
  for (const field of ['sBalance', 'kkBalance', 'poolBalance', 'sHabitStatus', 'kkHabitStatus']) {
    assert.equal(Object.hasOwn(server.writes[0], field), false);
  }
  assert.deepEqual(balances(server), [5, 3, 22]);
});

// Regression (2026-11-08): a user's habit map in Firestore still holds LAST week's
// dates with is_reward_claimed=true. Those flags must not leak into this week,
// otherwise ticking a box triggers a bogus reward reversal (blocked at 0 balance,
// and in pre-v25 code a +1 Pool leak).
test("last week's claimed flags do not leak into the current week", async () => {
  const server = backend();
  const app = client(server);
  const dates = Object.keys(app.state().users[0].habits[3].daily_status);
  const last_week = dates.map(date => {
    const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - 7);
    return app.run(`format_storage_date(new Date(${d.getTime()}))`);
  });
  server.data.sHabitStatus = {
    s_cooking: { [last_week[0]]: true, [last_week[2]]: true, [last_week[5]]: true, is_reward_claimed: true, done_count: 3 }
  };
  await app.toggle('s', 's_cooking', dates[0]);
  assert.deepEqual(balances(server), [0, 0, 30]);
  assert.equal(server.data.sHabitStatus.s_cooking[dates[0]], true);
  assert.equal(server.data.sHabitStatus.s_cooking.is_reward_claimed, false);
  assert.equal(app.state().ui_message, '');
  await app.toggle('s', 's_cooking', dates[1]);
  await app.toggle('s', 's_cooking', dates[2]);
  assert.deepEqual(balances(server), [1, 0, 29]);
  assert.equal(server.data.sHabitStatus.s_cooking.is_reward_claimed, true);
});

// Regression (2026-11-08): a device in a later timezone already wrote next week's
// weekStart. This week's habit map must still be honored, not wiped.
test('a weekStart from another timezone does not wipe the current week habit map', async () => {
  const server = backend();
  const app = client(server);
  const dates = Object.keys(app.state().users[0].habits[3].daily_status);
  server.data.sHabitStatus = { s_cooking: { [dates[0]]: true, [dates[1]]: true, is_reward_claimed: false, done_count: 2 } };
  server.data.weekStart = '2099-01-05';
  await app.toggle('s', 's_cooking', dates[2]);
  assert.deepEqual(balances(server), [1, 0, 29]);
  assert.equal(server.data.sHabitStatus.s_cooking.done_count, 3);
  assert.equal(server.data.sHabitStatus.s_cooking[dates[0]], true);
});

test('corrupted totals show a specific repair message instead of a generic error', async () => {
  const server = backend([0, 0, 32]);
  const app = client(server);
  await app.action('withdraw_from_pool');
  assert.equal(server.writes.length, 0);
  assert.match(app.state().ui_message, /32/);
});

// 2026-11-08: weeks are computed in New York time on every device. Run this file
// under several TZ values (e.g. TZ=Asia/Shanghai) to prove device timezone is irrelevant.
test('week boundaries follow New York time regardless of device timezone', () => {
  const app = client(backend());
  const week = iso => app.run(`get_week_start_date(new Date('${iso}'))`);
  const today = iso => app.run(`get_new_york_date_string(new Date('${iso}'))`);
  // Monday 13:00 in Beijing is still Sunday 23:59 in New York -> previous week.
  assert.equal(week('2026-11-09T04:59:00Z'), '2026-11-02');
  assert.equal(today('2026-11-09T04:59:00Z'), '2026-11-08');
  // Monday 00:00 in New York starts the new week.
  assert.equal(week('2026-11-09T05:00:00Z'), '2026-11-09');
  // Daylight saving time (EDT, UTC-4): Monday 2026-06-01 00:00 NY = 04:00Z.
  assert.equal(week('2026-06-01T03:59:00Z'), '2026-05-25');
  assert.equal(week('2026-06-01T04:00:00Z'), '2026-06-01');
  // Week rollover across a month/year boundary.
  assert.equal(week('2027-01-01T17:00:00Z'), '2026-12-28');
});

// 2026-11-08: firestore.rules only accepts writes stamped by current app code.
test('every kind of write carries the app version and a server timestamp', async () => {
  const server = backend([2, 0, 28]);
  const app = client(server);
  const date = Object.keys(app.state().users[0].habits[8].daily_status)[0];
  await app.toggle('s', 's_meet_friends', date);          // transaction + history snapshot
  await app.action('return_to_pool');                      // balance transaction
  await app.run('saveBalancesToFirebase(get_state())');    // vase-only save
  await app.run('resetWeeklySourcesInFirebase(get_state().week_start_date)');
  await app.run('save_dog_state_to_firebase()');
  assert.ok(server.writes.length >= 6);
  for (const write of server.writes) {
    assert.equal(write.clientVersion, app.run('APP_VERSION'));
    assert.equal(write.writeAt, 'SERVER_TIMESTAMP');
  }
});
