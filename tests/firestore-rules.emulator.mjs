// Firestore Security Rules + real app integration test (runs against the local emulator).
// Proves firestore.rules rejects any write that breaks S + KK + Pool == 30, and that
// the real script.js (via the real Firebase SDK) still works under those rules.
//
// Requirements: Java 21+ (any JDK; set JAVA_HOME), Node 18+. From an empty scratch folder:
//   npm init -y && npm install firebase-tools@13 @firebase/rules-unit-testing@3 firebase@10
//   cp <repo>/tests/firestore-rules.emulator.mjs . && export REPO=<absolute repo path>/
//   npx firebase emulators:exec --only firestore --project demo-bloom "node firestore-rules.emulator.mjs"
// Expected last line: "ALL 26 CHECKS PASSED". PERMISSION_DENIED log lines are the expected denials.
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, increment, runTransaction, onSnapshot, serverTimestamp } from 'firebase/firestore';
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';

const REPO = process.env.REPO || new URL('..', import.meta.url).pathname;
const env = await initializeTestEnvironment({
  projectId: 'demo-bloom', firestore: { rules: fs.readFileSync(`${REPO}/firestore.rules`, 'utf8'), host: '127.0.0.1', port: 8080 }
});
const seed = async (b = [0, 0, 30], extra = {}) => env.withSecurityRulesDisabled(async c =>
  setDoc(doc(c.firestore(), 'shared_state/main'), { sBalance: b[0], kkBalance: b[1], poolBalance: b[2], history: [], ...extra }));
const db = env.unauthenticatedContext().firestore();
const main = doc(db, 'shared_state/main');
const st = (v = 28) => ({ clientVersion: v, writeAt: serverTimestamp() });
let n = 0; const ok = async (name, p) => { await p; console.log('PASS', name); n++; };

await seed();
await ok('read allowed', assertSucceeds(getDoc(main)));
await ok('dog/vase-only update allowed', assertSucceeds(updateDoc(main, { ...st(), dogState: { x: 1 }, sVaseFlowers: [] })));
await ok('history update allowed', assertSucceeds(updateDoc(main, { ...st(), history: [{ weekStart: '2026-11-02' }] })));
await ok('conserving transfer allowed', assertSucceeds(updateDoc(main, { ...st(), sBalance: 1, poolBalance: 29 })));
await ok('pool +1 alone (old clamp bug) DENIED', assertFails(updateDoc(main, { ...st(), poolBalance: 30 })));
await ok('old increment() leak DENIED', assertFails(updateDoc(main, { ...st(), poolBalance: increment(1) })));
await ok('conserving increments allowed', assertSucceeds(updateDoc(main, { ...st(), sBalance: increment(-1), poolBalance: increment(1) })));
await ok('negative balance DENIED', assertFails(updateDoc(main, { ...st(), sBalance: -1, poolBalance: 31 })));
await ok('fractional DENIED', assertFails(updateDoc(main, { ...st(), sBalance: 0.5, poolBalance: 29.5 })));
await ok('string balance DENIED', assertFails(updateDoc(main, { ...st(), sBalance: '0' })));
await ok('removing a balance field DENIED', assertFails(setDoc(main, { ...st(), sBalance: 0, kkBalance: 0 })));
await ok('delete main DENIED', assertFails(deleteDoc(main)));
await ok('other collection DENIED', assertFails(setDoc(doc(db, 'other/x'), { ...st(), a: 1 })));
await seed([0, 0, 32]);
await ok('when data is already broken, a non-repairing write is DENIED', assertFails(updateDoc(main, { ...st(), dogState: {} })));
await ok('repairing write allowed', assertSucceeds(updateDoc(main, { ...st(), poolBalance: 30 })));

await seed();
await ok('UNSTAMPED write (stale old tab) DENIED even if it conserves', assertFails(updateDoc(main, { sBalance: 1, poolBalance: 29 })));
await ok('old tab dog-only write DENIED', assertFails(updateDoc(main, { dogState: { y: 2 } })));
await ok('stamp with an older version DENIED', assertFails(updateDoc(main, { ...st(27), dogState: { y: 3 } })));
await ok('stamped write allowed', assertSucceeds(updateDoc(main, { ...st(), dogState: { y: 4 } })));
await ok('reusing the previous stamp (no new writeAt) DENIED', assertFails(updateDoc(main, { clientVersion: 28, dogState: { y: 5 } })));
await ok('old-client increment leak DENIED', assertFails(updateDoc(main, { poolBalance: increment(1) })));

// ---- Real app code (script.js) on the real Firebase SDK + emulator + rules ----
const clone = v => JSON.parse(JSON.stringify(v));
// Copy vm-realm plain objects/arrays into this realm, but keep SDK sentinels
// such as serverTimestamp() (created by this realm's SDK) untouched.
const hostCopy = v => Array.isArray(v) ? Array.from(v, x => hostCopy(x))
  : v && typeof v === 'object' && v.constructor?.name === 'Object'
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, hostCopy(x)])) : v;
const src = fs.readFileSync(`${REPO}/script.js`, 'utf8').replace(/^import .*;\n/gm, '').replace(/\nloadFromFirebase\(\)[\s\S]*$/, '');
function app() {
  const store = new Map();
  const ctx = vm.createContext({ console: { log() {}, error: (...a) => ctx.errors.push(String(a[1] || a[0])) }, errors: [],
    document: { addEventListener() {} }, localStorage: { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) },
    db, doc, getDoc, onSnapshot, Intl, serverTimestamp,
    // vm-realm objects are rejected by the SDK as "custom Object"; re-create them in this realm.
    updateDoc: (ref, data) => updateDoc(ref, hostCopy(data)),
    runTransaction: (dbi, cb) => runTransaction(dbi, t => cb({ get: r => t.get(r), update: (r, data) => t.update(r, hostCopy(data)) })), confetti() {} });
  vm.runInContext(src, ctx);
  vm.runInContext('render_app=()=>{};show_seed_reveal=()=>{};show_seed_fail_reveal=()=>{};set_dog_companion_mode=async()=>{};save_state(create_initial_state());', ctx);
  return ctx;
}
const server = async () => { let out; await env.withSecurityRulesDisabled(async c => { out = (await getDoc(doc(c.firestore(), 'shared_state/main'))).data(); }); return out; };
const total = d => d.sBalance + d.kkBalance + d.poolBalance;
await seed([0, 0, 30]);
const a = app(), week = vm.runInContext('get_state().week_start_date', a);
const dates = vm.runInContext("Object.keys(get_state().users[0].habits[3].daily_status)", a);
for (const d of dates.slice(0, 3)) await a.toggle_habit_day('s', 's_cooking', d);
let d = await server(); assert.deepEqual([d.sBalance, d.kkBalance, d.poolBalance], [1, 0, 29]); console.log('PASS app: habit reward through rules'); n++;
const btn = (u, o) => ({ dataset: { userId: u, otherUserId: o } });
await a.perform_balance_action('give_to_other', btn('s', 'kk'));
await a.perform_balance_action('undo_last_action', btn('s', 'kk'));
await a.perform_balance_action('withdraw_from_pool', btn('kk', 's'));
await a.perform_balance_action('return_to_pool', btn('kk', 's'));
await a.toggle_habit_day('s', 's_cooking', dates[2]); // reversal with balance 1
d = await server(); assert.deepEqual([d.sBalance, d.kkBalance, d.poolBalance], [0, 0, 30]); console.log('PASS app: give/undo/withdraw/donate/reversal through rules'); n++;
await env.withSecurityRulesDisabled(async c => updateDoc(doc(c.firestore(), 'shared_state/main'), { sBalance: 2, poolBalance: 28 }));
await a.perform_mystery_seed_draw('s');
d = await server(); assert.equal(total(d), 30); assert.equal(d.sBalance, 0); console.log('PASS app: mystery seed through rules'); n++;
await vm.runInContext('saveBalancesToFirebase(get_state())', a);
await vm.runInContext('saveWeeklySnapshot(get_state())', a);
await vm.runInContext('save_dog_state_to_firebase()', a);
await vm.runInContext('resetWeeklySourcesInFirebase(get_state().week_start_date)', a);
d = await server(); assert.ok(d.history.some(h => h.weekStart === week)); console.log('PASS app: vase save + weekly snapshot + dog state + weekly reset through rules'); n++;
assert.deepEqual(a.errors, []); console.log('PASS app: no transaction errors'); n++;
console.log(`ALL ${n} CHECKS PASSED`);
await env.cleanup(); process.exit(0);
