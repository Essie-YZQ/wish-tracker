import { db } from './firebase.js?v=2';
import { doc, getDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

function applyHabitStatus(habits, habitStatusData) {
  if (!habitStatusData || typeof habitStatusData !== "object") return;

  habits.forEach(habit => {
    const habitData = habitStatusData[habit.habit_id];
    if (!habitData) return;

    Object.keys(habit.daily_status).forEach(date => {
      if (typeof habitData[date] === "boolean") {
        habit.daily_status[date] = habitData[date];
      }
    });

    habit.done_count = count_done_days(habit.daily_status);

    if (typeof habitData.is_reward_claimed === "boolean") {
      habit.is_reward_claimed = habitData.is_reward_claimed;
    }
  });
}

async function loadFromFirebase() {
  const docRef = doc(db, "shared_state", "main");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();

    console.log("Firebase data:", data);

    const state = get_state();

    if (typeof data.sBalance === "number") {
      state.users[0].wish_balance = data.sBalance;
    }

    if (typeof data.kkBalance === "number") {
      state.users[1].wish_balance = data.kkBalance;
    }

    if (typeof data.poolBalance === "number") {
      state.pool_balance = data.poolBalance;
    }


    if (Array.isArray(data.sWeeklySources)) {
      state.users[0].weekly_source_icons = data.sWeeklySources;
    }   

    if (Array.isArray(data.kkWeeklySources)) {
      state.users[1].weekly_source_icons = data.kkWeeklySources;
    }

    applyHabitStatus(state.users[0].habits, data.sHabitStatus);
    applyHabitStatus(state.users[1].habits, data.kkHabitStatus);

    save_state(state);
    render_app();
  } else {
    console.log("No such document!");
  }
}

function subscribeToFirebaseBalances() {
  const docRef = doc(db, "shared_state", "main");

  onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) {
      console.log("No such document!");
      return;
    }

    const data = docSnap.data();
    console.log("Realtime Firebase data:", data);

    const state = get_state();

    if (typeof data.sBalance === "number") {
      state.users[0].wish_balance = data.sBalance;
    }

    if (typeof data.kkBalance === "number") {
      state.users[1].wish_balance = data.kkBalance;
    }

    if (typeof data.poolBalance === "number") {
      state.pool_balance = data.poolBalance;
    }

    if (Array.isArray(data.sWeeklySources)) {
      state.users[0].weekly_source_icons = data.sWeeklySources;
    }

    if (Array.isArray(data.kkWeeklySources)) {
      state.users[1].weekly_source_icons = data.kkWeeklySources;
    }

    applyHabitStatus(state.users[0].habits, data.sHabitStatus);
    applyHabitStatus(state.users[1].habits, data.kkHabitStatus);

    save_state(state);
    render_app();
  });
}





async function getLatestStateFromFirebase() {
  const state = get_state(); 
  const docRef = doc(db, "shared_state", "main");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();

    if (typeof data.sBalance === "number") {
      state.users[0].wish_balance = data.sBalance;
    }

    if (typeof data.kkBalance === "number") {
      state.users[1].wish_balance = data.kkBalance;
    }

    if (typeof data.poolBalance === "number") {
      state.pool_balance = data.poolBalance;
    }
  }

  return state;
}

async function saveBalancesToFirebase(state, habit_user_id = null) {
  const docRef = doc(db, "shared_state", "main");

  // 👇 收集 S 的 weekly 来源
  const sSources = [
    ...state.users[0].weekly_transfer_icons,
    ...state.users[0].habits
      .filter(h => h.is_reward_claimed)
      .map(h => h.icon)
  ];

  // 👇 收集 KK 的 weekly 来源
  const kkSources = [
    ...state.users[1].weekly_transfer_icons,
    ...state.users[1].habits
      .filter(h => h.is_reward_claimed)
      .map(h => h.icon)
  ];

  const update = {
    sBalance: state.users[0].wish_balance,
    kkBalance: state.users[1].wish_balance,
    poolBalance: state.pool_balance,
    sWeeklySources: sSources,
    kkWeeklySources: kkSources
  };

  if (habit_user_id) {
    const user = state.users.find(u => u.user_id === habit_user_id);
    if (user) {
      const habitStatus = {};
      user.habits.forEach(habit => {
        habitStatus[habit.habit_id] = {
          ...habit.daily_status,
          is_reward_claimed: habit.is_reward_claimed,
          done_count: habit.done_count
        };
      });
      update[habit_user_id === "s" ? "sHabitStatus" : "kkHabitStatus"] = habitStatus;
    }
  }

  await updateDoc(docRef, update);
  console.log("Saved balances + sources to Firebase");
}

async function saveWeeklySnapshot(state) {
  const docRef = doc(db, "shared_state", "main");
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return;
  }

  const data = docSnap.data();
  let history = Array.isArray(data.history) ? data.history : [];

  history = history.filter((item) => typeof item === "object" && item !== null);

  const currentSnapshot = {
    weekStart: state.week_start_date,
    sBalance: state.users[0].wish_balance,
    kkBalance: state.users[1].wish_balance,
    poolBalance: state.pool_balance
  };

  const existingIndex = history.findIndex(
    (item) => item.weekStart === state.week_start_date
  );

  if (existingIndex >= 0) {
    history[existingIndex] = currentSnapshot;
  } else {
    history.push(currentSnapshot);
  }

  await updateDoc(docRef, { history });

  console.log("Saved weekly snapshot:", currentSnapshot);
}

async function resetWeeklySourcesInFirebase() {
  const docRef = doc(db, "shared_state", "main");

  await updateDoc(docRef, {
    sWeeklySources: [],
    kkWeeklySources: []
  });

  console.log("Weekly sources reset in Firebase");
}

const storage_key = "wish_tracker_app_state";
const total_wishes = 30;

const sample_users = [
  {
    user_id: "s",
    name: "S",
    wish_balance: 0,
    total_earned: 0,
    total_spent: 0,
    habits: [
      { habit_id: "s_study", habit_name: "study", display_name: "Study", icon: "📚", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_sleep_early", habit_name: "sleep_early", display_name: "Sleep Early", icon: "🌙", target_per_week: 7, reward_value: 1 },
      { habit_id: "s_workout", habit_name: "workout", display_name: "Workout", icon: "💪", target_per_week: 2, reward_value: 1 },
      { habit_id: "s_cooking", habit_name: "cooking", display_name: "Cooking", icon: "🍜", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_drink_water", habit_name: "drink_water", display_name: "Drink Water", icon: "💧", target_per_week: 7, reward_value: 1 },
      { habit_id: "s_dry_hair", habit_name: "dry_hair", display_name: "Dry Hair", icon: "💁🏻‍♀️", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_practice_violin", habit_name: "practice_violin", display_name: "Practice Violin", icon: "🎻", target_per_week: 2, reward_value: 1 },
      { habit_id: "s_foot_soak", habit_name: "foot_soak", display_name: "Foot Soak", icon: "♨️", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_meet_friends", habit_name: "meet_friends", display_name: "Meet Friends", icon: "👭", target_per_week: 1, reward_value: 1 }
    ]
  },
  {
    user_id: "kk",
    name: "KK",
    wish_balance: 0,
    total_earned: 0,
    total_spent: 0,
    habits: [
      { habit_id: "kk_workout", habit_name: "workout", display_name: "Workout", icon: "💪", target_per_week: 2, reward_value: 1 },
      { habit_id: "kk_study", habit_name: "study", display_name: "Study", icon: "📚", target_per_week: 3, reward_value: 1 },
      { habit_id: "kk_reduce_smoking", habit_name: "reduce_smoking", display_name: "Reduce Smoking", icon: "🚭", target_per_week: 7, reward_value: 1 },
      { habit_id: "kk_didi", habit_name: "didi", display_name: "Didi", icon: "☺️", target_per_week: 1, reward_value: 1 },
      { habit_id: "kk_sleep_early", habit_name: "sleep_early", display_name: "Sleep Early", icon: "🌙", target_per_week: 7, reward_value: 1 }
    ]
  }
];

document.addEventListener("DOMContentLoaded", init_app);

function init_app() {
  // Seed demo data once, then render entirely from localStorage-backed state.
  initialize_storage();
  bind_events();
  render_app();
}

function initialize_storage(force_reset = false) {
  if (!force_reset && localStorage.getItem(storage_key)) {
    return;
  }

  save_state(create_initial_state());
}

function create_initial_state() {
  const week_start_date = get_week_start_date(new Date());

  return {
    week_start_date,
    pool_balance: total_wishes,
    pool_added_this_week: 0,
    last_action: null,
    ui_message: "",
    message_user_id: null,
    users: sample_users.map((user) => create_user_state(user, week_start_date))
  };
}

function create_user_state(user, week_start_date) {
  return {
    user_id: user.user_id,
    name: user.name,
    wish_balance: user.wish_balance,
    total_earned: user.total_earned,
    total_spent: user.total_spent,
    weekly_transfer_icons: [],
    weekly_source_icons: [],
    vase_flowers: [],
    habits: user.habits.map((habit) => create_habit_state(habit, week_start_date))
  };
}

function create_habit_state(habit, week_start_date) {
  const week_dates = get_week_dates(week_start_date);
  const daily_status = {};

  week_dates.forEach((date_value) => {
    daily_status[date_value] = false;
  });

  return {
    habit_id: habit.habit_id,
    habit_name: habit.habit_name,
    display_name: habit.display_name,
    icon: habit.icon || "○",
    target_per_week: habit.target_per_week,
    reward_value: habit.reward_value,
    week_start_date,
    daily_status,
    done_count: 0,
    is_reward_claimed: false,
    earned_at: null
  };
}

function bind_events() {
  document.addEventListener("click", handle_click);
}

function handle_click(event) {
  const toggle_button = event.target.closest("[data_action='toggle_day'], [data-action='toggle_day']");
  const action_button = event.target.closest("[data_action='wish_action'], [data-action='wish_action']");
  const flower_button = event.target.closest("[data-action='pick_flower']");
  const reset_button  = event.target.closest("#reset_demo_button");

  if (flower_button) {
    pick_flower(flower_button.dataset.userId, flower_button.dataset.flowerId);
    return;
  }

  if (toggle_button) {
    console.log("toggle_button found");
    toggle_habit_day(
      toggle_button.dataset.userId,
      toggle_button.dataset.habitId,
      toggle_button.dataset.dateValue
    );
    return;
  }

  if (action_button) {
    console.log("wish_action clicked", action_button.dataset.actionType || action_button.dataset.action_type);
    perform_balance_action(
      action_button.dataset.action_type || action_button.dataset.actionType,
      action_button
    );
    return;
  }

  if (reset_button) {
    initialize_storage(true);
    render_app();
  }
}

function pick_flower(user_id, flower_id) {
  const state = get_state();
  const user  = state.users.find(u => u.user_id === user_id);
  if (!user) return;
  const flowers = user.vase_flowers || [];
  if (flowers.length >= user.wish_balance) return;
  user.vase_flowers = [...flowers, flower_id];
  save_state(state);
  render_summary(state);
}

function get_state() {
  const raw_state = localStorage.getItem(storage_key);
  const parsed_state = raw_state ? JSON.parse(raw_state) : null;
  const current_week_start = get_week_start_date(new Date());

  if (!parsed_state || state_requires_reset(parsed_state)) {
    const reset_state = create_initial_state();
    save_state(reset_state);
    return reset_state;
  }

  // When the calendar week changes, carry balances forward and reset only weekly habit progress.


  if (parsed_state.week_start_date !== current_week_start) {
  const refreshed_state = rollover_to_current_week(parsed_state, current_week_start);
  resetWeeklySourcesInFirebase();
  normalize_balances(refreshed_state);
  save_state(refreshed_state);
  return refreshed_state;
  }


  normalize_balances(parsed_state);
  return parsed_state;
}

function save_state(state) {
  normalize_balances(state);
  localStorage.setItem(storage_key, JSON.stringify(state));
}

function state_requires_reset(state) {
  if (!state || !Array.isArray(state.users) || state.users.length !== sample_users.length) {
    return true;
  }

  return sample_users.some((sample_user, user_index) => {
    const saved_user = state.users[user_index];

    if (!saved_user || saved_user.user_id !== sample_user.user_id || saved_user.name !== sample_user.name) {
      return true;
    }

    if (!Array.isArray(saved_user.habits) || saved_user.habits.length !== sample_user.habits.length) {
      return true;
    }

    return sample_user.habits.some((sample_habit, habit_index) => {
      const saved_habit = saved_user.habits[habit_index];

      return (
        !saved_habit ||
        saved_habit.habit_id !== sample_habit.habit_id ||
        saved_habit.habit_name !== sample_habit.habit_name ||
        saved_habit.display_name !== sample_habit.display_name ||
        saved_habit.icon !== sample_habit.icon ||
        saved_habit.target_per_week !== sample_habit.target_per_week
      );
    });
  });
}

function normalize_balances(state) {
  state.pool_added_this_week = Math.max(0, Number(state.pool_added_this_week) || 0);
  state.last_action = state.last_action || null;
  state.ui_message = typeof state.ui_message === "string" ? state.ui_message : "";
  state.message_user_id = typeof state.message_user_id === "string" ? state.message_user_id : null;

  state.users.forEach((user) => {
    user.wish_balance = Math.max(0, Number(user.wish_balance) || 0);
    user.total_earned = Math.max(0, Number(user.total_earned) || 0);
    user.total_spent = Math.max(0, Number(user.total_spent) || 0);
    user.weekly_transfer_icons = Array.isArray(user.weekly_transfer_icons) ? user.weekly_transfer_icons : [];
  });

  const total_user_balance = state.users.reduce((sum, user) => sum + user.wish_balance, 0);
  state.pool_balance = Math.max(0, total_wishes - total_user_balance);
}

function rollover_to_current_week(state, current_week_start) {
  return {
    ...state,
    week_start_date: current_week_start,
    pool_added_this_week: 0,
    last_action: null,
    ui_message: "",
    message_user_id: null,
    users: state.users.map((user) => ({
      ...user,
      weekly_transfer_icons: [],
      weekly_source_icons: [],
      habits: user.habits.map((habit) => create_habit_state(habit, current_week_start))
    }))
  };
}

function render_app() {
  const state = get_state();
  render_summary(state);
  render_week_label(state.week_start_date);
  render_trackers(state);
  render_actions(state);
}

function render_summary(state) {
  const summary_section = document.getElementById("summary_section");
  const person_a = state.users[0];
  const person_b = state.users[1];
  const person_a_weekly_earned = get_weekly_earned_display(person_a);
  const person_b_weekly_earned = get_weekly_earned_display(person_b);

  const a_flowers = person_a.vase_flowers || [];
  const b_flowers = person_b.vase_flowers || [];

  summary_section.innerHTML = `
    <article class="summary_card user_card">
      <p class="summary_label">${person_a.name} Wishes</p>
      <div class="card_vase_area">
        ${render_flower_picker(person_a.user_id, person_a.wish_balance, a_flowers)}
        ${render_crystal_glass(person_a.user_id, person_a.wish_balance, a_flowers)}
      </div>
      <div class="user_card_row">
        <div class="summary_value">${person_a.wish_balance}</div>
        <p class="summary_meta">${person_a_weekly_earned}</p>
      </div>
      ${render_balance_actions(person_a, person_b, state)}
    </article>
    ${render_pool_card(state)}
    <article class="summary_card user_card user_card_reverse">
      <p class="summary_label">${person_b.name} Wishes</p>
      <div class="card_vase_area">
        ${render_flower_picker(person_b.user_id, person_b.wish_balance, b_flowers)}
        ${render_crystal_glass(person_b.user_id, person_b.wish_balance, b_flowers)}
      </div>
      <div class="user_card_row">
        <div class="summary_value">${person_b.wish_balance}</div>
        <p class="summary_meta">${person_b_weekly_earned}</p>
      </div>
      ${render_balance_actions(person_b, person_a, state)}
    </article>
  `;
}

function get_weekly_earned_display(user) {
  const earned_icons = Array.isArray(user.weekly_source_icons) && user.weekly_source_icons.length > 0
    ? user.weekly_source_icons.join(" ")
    : "";

  return earned_icons ? `+ ${earned_icons} this week` : "+ this week";
}

// ═══════════════════════════════════════════════════════════════
// FLOWER SYSTEM
// ═══════════════════════════════════════════════════════════════

const FLOWER_SVG = {
  carnation: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M18,44 C13,41 12,37 15,34" stroke="#4a8047" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M18,44 C23,41 24,37 21,34" stroke="#4a8047" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M18,34 C13,31 12,28 15,26" stroke="#4a8047" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <circle cx="18" cy="16" r="9"   fill="#f0b090" stroke="#c07060" stroke-width="0.8"/>
    <circle cx="18" cy="8"  r="6"   fill="#f0a880" stroke="#c06858" stroke-width="0.7"/>
    <circle cx="24" cy="11" r="6"   fill="#e89870" stroke="#c06858" stroke-width="0.7"/>
    <circle cx="24" cy="21" r="6"   fill="#f0b090" stroke="#c07060" stroke-width="0.7"/>
    <circle cx="12" cy="11" r="6"   fill="#f0a880" stroke="#c06858" stroke-width="0.7"/>
    <circle cx="12" cy="21" r="6"   fill="#e89870" stroke="#c07060" stroke-width="0.7"/>
    <circle cx="18" cy="24" r="5.5" fill="#f0b090" stroke="#c07060" stroke-width="0.7"/>
    <path d="M13,27 C13,24 18,23 23,27" stroke="#3d6e3a" stroke-width="1" fill="none"/>
    <path d="M15,28 L14,31 M18,28 L18,32 M21,28 L22,31" stroke="#4a8040" stroke-width="0.8"/>
  </svg>`,
  snowdrop: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M17,54 C13,46 12,36 14,26" stroke="#4a8047" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M19,54 C23,46 24,36 22,26" stroke="#4a8047" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M18,28 C20,22 22,17 21,11" stroke="#3d6e3a" stroke-width="1.2" fill="none"/>
    <path d="M17,11 C12,10 11,15 12,19 C13,22 19,23 21,20" fill="white" stroke="#8aaa88" stroke-width="0.8"/>
    <path d="M21,11 C26,10 27,15 26,19 C25,22 19,23 17,20" fill="white" stroke="#8aaa88" stroke-width="0.8"/>
    <path d="M17,11 C16,8 18,7 20,8 C22,9 22,11 21,11" fill="white" stroke="#8aaa88" stroke-width="0.8"/>
    <path d="M17,12 C14,13 14,17 15,19 C16,21 20,21 21,19 C22,17 22,13 19,12 Z" fill="#eef7ee" stroke="#90b090" stroke-width="0.6"/>
    <path d="M16,12 C16,10 18,9 20,10 C20,11 18,12 16,12" fill="#b8d4b8"/>
    <path d="M20,12 C21,10 20,9 18,10 C18,11 19,12 20,12" fill="#b8d4b8"/>
  </svg>`,
  iris: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="30" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M14,56 C11,48 11,38 14,30" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.6"/>
    <path d="M22,56 C25,48 25,38 22,30" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.6"/>
    <path d="M18,25 C14,21 11,14 13,7  C15,11 17,18 18,25" fill="#8272be" stroke="#6050a0" stroke-width="0.8"/>
    <path d="M18,25 C22,21 25,14 23,7  C21,11 19,18 18,25" fill="#7060ab" stroke="#6050a0" stroke-width="0.8"/>
    <path d="M18,25 C17,18 18,11 18,5  C19,11 19,18 18,25" fill="#9888cc" stroke="#6050a0" stroke-width="0.5"/>
    <path d="M18,25 C13,23 7,21 4,16   C8,18 13,21 18,25" fill="#8272be" stroke="#6050a0" stroke-width="0.8"/>
    <path d="M18,25 C23,23 29,21 32,16 C28,18 23,21 18,25" fill="#7060ab" stroke="#6050a0" stroke-width="0.8"/>
    <path d="M18,25 C17,28 16,31 14,30 C15,28 16,26 18,25" fill="#8272be" stroke="#6050a0" stroke-width="0.6"/>
    <path d="M18,25 C19,28 20,31 22,30 C21,28 20,26 18,25" fill="#7060ab" stroke="#6050a0" stroke-width="0.6"/>
    <path d="M15,23 C16,21 17,19 18,18 C18,21 17,23 15,23" fill="#f5e060" opacity="0.9"/>
    <path d="M21,23 C20,21 19,19 18,18 C18,21 19,23 21,23" fill="#f5e060" opacity="0.9"/>
  </svg>`,
  violet: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="52" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,46 C9,44 6,36 10,30 C13,26 17,28 18,32 C19,28 23,26 26,30 C30,36 27,44 18,46 Z" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.6"/>
    <path d="M15,30 C11,28 10,25 12,23" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.4"/>
    <path d="M18,22 C14,18 10,12 12,7  C14,11 16,17 18,22" fill="#8878c8" stroke="#6858a8" stroke-width="0.8"/>
    <path d="M18,22 C22,18 26,12 24,7  C22,11 20,17 18,22" fill="#7868b0" stroke="#6858a8" stroke-width="0.8"/>
    <path d="M18,22 C12,21 6,18 5,14   C9,17 14,19 18,22" fill="#9080c8" stroke="#6858a8" stroke-width="0.8"/>
    <path d="M18,22 C24,21 30,18 31,14 C27,17 22,19 18,22" fill="#9080c8" stroke="#6858a8" stroke-width="0.8"/>
    <path d="M18,22 C16,26 14,30 12,29 C13,26 15,24 18,22" fill="#8878c8" stroke="#6858a8" stroke-width="0.8"/>
    <circle cx="18" cy="21" r="3" fill="#f5e060" stroke="#c8b030" stroke-width="0.5"/>
    <path d="M14,28 C15,25 17,23 18,22" stroke="#5040a0" stroke-width="0.7" fill="none" opacity="0.6"/>
    <path d="M16,29 C16,26 17,24 18,22" stroke="#5040a0" stroke-width="0.6" fill="none" opacity="0.4"/>
  </svg>`,
  jonquil: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <path d="M15,58 C14,48 14,38 16,28" stroke="#4a9050" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <line x1="18" y1="56" x2="18" y2="22" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,24 C20,20 24,16 26,12" stroke="#3d6e3a" stroke-width="1.1" fill="none"/>
    <path d="M18,30 C16,26 12,22 10,18" stroke="#3d6e3a" stroke-width="1"   fill="none"/>
    <ellipse cx="26" cy="10" rx="2.2" ry="4.5" fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="29"   cy="11.5" rx="2.2" ry="4.5" transform="rotate(55,29,11.5)"  fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="29"   cy="15"   rx="2.2" ry="4.5" transform="rotate(110,29,15)"   fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="26"   cy="17"   rx="2.2" ry="4.5" fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="23"   cy="15"   rx="2.2" ry="4.5" transform="rotate(250,23,15)"   fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="23"   cy="11.5" rx="2.2" ry="4.5" transform="rotate(305,23,11.5)" fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <circle cx="26" cy="13" r="3.5" fill="#f5d040" stroke="#d0a820" stroke-width="0.9"/>
    <circle cx="26" cy="13" r="2"   fill="#f0c020"/>
    <ellipse cx="10" cy="16"   rx="1.8" ry="3.8" fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="13" cy="14.5" rx="1.8" ry="3.8" transform="rotate(60,13,14.5)"  fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="13" cy="18"   rx="1.8" ry="3.8" transform="rotate(120,13,18)"   fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="10" cy="19.5" rx="1.8" ry="3.8" fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="7"  cy="18"   rx="1.8" ry="3.8" transform="rotate(240,7,18)"    fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="7"  cy="14.5" rx="1.8" ry="3.8" transform="rotate(300,7,14.5)"  fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <circle cx="10" cy="17" r="3"   fill="#f5d040" stroke="#d0a820" stroke-width="0.8"/>
    <circle cx="10" cy="17" r="1.8" fill="#f0c020"/>
  </svg>`,
  daffodil: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <path d="M22,58 C23,48 23,38 21,28" stroke="#4a9050" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <ellipse cx="18"   cy="7"    rx="3" ry="6.2" fill="#f5d040" stroke="#c8a820" stroke-width="0.7"/>
    <ellipse cx="25.8" cy="11.5" rx="3" ry="6.2" transform="rotate(60,25.8,11.5)"  fill="#f5d040" stroke="#c8a820" stroke-width="0.7"/>
    <ellipse cx="25.8" cy="20.5" rx="3" ry="6.2" transform="rotate(120,25.8,20.5)" fill="#f5d040" stroke="#c8a820" stroke-width="0.7"/>
    <ellipse cx="18"   cy="25"   rx="3" ry="6.2" fill="#f5d040" stroke="#c8a820" stroke-width="0.7"/>
    <ellipse cx="10.2" cy="20.5" rx="3" ry="6.2" transform="rotate(240,10.2,20.5)" fill="#f5d040" stroke="#c8a820" stroke-width="0.7"/>
    <ellipse cx="10.2" cy="11.5" rx="3" ry="6.2" transform="rotate(300,10.2,11.5)" fill="#f5d040" stroke="#c8a820" stroke-width="0.7"/>
    <circle cx="18" cy="16" r="6.5" fill="#f0a820" stroke="#c07818" stroke-width="1.4"/>
    <path d="M12,16 C12,11 15,8 18,8 C21,8 24,11 24,16" fill="none" stroke="#e09020" stroke-width="0.7"/>
    <circle cx="18" cy="16" r="4.5" fill="#f5c030"/>
    <circle cx="18" cy="16" r="2.5" fill="#f8d040"/>
  </svg>`,
  daisy: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,46 C13,44 11,41 13,38 C15,39 17,42 18,46" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,38 C23,36 25,33 23,30 C21,31 19,34 18,38" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,30 C13,28 11,26 13,23" stroke="#4a7c4e" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <ellipse cx="18"   cy="8"    rx="2.2" ry="5" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="22.7" cy="9.5"  rx="2.2" ry="5" transform="rotate(36,22.7,9.5)"   fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="25.6" cy="13.5" rx="2.2" ry="5" transform="rotate(72,25.6,13.5)"  fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="25.6" cy="18.5" rx="2.2" ry="5" transform="rotate(108,25.6,18.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="22.7" cy="22.5" rx="2.2" ry="5" transform="rotate(144,22.7,22.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="18"   cy="24"   rx="2.2" ry="5" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="13.3" cy="22.5" rx="2.2" ry="5" transform="rotate(216,13.3,22.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="10.4" cy="18.5" rx="2.2" ry="5" transform="rotate(252,10.4,18.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="10.4" cy="13.5" rx="2.2" ry="5" transform="rotate(288,10.4,13.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="13.3" cy="9.5"  rx="2.2" ry="5" transform="rotate(324,13.3,9.5)"  fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <circle cx="18" cy="16" r="5" fill="#f5cc20" stroke="#c8a010" stroke-width="0.8"/>
    <circle cx="18" cy="16" r="3" fill="#f8d830"/>
  </svg>`,
  sweet_pea: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,44 C15,42 12,40 11,36 C13,35 16,37 18,40" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,44 C21,42 24,40 25,36 C23,35 20,37 18,40" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,36 C22,34 26,36 27,32 C28,29 25,27 22,29" stroke="#5a9055" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <path d="M18,8  C10,7  7,13  8,18 C9,22 13,24 18,25 C23,24 27,22 28,18 C29,13 26,7 18,8 Z" fill="#c080b8" stroke="#9858a0" stroke-width="0.8"/>
    <path d="M18,10 C13,10 11,14 12,17 C13,20 15,22 18,22 C21,22 23,20 24,17 C25,14 23,10 18,10 Z" fill="#d090c8" stroke="#9858a0" stroke-width="0.5"/>
    <path d="M13,22 C10,26 11,31 14,30 C15,27 14,24 13,22" fill="#b870a8" stroke="#9858a0" stroke-width="0.6"/>
    <path d="M23,22 C26,26 25,31 22,30 C21,27 22,24 23,22" fill="#b870a8" stroke="#9858a0" stroke-width="0.6"/>
    <circle cx="18" cy="16" r="2.5" fill="#f0e0f0"/>
  </svg>`,
  hawthorn: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="32" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,32 C14,28 10,24 8,20"  stroke="#3d6e3a" stroke-width="1.2" fill="none"/>
    <path d="M18,32 C22,28 26,24 28,20" stroke="#3d6e3a" stroke-width="1.1" fill="none"/>
    <path d="M13,36 C9,34 8,30 10,27 C11,29 12,32 13,36" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M23,36 C27,34 28,30 26,27 C25,29 24,32 23,36" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.5"/>
    <circle cx="18" cy="12" r="5"   fill="#d04848" stroke="#a03030" stroke-width="0.8"/>
    <circle cx="10" cy="16" r="4.5" fill="#c83838" stroke="#a03030" stroke-width="0.7"/>
    <circle cx="26" cy="16" r="4.5" fill="#c83838" stroke="#a03030" stroke-width="0.7"/>
    <circle cx="13" cy="22" r="4"   fill="#d04848" stroke="#a03030" stroke-width="0.7"/>
    <circle cx="23" cy="22" r="4"   fill="#c83838" stroke="#a03030" stroke-width="0.7"/>
    <circle cx="18" cy="12" r="1.5" fill="#f5e040"/>
    <circle cx="10" cy="16" r="1.3" fill="#f5e040"/>
    <circle cx="26" cy="16" r="1.3" fill="#f5e040"/>
    <circle cx="13" cy="22" r="1.2" fill="#f5e040"/>
    <circle cx="23" cy="22" r="1.2" fill="#f5e040"/>
  </svg>`,
  lily_valley: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <path d="M10,56 C6,48 5,38 8,28 C10,26 13,27 14,30 C12,38 11,48 10,56" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.7"/>
    <path d="M26,56 C30,48 31,38 28,28 C26,26 23,27 22,30 C24,38 25,48 26,56" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.7"/>
    <line x1="18" y1="50" x2="18" y2="22" stroke="#4a7c4e" stroke-width="1.2"/>
    <path d="M18,22 C20,16 24,12 26,8"  stroke="#4a7c4e" stroke-width="1.1" fill="none"/>
    <path d="M18,22 C16,16 12,12 10,8"  stroke="#4a7c4e" stroke-width="1"   fill="none"/>
    <path d="M25,9  C22,8  21,12 22,15 C23,17 26,17 27,14 C28,11 27,8  25,9  Z" fill="white" stroke="#90b090" stroke-width="0.7"/>
    <path d="M21,17 C18,16 17,20 18,23 C19,25 22,25 23,22 C24,19 23,16 21,17 Z" fill="white" stroke="#90b090" stroke-width="0.7"/>
    <path d="M11,9  C8,8   7,12  8,15  C9,17  12,17 13,14 C14,11 13,8  11,9  Z" fill="white" stroke="#90b090" stroke-width="0.7"/>
    <path d="M15,17 C12,16 11,20 12,23 C13,25 16,25 17,22 C18,19 17,16 15,17 Z" fill="white" stroke="#90b090" stroke-width="0.7"/>
  </svg>`,
  rose: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M16,48 L13,45" stroke="#4a5830" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M20,40 L23,37" stroke="#4a5830" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M18,38 C15,36 11,37 9,34 C11,31 15,30 18,32" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,38 C21,36 25,37 27,34 C25,31 21,30 18,32" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,32 C16,29 14,27 15,24 C17,22 19,24 18,28 Z" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M12,28 C10,26 9,22 12,20  C13,23 12,26 12,28" fill="#4a8047"/>
    <path d="M24,28 C26,26 27,22 24,20 C23,23 24,26 24,28" fill="#4a8047"/>
    <path d="M18,28 C17,25 16,22 17,20 C18,20 20,20 19,22 C19,25 18,27 18,28" fill="#4a8047"/>
    <path d="M18,26 C9,24 6,18 8,12 C11,8 15,7 18,8 C21,7 25,8 28,12 C30,18 27,24 18,26 Z" fill="#c84040" stroke="#a02828" stroke-width="0.8"/>
    <path d="M18,23 C12,22 10,17 12,13 C14,10 16,9 18,10 C20,9 22,10 24,13 C26,17 24,22 18,23 Z" fill="#d85050" stroke="#a02828" stroke-width="0.7"/>
    <path d="M18,20 C14,19 13,16 15,13 C16,11 17,10 18,11 C19,10 20,11 21,13 C23,16 22,19 18,20 Z" fill="#e06060" stroke="#a02828" stroke-width="0.6"/>
    <path d="M18,18 C16,17 16,15 17,13 C17,15 18,17 18,18 Z" fill="#f08080"/>
    <path d="M18,18 C20,17 20,15 19,13 C19,15 18,17 18,18 Z" fill="#e87070"/>
  </svg>`,
  honeysuckle: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,44 C12,42 9,38 11,34 C13,32 17,34 18,38" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,44 C24,42 27,38 25,34 C23,32 19,34 18,38" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,34 C12,32 9,28 11,24 C13,22 17,24 18,28" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.4"/>
    <path d="M18,34 C24,32 27,28 25,24 C23,22 19,24 18,28" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.4"/>
    <path d="M18,28 C22,24 26,20 26,14" stroke="#4a7c4e" stroke-width="1.2" fill="none"/>
    <path d="M18,28 C14,22 10,18 10,12" stroke="#4a7c4e" stroke-width="1"   fill="none"/>
    <path d="M22,14 C20,8 18,7 16,9 C14,11 14,16 18,18 C20,17 22,16 22,14 Z" fill="#f0d0a8" stroke="#c09870" stroke-width="0.8"/>
    <path d="M22,14 C24,12 26,12 26,14 C26,16 24,18 22,18 C22,16 22,15 22,14" fill="#f8e0b8" stroke="#c09870" stroke-width="0.6"/>
    <line x1="18" y1="14" x2="28" y2="9"  stroke="#d8b060" stroke-width="0.7"/>
    <line x1="18" y1="14" x2="29" y2="11" stroke="#d8b060" stroke-width="0.7"/>
    <line x1="18" y1="14" x2="28" y2="7"  stroke="#d8b060" stroke-width="0.6"/>
    <path d="M11,12 C9,6 7,5 5,7 C3,9 3,14 7,16 C9,15 11,14 11,12 Z" fill="#f0d8b8" stroke="#c09870" stroke-width="0.7"/>
    <path d="M11,12 C13,10 15,10 15,12 C15,14 13,16 11,16 C11,14 11,13 11,12" fill="#f8e0c0" stroke="#c09870" stroke-width="0.5"/>
  </svg>`,
  larkspur: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="5" stroke="#3d6e3a" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M18,40 C14,38 10,35 8,30 M18,40 C16,36 14,32 14,28 M18,40 C20,36 22,32 22,28 M18,40 C22,38 26,35 28,30" stroke="#4a8047" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M18,32 C14,30 11,27 10,23 M18,32 C17,28 16,24 17,20" stroke="#4a8047" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <path d="M18,26 C13,24 10,20 12,16 C13,18 16,22 18,26" fill="#6080c8" stroke="#4060a8" stroke-width="0.6"/>
    <path d="M18,26 C23,24 26,20 24,16 C23,18 20,22 18,26" fill="#5070b8" stroke="#4060a8" stroke-width="0.6"/>
    <path d="M18,26 C16,29 14,30 13,28 C14,26 16,26 18,26" fill="#7090d0" stroke="#4060a8" stroke-width="0.5"/>
    <path d="M18,18 C13,16 10,12 12,8  C13,10 16,14 18,18" fill="#6080c8" stroke="#4060a8" stroke-width="0.6"/>
    <path d="M18,18 C23,16 26,12 24,8  C23,10 20,14 18,18" fill="#5070b8" stroke="#4060a8" stroke-width="0.6"/>
    <path d="M18,18 C16,21 14,22 13,20 C14,18 16,18 18,18" fill="#7090d0" stroke="#4060a8" stroke-width="0.5"/>
    <path d="M18,26 C20,28 22,30 20,33" stroke="#5070b0" stroke-width="1"   fill="none"/>
    <path d="M18,18 C20,20 22,22 20,25" stroke="#5070b0" stroke-width="0.8" fill="none"/>
    <ellipse cx="18" cy="9"  rx="3.5" ry="4.5" fill="#7090d0" stroke="#5070b0" stroke-width="0.8"/>
    <ellipse cx="18" cy="5"  rx="2"   ry="3"   fill="#9ab0e0"/>
  </svg>`,
  water_lily: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="30" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,44 C10,44 4,40 4,34 C4,28 10,24 18,24 C26,24 32,28 32,34 C32,40 26,44 18,44 Z" fill="#4a9050" stroke="#3d6e3a" stroke-width="0.7"/>
    <path d="M18,44 L18,24" stroke="#3d6e3a" stroke-width="0.8" fill="none"/>
    <path d="M18,34 C14,32 10,30 8,32" stroke="#5a9055" stroke-width="0.5" fill="none" opacity="0.6"/>
    <path d="M18,34 C22,32 26,30 28,32" stroke="#5a9055" stroke-width="0.5" fill="none" opacity="0.6"/>
    <ellipse cx="18"   cy="10"  rx="3" ry="6.5" fill="#a090d0" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="24.2" cy="12"  rx="3" ry="6.5" transform="rotate(45,24.2,12)"  fill="#9888c8" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="27"   cy="18"  rx="3" ry="6.5" transform="rotate(90,27,18)"    fill="#a090d0" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="24.2" cy="24"  rx="3" ry="6.5" transform="rotate(135,24.2,24)" fill="#9888c8" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="18"   cy="26"  rx="3" ry="6.5" fill="#a090d0" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="11.8" cy="24"  rx="3" ry="6.5" transform="rotate(225,11.8,24)" fill="#9888c8" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="9"    cy="18"  rx="3" ry="6.5" transform="rotate(270,9,18)"    fill="#a090d0" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="11.8" cy="12"  rx="3" ry="6.5" transform="rotate(315,11.8,12)" fill="#9888c8" stroke="#7868b0" stroke-width="0.6"/>
    <circle cx="18" cy="18" r="5" fill="#f5e080" stroke="#c8b030" stroke-width="0.8"/>
    <circle cx="18" cy="18" r="3" fill="#f8f080"/>
  </svg>`,
  poppy: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,46 C13,44 9,40 10,35 C12,33 15,34 16,38 C15,34 14,30 16,27" fill="#4a8a6a" stroke="#2d6640" stroke-width="0.6"/>
    <path d="M18,40 C23,38 27,34 26,29 C24,27 21,28 20,32" fill="#3a7a5a" stroke="#2d6640" stroke-width="0.5"/>
    <line x1="15" y1="36" x2="12" y2="34" stroke="#4a7040" stroke-width="0.8"/>
    <line x1="21" y1="32" x2="24" y2="30" stroke="#4a7040" stroke-width="0.8"/>
    <path d="M14,28 C14,24 16,22 18,22 C20,22 22,24 22,28" fill="#4a8047"/>
    <ellipse cx="18" cy="8"  rx="7"   ry="8.5" fill="#d03830" stroke="#a02020" stroke-width="0.8"/>
    <ellipse cx="26" cy="16" rx="8.5" ry="7"   fill="#d03830" stroke="#a02020" stroke-width="0.8"/>
    <ellipse cx="18" cy="24" rx="7"   ry="8.5" fill="#d03830" stroke="#a02020" stroke-width="0.8"/>
    <ellipse cx="10" cy="16" rx="8.5" ry="7"   fill="#d03830" stroke="#a02020" stroke-width="0.8"/>
    <circle cx="18" cy="16" r="5.5" fill="#1e1020"/>
    <circle cx="18" cy="13" r="0.8" fill="#f5e030"/>
    <circle cx="21" cy="14" r="0.8" fill="#f5e030"/>
    <circle cx="22" cy="17" r="0.8" fill="#f5e030"/>
    <circle cx="21" cy="20" r="0.8" fill="#f5e030"/>
    <circle cx="18" cy="21" r="0.8" fill="#f5e030"/>
    <circle cx="15" cy="20" r="0.8" fill="#f5e030"/>
    <circle cx="14" cy="17" r="0.8" fill="#f5e030"/>
    <circle cx="15" cy="14" r="0.8" fill="#f5e030"/>
  </svg>`,
  gladiolus: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="5" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M12,56 C10,46 10,36 13,26" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M24,56 C26,46 26,36 23,26" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,28 C11,25 8,20 10,16 C12,18 15,23 18,28" fill="#d06040" stroke="#a04028" stroke-width="0.8"/>
    <path d="M18,28 C25,25 28,20 26,16 C24,18 21,23 18,28" fill="#c05030" stroke="#a04028" stroke-width="0.8"/>
    <path d="M18,28 C16,32 14,34 12,32 C13,30 15,29 18,28" fill="#d06040"/>
    <path d="M18,28 C20,32 22,34 24,32 C23,30 21,29 18,28" fill="#d06040"/>
    <path d="M18,20 C11,17  9,12 11,8  C13,10 16,15 18,20" fill="#d06040" stroke="#a04028" stroke-width="0.7"/>
    <path d="M18,20 C25,17 27,12 25,8  C23,10 20,15 18,20" fill="#c05030" stroke="#a04028" stroke-width="0.7"/>
    <path d="M15,8 C15,4 17,3 18,3 C19,3 21,4 21,8 C20,10 16,10 15,8 Z" fill="#e07050" stroke="#a04028" stroke-width="0.7"/>
  </svg>`,
  morning_glory: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <path d="M18,56 C16,50 14,44 16,38 C18,34 20,38 18,44 C16,50 18,56 18,56" stroke="#3d6e3a" stroke-width="1.4" fill="none"/>
    <path d="M18,44 C14,44 10,40 10,35 C10,30 14,28 18,31 C22,28 26,30 26,35 C26,40 22,44 18,44 Z" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.6"/>
    <path d="M18,38 C22,36 26,38 27,34 C28,30 24,28 21,31" stroke="#5a9055" stroke-width="0.9" fill="none"/>
    <path d="M18,26 C8,22  4,14  6,8  C8,5  12,4 16,6  C14,8 12,14 18,26 Z" fill="#7060c0" stroke="#5040a0" stroke-width="0.8"/>
    <path d="M18,26 C28,22 32,14 30,8 C28,5 24,4 20,6 C22,8 24,14 18,26 Z" fill="#6050b0" stroke="#5040a0" stroke-width="0.8"/>
    <path d="M18,26 C12,28  6,26  4,22 C6,20  12,22 18,26 Z" fill="#7060c0" stroke="#5040a0" stroke-width="0.7"/>
    <path d="M18,26 C24,28 30,26 32,22 C30,20 24,22 18,26 Z" fill="#6050b0" stroke="#5040a0" stroke-width="0.7"/>
    <path d="M18,26 C16,30 14,32 12,30 C13,28 15,27 18,26" fill="#7868c8" stroke="#5040a0" stroke-width="0.5"/>
    <path d="M18,26 C17,20 16,14 17,8  C18,12 18,20 18,26" fill="white" opacity="0.32"/>
    <path d="M18,26 C14,22 10,18  8,14 C11,16 15,20 18,26" fill="white" opacity="0.2"/>
    <path d="M18,26 C22,22 26,18 28,14 C25,16 21,20 18,26" fill="white" opacity="0.2"/>
    <circle cx="18" cy="24" r="3.5" fill="white" opacity="0.88"/>
  </svg>`,
  aster: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,46 C13,45 10,42 11,38 C13,37 16,39 18,42" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,38 C23,37 26,34 25,30 C23,29 20,31 18,34" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,30 C13,29 10,27 11,24" stroke="#4a7c4e" stroke-width="1" fill="none" stroke-linecap="round"/>
    <ellipse cx="18"   cy="7.5"  rx="2" ry="5.5" fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="20.9" cy="8.3"  rx="2" ry="5.5" transform="rotate(25.7,20.9,8.3)"   fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="23.3" cy="10.5" rx="2" ry="5.5" transform="rotate(51.4,23.3,10.5)"  fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="24.5" cy="13.7" rx="2" ry="5.5" transform="rotate(77.1,24.5,13.7)"  fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="24.3" cy="17.2" rx="2" ry="5.5" transform="rotate(102.9,24.3,17.2)" fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="22.6" cy="20.4" rx="2" ry="5.5" transform="rotate(128.6,22.6,20.4)" fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="20"   cy="22.6" rx="2" ry="5.5" transform="rotate(154.3,20,22.6)"   fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="18"   cy="24.5" rx="2" ry="5.5" fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="16"   cy="22.6" rx="2" ry="5.5" transform="rotate(205.7,16,22.6)"   fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="13.4" cy="20.4" rx="2" ry="5.5" transform="rotate(231.4,13.4,20.4)" fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="11.7" cy="17.2" rx="2" ry="5.5" transform="rotate(257.1,11.7,17.2)" fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="11.5" cy="13.7" rx="2" ry="5.5" transform="rotate(282.9,11.5,13.7)" fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="12.7" cy="10.5" rx="2" ry="5.5" transform="rotate(308.6,12.7,10.5)" fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="15.1" cy="8.3"  rx="2" ry="5.5" transform="rotate(334.3,15.1,8.3)"  fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <circle cx="18" cy="16" r="4.5" fill="#f5cc20" stroke="#c8a010" stroke-width="0.8"/>
  </svg>`,
  cosmos: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,46 C15,44 12,42 10,38 M18,46 C14,43 13,40 14,36 M18,46 C16,43 16,40 17,37" stroke="#5a9055" stroke-width="0.8" fill="none" stroke-linecap="round"/>
    <path d="M18,38 C21,36 24,34 26,30 M18,38 C22,35 23,32 22,28 M18,38 C20,35 20,32 19,28" stroke="#4a8047" stroke-width="0.8" fill="none" stroke-linecap="round"/>
    <path d="M12,40 C10,38 8,36 9,33 M14,38 C12,36 11,34 12,31" stroke="#5a9055" stroke-width="0.6" fill="none" stroke-linecap="round"/>
    <path d="M22,32 C24,30 26,28 25,25 M20,30 C22,28 23,26 22,23" stroke="#4a8047" stroke-width="0.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="18"   cy="8"    rx="3" ry="6" fill="#e888b8" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="23.7" cy="10.3" rx="3" ry="6" transform="rotate(45,23.7,10.3)"  fill="#e080b0" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="26"   cy="16"   rx="3" ry="6" transform="rotate(90,26,16)"       fill="#e888b8" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="23.7" cy="21.7" rx="3" ry="6" transform="rotate(135,23.7,21.7)" fill="#e080b0" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="18"   cy="24"   rx="3" ry="6" fill="#e888b8" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="12.3" cy="21.7" rx="3" ry="6" transform="rotate(225,12.3,21.7)" fill="#e080b0" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="10"   cy="16"   rx="3" ry="6" transform="rotate(270,10,16)"      fill="#e888b8" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="12.3" cy="10.3" rx="3" ry="6" transform="rotate(315,12.3,10.3)" fill="#e080b0" stroke="#c06090" stroke-width="0.6"/>
    <circle cx="18" cy="16" r="4" fill="#f5cc20" stroke="#c8a010" stroke-width="0.8"/>
  </svg>`,
  marigold: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,42 C13,40 10,36 12,32" stroke="#3d6e3a" stroke-width="1" fill="none"/>
    <path d="M12,38 C10,36 11,33 13,33" fill="#4a7035" stroke="#2d5020" stroke-width="0.5"/>
    <path d="M11,34 C9,32 10,29 12,29"  fill="#4a7035" stroke="#2d5020" stroke-width="0.5"/>
    <path d="M18,42 C23,40 26,36 24,32" stroke="#3d6e3a" stroke-width="1" fill="none"/>
    <path d="M24,38 C26,36 25,33 23,33" fill="#3a6030" stroke="#2d5020" stroke-width="0.5"/>
    <path d="M25,34 C27,32 26,29 24,29" fill="#3a6030" stroke="#2d5020" stroke-width="0.5"/>
    <path d="M18,32 C16,29 16,26 18,24 C20,26 20,29 18,32" fill="#4a7035" stroke="#2d5020" stroke-width="0.5"/>
    <ellipse cx="18"   cy="7"    rx="3.2" ry="5.5" fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="22.8" cy="8.5"  rx="3.2" ry="5.5" transform="rotate(36,22.8,8.5)"   fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="25.7" cy="12.5" rx="3.2" ry="5.5" transform="rotate(72,25.7,12.5)"  fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="25.7" cy="17.5" rx="3.2" ry="5.5" transform="rotate(108,25.7,17.5)" fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="22.8" cy="21.5" rx="3.2" ry="5.5" transform="rotate(144,22.8,21.5)" fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="18"   cy="23"   rx="3.2" ry="5.5" fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="13.2" cy="21.5" rx="3.2" ry="5.5" transform="rotate(216,13.2,21.5)" fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="10.3" cy="17.5" rx="3.2" ry="5.5" transform="rotate(252,10.3,17.5)" fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="10.3" cy="12.5" rx="3.2" ry="5.5" transform="rotate(288,10.3,12.5)" fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="13.2" cy="8.5"  rx="3.2" ry="5.5" transform="rotate(324,13.2,8.5)"  fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="18"   cy="9"    rx="2.5" ry="4"   fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="21"   cy="10.5" rx="2.5" ry="4"   transform="rotate(36,21,10.5)"    fill="#e88030" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="23"   cy="14"   rx="2.5" ry="4"   transform="rotate(72,23,14)"      fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="23"   cy="18"   rx="2.5" ry="4"   transform="rotate(108,23,18)"     fill="#e88030" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="21"   cy="21.5" rx="2.5" ry="4"   transform="rotate(144,21,21.5)"   fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="15"   cy="21.5" rx="2.5" ry="4"   transform="rotate(216,15,21.5)"   fill="#e88030" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="13"   cy="18"   rx="2.5" ry="4"   transform="rotate(252,13,18)"     fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="13"   cy="14"   rx="2.5" ry="4"   transform="rotate(288,13,14)"     fill="#e88030" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="15"   cy="10.5" rx="2.5" ry="4"   transform="rotate(324,15,10.5)"   fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <circle cx="18" cy="16" r="4" fill="#f5c020" stroke="#c89010" stroke-width="0.7"/>
  </svg>`,
  chrysanthemum: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,44 C12,42 8,38 9,33 C10,31 13,31 14,34 C13,31 12,27 14,25 C16,24 18,26 18,29" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.6"/>
    <path d="M18,38 C24,36 28,32 27,27 C26,25 23,25 22,28 C23,25 24,21 22,19 C20,18 18,20 18,23" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.5"/>
    <ellipse cx="18"   cy="6"    rx="1.8" ry="7" fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="21.1" cy="6.7"  rx="1.8" ry="7" transform="rotate(20,21.1,6.7)"   fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="23.8" cy="8.6"  rx="1.8" ry="7" transform="rotate(40,23.8,8.6)"   fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="25.6" cy="11.6" rx="1.8" ry="7" transform="rotate(60,25.6,11.6)"  fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="26.3" cy="15"   rx="1.8" ry="7" transform="rotate(80,26.3,15)"    fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="25.8" cy="18.4" rx="1.8" ry="7" transform="rotate(100,25.8,18.4)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="24.1" cy="21.5" rx="1.8" ry="7" transform="rotate(120,24.1,21.5)" fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="21.4" cy="23.9" rx="1.8" ry="7" transform="rotate(140,21.4,23.9)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="18"   cy="25"   rx="1.8" ry="7" fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="14.6" cy="23.9" rx="1.8" ry="7" transform="rotate(220,14.6,23.9)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="11.9" cy="21.5" rx="1.8" ry="7" transform="rotate(240,11.9,21.5)" fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="10.2" cy="18.4" rx="1.8" ry="7" transform="rotate(260,10.2,18.4)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="9.7"  cy="15"   rx="1.8" ry="7" transform="rotate(280,9.7,15)"    fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="10.4" cy="11.6" rx="1.8" ry="7" transform="rotate(300,10.4,11.6)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="12.2" cy="8.6"  rx="1.8" ry="7" transform="rotate(320,12.2,8.6)"  fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="14.9" cy="6.7"  rx="1.8" ry="7" transform="rotate(340,14.9,6.7)"  fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="18"   cy="9"    rx="1.5" ry="6" fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="21.4" cy="9.9"  rx="1.5" ry="6" transform="rotate(30,21.4,9.9)"   fill="#e01878" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="23.8" cy="13"   rx="1.5" ry="6" transform="rotate(60,23.8,13)"    fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="23.8" cy="17"   rx="1.5" ry="6" transform="rotate(90,23.8,17)"    fill="#e01878" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="21.4" cy="21"   rx="1.5" ry="6" transform="rotate(120,21.4,21)"   fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="18"   cy="23"   rx="1.5" ry="6" fill="#e01878" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="14.6" cy="21"   rx="1.5" ry="6" transform="rotate(240,14.6,21)"   fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="12.2" cy="17"   rx="1.5" ry="6" transform="rotate(270,12.2,17)"   fill="#e01878" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="12.2" cy="13"   rx="1.5" ry="6" transform="rotate(300,12.2,13)"   fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="14.6" cy="9.9"  rx="1.5" ry="6" transform="rotate(330,14.6,9.9)"  fill="#e01878" stroke="#a01058" stroke-width="0.4"/>
  </svg>`,
  peony: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,40 C13,38 9,34 10,28" stroke="#3d6e3a" stroke-width="1" fill="none"/>
    <path d="M10,34 C6,32 5,28 7,25 C9,23 12,24 13,27" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M14,30 C10,28 9,24 11,21 C13,19 16,20 16,23" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.5"/>
    <path d="M18,28 C16,25 16,22 18,20 C20,22 20,25 18,28" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.4"/>
    <path d="M9,28  C9,22 12,17 18,14 C24,17 27,22 27,28" fill="#d88098" stroke="#c06080" stroke-width="0.6"/>
    <path d="M18,26 C10,24 7,18 9,12 C12,8 15,7 18,8 C21,7 24,8 27,12 C29,18 26,24 18,26 Z" fill="#e8a8b8" stroke="#c07090" stroke-width="0.8"/>
    <path d="M18,23 C12,21 10,17 12,12 C14,9 16,8 18,9 C20,8 22,9 24,12 C26,17 24,21 18,23 Z" fill="#f0b8c8" stroke="#c07090" stroke-width="0.7"/>
    <path d="M18,20 C14,19 12,16 13,12 C14,10 16,9 18,10 C20,9 22,10 23,12 C24,16 22,19 18,20 Z" fill="#f8c8d4" stroke="#c07090" stroke-width="0.6"/>
    <path d="M18,18 C15,17 14,15 15,12 C16,10 17,10 18,11 C19,10 20,10 21,12 C22,15 21,17 18,18 Z" fill="#fcd8e0" stroke="#c07090" stroke-width="0.5"/>
    <path d="M18,16 C16,15 17,13 18,12 C19,13 20,15 18,16 Z" fill="#ffe8f0"/>
  </svg>`,
  narcissus: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <path d="M20,58 C22,48 22,38 20,28" stroke="#4a9050" stroke-width="2" fill="none" stroke-linecap="round"/>
    <line x1="18" y1="56" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <ellipse cx="18"   cy="7"    rx="2.8" ry="5.5" fill="white"   stroke="#c0b890" stroke-width="0.7"/>
    <ellipse cx="25.8" cy="11.5" rx="2.8" ry="5.5" transform="rotate(60,25.8,11.5)"  fill="#f5f0e0" stroke="#c0b890" stroke-width="0.7"/>
    <ellipse cx="25.8" cy="20.5" rx="2.8" ry="5.5" transform="rotate(120,25.8,20.5)" fill="white"   stroke="#c0b890" stroke-width="0.7"/>
    <ellipse cx="18"   cy="25"   rx="2.8" ry="5.5" fill="#f5f0e0" stroke="#c0b890" stroke-width="0.7"/>
    <ellipse cx="10.2" cy="20.5" rx="2.8" ry="5.5" transform="rotate(240,10.2,20.5)" fill="white"   stroke="#c0b890" stroke-width="0.7"/>
    <ellipse cx="10.2" cy="11.5" rx="2.8" ry="5.5" transform="rotate(300,10.2,11.5)" fill="#f5f0e0" stroke="#c0b890" stroke-width="0.7"/>
    <circle cx="18" cy="16" r="6" fill="#f08820" stroke="#c06010" stroke-width="1.4"/>
    <path d="M12,16 C12,11 14.5,9 18,9 C21.5,9 24,11 24,16" fill="none" stroke="#d07018" stroke-width="0.8"/>
    <circle cx="18" cy="16" r="4.5" fill="#f5a030"/>
    <circle cx="18" cy="16" r="3"   fill="#f8b840"/>
    <circle cx="18" cy="16" r="1.5" fill="#2d1a08"/>
    <circle cx="18" cy="14" r="0.7" fill="#f8e060"/>
    <circle cx="20" cy="15" r="0.7" fill="#f8e060"/>
    <circle cx="20" cy="17" r="0.7" fill="#f8e060"/>
  </svg>`,
  holly: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="56" x2="18" y2="36" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,36 C14,29 10,23 8,16"  stroke="#3d6e3a" stroke-width="1.2" fill="none"/>
    <path d="M18,36 C22,29 26,23 28,16" stroke="#3d6e3a" stroke-width="1"   fill="none"/>
    <path d="M8,17  C4,15 3,11 5,8  C6,9  7,10 7,13 C8,10 10,8 13,9 C13,12 11,14 8,17 Z"  fill="#2a7828" stroke="#1a5020" stroke-width="0.8"/>
    <path d="M8,17  C5,20 4,24 6,26  C8,24 9,21 8,17 Z"  fill="#2a7828" stroke="#1a5020" stroke-width="0.7"/>
    <path d="M28,16 C32,14 33,10 31,7 C29,8 28,10 28,13 C27,10 25,8 23,9 C23,12 25,14 28,16 Z" fill="#348030" stroke="#1a5020" stroke-width="0.8"/>
    <path d="M28,16 C31,19 32,23 30,25 C28,23 27,20 28,16 Z" fill="#348030" stroke="#1a5020" stroke-width="0.7"/>
    <circle cx="16" cy="26" r="4"   fill="#d03030" stroke="#901818" stroke-width="0.9"/>
    <circle cx="21" cy="24" r="4"   fill="#c82828" stroke="#901818" stroke-width="0.9"/>
    <circle cx="18" cy="30" r="3.5" fill="#d83030" stroke="#901818" stroke-width="0.9"/>
    <circle cx="16" cy="26" r="1.3" fill="#e84040" opacity="0.55"/>
    <circle cx="21" cy="24" r="1.3" fill="#e84040" opacity="0.55"/>
    <circle cx="18" cy="30" r="1.1" fill="#e84040" opacity="0.55"/>
  </svg>`,
};
    <circle cx="18" cy="16" r="9"   fill="#f0b090" stroke="#c07060" stroke-width="0.8"/>
    <circle cx="18" cy="8"  r="6"   fill="#f0a880" stroke="#c06858" stroke-width="0.7"/>
    <circle cx="24" cy="11" r="6"   fill="#e89870" stroke="#c06858" stroke-width="0.7"/>
    <circle cx="24" cy="21" r="6"   fill="#f0b090" stroke="#c07060" stroke-width="0.7"/>
    <circle cx="12" cy="11" r="6"   fill="#f0a880" stroke="#c06858" stroke-width="0.7"/>
    <circle cx="12" cy="21" r="6"   fill="#e89870" stroke="#c07060" stroke-width="0.7"/>
    <circle cx="18" cy="24" r="5.5" fill="#f0b090" stroke="#c07060" stroke-width="0.7"/>
    <path d="M13,27 C13,24 18,23 23,27" stroke="#3d6e3a" stroke-width="1" fill="none"/>`),

  snowdrop: _svg(`<line x1="18" y1="58" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,38 C9,32 7,23 12,18 C14,23 16,31 18,38" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.4"/>`, `
    <path d="M18,28 C20,22 22,16 21,10" stroke="#3d6e3a" stroke-width="1.2" fill="none"/>
    <path d="M17,10 C13,10 12,15 13,19 C14,23 22,23 23,19 C24,15 23,10 19,10 Z" fill="white" stroke="#8aaa88" stroke-width="0.8"/>
    <path d="M17,10 C15,10 14,14 15,17 C16,19 20,19 21,17 C22,14 21,10 19,10 Z" fill="#eef7ee"/>
    <path d="M16,10 C16,7 18,6 20,8 C20,9 18,10 16,10" fill="#4a8040"/>`),

  iris: _svg(_SL, `
    <path d="M18,25 C14,21 11,14 13,7  C15,11 17,18 18,25" fill="#8272be" stroke="#6050a0" stroke-width="0.8"/>
    <path d="M18,25 C22,21 25,14 23,7  C21,11 19,18 18,25" fill="#7060ab" stroke="#6050a0" stroke-width="0.8"/>
    <path d="M18,25 C17,18 18,11 18,5  C19,11 19,18 18,25" fill="#9888cc" stroke="#6050a0" stroke-width="0.5"/>
    <path d="M18,25 C13,23 7,21 4,16   C8,18 13,21 18,25" fill="#8272be" stroke="#6050a0" stroke-width="0.8"/>
    <path d="M18,25 C23,23 29,21 32,16 C28,18 23,21 18,25" fill="#7060ab" stroke="#6050a0" stroke-width="0.8"/>
    <path d="M18,25 C17,28 16,31 14,30 C15,28 16,26 18,25" fill="#8272be" stroke="#6050a0" stroke-width="0.6"/>
    <path d="M18,25 C19,28 20,31 22,30 C21,28 20,26 18,25" fill="#7060ab" stroke="#6050a0" stroke-width="0.6"/>
    <path d="M15,23 C16,21 17,19 18,18 C18,21 17,23 15,23" fill="#f5e060" opacity="0.9"/>
    <path d="M21,23 C20,21 19,19 18,18 C18,21 19,23 21,23" fill="#f5e060" opacity="0.9"/>`),

  violet: _svg(_SL, `
    <path d="M18,22 C14,18 10,12 12,7  C14,11 16,17 18,22" fill="#8878c8" stroke="#6858a8" stroke-width="0.8"/>
    <path d="M18,22 C22,18 26,12 24,7  C22,11 20,17 18,22" fill="#7868b0" stroke="#6858a8" stroke-width="0.8"/>
    <path d="M18,22 C12,21 6,18 5,14   C9,17 14,19 18,22" fill="#9080c8" stroke="#6858a8" stroke-width="0.8"/>
    <path d="M18,22 C24,21 30,18 31,14 C27,17 22,19 18,22" fill="#9080c8" stroke="#6858a8" stroke-width="0.8"/>
    <path d="M18,22 C16,26 14,30 12,29 C13,26 15,24 18,22" fill="#8878c8" stroke="#6858a8" stroke-width="0.8"/>
    <circle cx="18" cy="21" r="3" fill="#f5e060" stroke="#c8b030" stroke-width="0.5"/>
    <path d="M14,28 C15,25 17,23 18,22" stroke="#5040a0" stroke-width="0.6" fill="none" opacity="0.5"/>
    <path d="M16,29 C16,26 17,24 18,22" stroke="#5040a0" stroke-width="0.6" fill="none" opacity="0.5"/>`),

  jonquil: _svg(_SL, `
    <ellipse cx="18"   cy="7"    rx="2.8" ry="5.5" fill="white"   stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="25.8" cy="11.5" rx="2.8" ry="5.5" transform="rotate(60,25.8,11.5)"  fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="25.8" cy="20.5" rx="2.8" ry="5.5" transform="rotate(120,25.8,20.5)" fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="18"   cy="25"   rx="2.8" ry="5.5" fill="white"   stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="10.2" cy="20.5" rx="2.8" ry="5.5" transform="rotate(240,10.2,20.5)" fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <ellipse cx="10.2" cy="11.5" rx="2.8" ry="5.5" transform="rotate(300,10.2,11.5)" fill="white" stroke="#c8c4a0" stroke-width="0.5"/>
    <circle cx="18" cy="16" r="5"   fill="#f5d040" stroke="#d0a820" stroke-width="1.2"/>
    <circle cx="18" cy="16" r="3"   fill="#f0c020"/>`),

  daffodil: _svg(_SL, `
    <ellipse cx="18"   cy="7"    rx="3" ry="6" fill="#f5d040" stroke="#c8a820" stroke-width="0.6"/>
    <ellipse cx="25.8" cy="11.5" rx="3" ry="6" transform="rotate(60,25.8,11.5)"  fill="#f5d040" stroke="#c8a820" stroke-width="0.6"/>
    <ellipse cx="25.8" cy="20.5" rx="3" ry="6" transform="rotate(120,25.8,20.5)" fill="#f5d040" stroke="#c8a820" stroke-width="0.6"/>
    <ellipse cx="18"   cy="25"   rx="3" ry="6" fill="#f5d040" stroke="#c8a820" stroke-width="0.6"/>
    <ellipse cx="10.2" cy="20.5" rx="3" ry="6" transform="rotate(240,10.2,20.5)" fill="#f5d040" stroke="#c8a820" stroke-width="0.6"/>
    <ellipse cx="10.2" cy="11.5" rx="3" ry="6" transform="rotate(300,10.2,11.5)" fill="#f5d040" stroke="#c8a820" stroke-width="0.6"/>
    <circle cx="18" cy="16" r="5.5" fill="#f0a820" stroke="#c07818" stroke-width="1.2"/>
    <circle cx="18" cy="16" r="3.5" fill="#f5c030"/>`),

  daisy: _svg(_SL, `
    <ellipse cx="18"   cy="8"    rx="2.2" ry="5" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="22.7" cy="9.5"  rx="2.2" ry="5" transform="rotate(36,22.7,9.5)"   fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="25.6" cy="13.5" rx="2.2" ry="5" transform="rotate(72,25.6,13.5)"  fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="25.6" cy="18.5" rx="2.2" ry="5" transform="rotate(108,25.6,18.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="22.7" cy="22.5" rx="2.2" ry="5" transform="rotate(144,22.7,22.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="18"   cy="24"   rx="2.2" ry="5" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="13.3" cy="22.5" rx="2.2" ry="5" transform="rotate(216,13.3,22.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="10.4" cy="18.5" rx="2.2" ry="5" transform="rotate(252,10.4,18.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="10.4" cy="13.5" rx="2.2" ry="5" transform="rotate(288,10.4,13.5)" fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <ellipse cx="13.3" cy="9.5"  rx="2.2" ry="5" transform="rotate(324,13.3,9.5)"  fill="white" stroke="#c8c0b0" stroke-width="0.5"/>
    <circle cx="18" cy="16" r="5" fill="#f5cc20" stroke="#c8a010" stroke-width="0.8"/>`),

  sweet_pea: _svg(_SR, `
    <path d="M18,8  C10,7  7,13  8,18 C9,22 13,24 18,25 C23,24 27,22 28,18 C29,13 26,7 18,8 Z" fill="#c080b8" stroke="#9858a0" stroke-width="0.8"/>
    <path d="M18,10 C13,10 11,14 12,17 C13,20 15,22 18,22 C21,22 23,20 24,17 C25,14 23,10 18,10 Z" fill="#d090c8" stroke="#9858a0" stroke-width="0.5"/>
    <path d="M13,22 C10,26 11,31 14,30 C15,27 14,24 13,22" fill="#b870a8" stroke="#9858a0" stroke-width="0.6"/>
    <path d="M23,22 C26,26 25,31 22,30 C21,27 22,24 23,22" fill="#b870a8" stroke="#9858a0" stroke-width="0.6"/>
    <circle cx="18" cy="16" r="2.5" fill="#f0e0f0"/>`),

  hawthorn: _svg(_SL, `
    <path d="M18,28 C14,24 10,20 12,16 C14,18 16,22 18,28" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.4"/>
    <path d="M18,28 C22,24 26,20 24,16 C22,18 20,22 18,28" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.4"/>
    <circle cx="18" cy="12" r="5"   fill="#d04848" stroke="#a03030" stroke-width="0.8"/>
    <circle cx="10" cy="16" r="4.5" fill="#c83838" stroke="#a03030" stroke-width="0.7"/>
    <circle cx="26" cy="16" r="4.5" fill="#c83838" stroke="#a03030" stroke-width="0.7"/>
    <circle cx="13" cy="22" r="4"   fill="#d04848" stroke="#a03030" stroke-width="0.7"/>
    <circle cx="23" cy="22" r="4"   fill="#c83838" stroke="#a03030" stroke-width="0.7"/>
    <circle cx="18" cy="12" r="1.5" fill="#f5e040"/>
    <circle cx="10" cy="16" r="1.3" fill="#f5e040"/>
    <circle cx="26" cy="16" r="1.3" fill="#f5e040"/>
    <circle cx="13" cy="22" r="1.2" fill="#f5e040"/>
    <circle cx="23" cy="22" r="1.2" fill="#f5e040"/>`),

  lily_valley: _svg(`<line x1="18" y1="58" x2="18" y2="22" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,40 C8,33 6,24 10,18  C12,23 15,32 18,40" fill="#5a9055" stroke="#3d6e3a" stroke-width="0.4"/>
    <path d="M18,40 C28,33 30,24 26,18 C24,23 21,32 18,40" fill="#4a8047" stroke="#3d6e3a" stroke-width="0.4"/>`, `
    <path d="M18,22 C20,16 24,12 26,8" stroke="#4a7c4e" stroke-width="1.2" fill="none"/>
    <path d="M18,22 C16,16 12,12 10,8" stroke="#4a7c4e" stroke-width="1"   fill="none"/>
    <path d="M24,10 C21,9  20,13 21,16 C22,18 25,18 26,15 C27,12 26,9  24,10 Z" fill="white" stroke="#90b090" stroke-width="0.7"/>
    <path d="M20,17 C17,16 16,20 17,23 C18,25 21,25 22,22 C23,19 22,16 20,17 Z" fill="white" stroke="#90b090" stroke-width="0.7"/>
    <path d="M11,9  C8,8   7,12  8,15  C9,17  12,17 13,14 C14,11 13,8  11,9  Z" fill="white" stroke="#90b090" stroke-width="0.7"/>
    <path d="M14,17 C11,16 10,20 11,23 C12,25 15,25 16,22 C17,19 16,16 14,17 Z" fill="white" stroke="#90b090" stroke-width="0.7"/>`),

  rose: _svg(_SL, `
    <path d="M12,28 C10,26 9,22 12,20  C13,23 12,26 12,28" fill="#4a8047"/>
    <path d="M24,28 C26,26 27,22 24,20 C23,23 24,26 24,28" fill="#4a8047"/>
    <path d="M18,28 C17,25 16,22 17,20 C18,20 20,20 19,22 C19,25 18,27 18,28" fill="#4a8047"/>
    <path d="M18,26 C9,24 6,18 8,12 C11,8 15,7 18,8 C21,7 25,8 28,12 C30,18 27,24 18,26 Z" fill="#c84040" stroke="#a02828" stroke-width="0.8"/>
    <path d="M18,23 C12,22 10,17 12,13 C14,10 16,9 18,10 C20,9 22,10 24,13 C26,17 24,22 18,23 Z" fill="#d85050" stroke="#a02828" stroke-width="0.7"/>
    <path d="M18,20 C14,19 13,16 15,13 C16,11 17,10 18,11 C19,10 20,11 21,13 C23,16 22,19 18,20 Z" fill="#e06060" stroke="#a02828" stroke-width="0.6"/>
    <path d="M18,18 C16,17 16,15 17,13 C17,15 18,17 18,18 Z" fill="#f08080"/>
    <path d="M18,18 C20,17 20,15 19,13 C19,15 18,17 18,18 Z" fill="#e87070"/>`),

  honeysuckle: _svg(_SL, `
    <path d="M18,28 C22,24 26,20 26,14" stroke="#4a7c4e" stroke-width="1.2" fill="none"/>
    <path d="M18,28 C14,22 10,18 10,12" stroke="#4a7c4e" stroke-width="1"   fill="none"/>
    <path d="M22,14 C20,8 18,7 16,9 C14,11 14,16 18,18 C20,17 22,16 22,14 Z" fill="#f0d0a8" stroke="#c09870" stroke-width="0.8"/>
    <path d="M22,14 C24,12 26,12 26,14 C26,16 24,18 22,18 C22,16 22,15 22,14" fill="#f8e0b8" stroke="#c09870" stroke-width="0.6"/>
    <path d="M11,12 C9,6 7,5 5,7 C3,9 3,14 7,16 C9,15 11,14 11,12 Z" fill="#f0d8b8" stroke="#c09870" stroke-width="0.7"/>
    <path d="M11,12 C13,10 15,10 15,12 C15,14 13,16 11,16 C11,14 11,13 11,12" fill="#f8e0c0" stroke="#c09870" stroke-width="0.5"/>
    <line x1="18" y1="14" x2="26" y2="10" stroke="#d0a060" stroke-width="0.7"/>
    <line x1="18" y1="14" x2="27" y2="12" stroke="#d0a060" stroke-width="0.6"/>`),

  larkspur: _svg(_ST, `
    <path d="M18,26 C13,24 10,20 12,16 C13,18 16,22 18,26" fill="#6080c8" stroke="#4060a8" stroke-width="0.6"/>
    <path d="M18,26 C23,24 26,20 24,16 C23,18 20,22 18,26" fill="#5070b8" stroke="#4060a8" stroke-width="0.6"/>
    <path d="M18,26 C16,29 14,30 13,28 C14,26 16,26 18,26" fill="#7090d0" stroke="#4060a8" stroke-width="0.5"/>
    <path d="M18,18 C13,16 10,12 12,8  C13,10 16,14 18,18" fill="#6080c8" stroke="#4060a8" stroke-width="0.6"/>
    <path d="M18,18 C23,16 26,12 24,8  C23,10 20,14 18,18" fill="#5070b8" stroke="#4060a8" stroke-width="0.6"/>
    <path d="M18,18 C16,21 14,22 13,20 C14,18 16,18 18,18" fill="#7090d0" stroke="#4060a8" stroke-width="0.5"/>
    <ellipse cx="18" cy="9"  rx="3.5" ry="4.5" fill="#7090d0" stroke="#5070b0" stroke-width="0.8"/>
    <ellipse cx="18" cy="5"  rx="2"   ry="3"   fill="#9ab0e0"/>`),

  water_lily: _svg(_SL, `
    <ellipse cx="18"   cy="7"    rx="3" ry="6.5" fill="#a090d0" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="24.2" cy="9.2"  rx="3" ry="6.5" transform="rotate(45,24.2,9.2)"   fill="#9888c8" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="27"   cy="16"   rx="3" ry="6.5" transform="rotate(90,27,16)"       fill="#a090d0" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="24.2" cy="22.8" rx="3" ry="6.5" transform="rotate(135,24.2,22.8)" fill="#9888c8" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="18"   cy="25"   rx="3" ry="6.5" fill="#a090d0" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="11.8" cy="22.8" rx="3" ry="6.5" transform="rotate(225,11.8,22.8)" fill="#9888c8" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="9"    cy="16"   rx="3" ry="6.5" transform="rotate(270,9,16)"       fill="#a090d0" stroke="#7868b0" stroke-width="0.6"/>
    <ellipse cx="11.8" cy="9.2"  rx="3" ry="6.5" transform="rotate(315,11.8,9.2)"  fill="#9888c8" stroke="#7868b0" stroke-width="0.6"/>
    <circle cx="18" cy="16" r="5" fill="#f5e080" stroke="#c8b030" stroke-width="0.8"/>
    <circle cx="18" cy="16" r="3" fill="#f8f080"/>`),

  poppy: _svg(`<line x1="18" y1="58" x2="18" y2="28" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,43 C9,36 8,29 13,26 C15,30 17,37 18,43" fill="#5a9055"/>
    <path d="M14,28 C14,24 16,22 18,22 C20,22 22,24 22,28" fill="#4a8047"/>`, `
    <ellipse cx="18" cy="8"  rx="7"   ry="8.5" fill="#d03830" stroke="#a02020" stroke-width="0.8"/>
    <ellipse cx="26" cy="16" rx="8.5" ry="7"   fill="#d03830" stroke="#a02020" stroke-width="0.8"/>
    <ellipse cx="18" cy="24" rx="7"   ry="8.5" fill="#d03830" stroke="#a02020" stroke-width="0.8"/>
    <ellipse cx="10" cy="16" rx="8.5" ry="7"   fill="#d03830" stroke="#a02020" stroke-width="0.8"/>
    <circle cx="18" cy="16" r="5.5" fill="#1e1020"/>
    <circle cx="18" cy="13" r="0.8" fill="#f5e030"/>
    <circle cx="21" cy="14" r="0.8" fill="#f5e030"/>
    <circle cx="22" cy="17" r="0.8" fill="#f5e030"/>
    <circle cx="21" cy="20" r="0.8" fill="#f5e030"/>
    <circle cx="18" cy="21" r="0.8" fill="#f5e030"/>
    <circle cx="15" cy="20" r="0.8" fill="#f5e030"/>
    <circle cx="14" cy="17" r="0.8" fill="#f5e030"/>
    <circle cx="15" cy="14" r="0.8" fill="#f5e030"/>`),

  gladiolus: _svg(_ST, `
    <path d="M18,28 C11,25 8,20 10,16 C12,18 15,23 18,28" fill="#d06040" stroke="#a04028" stroke-width="0.8"/>
    <path d="M18,28 C25,25 28,20 26,16 C24,18 21,23 18,28" fill="#c05030" stroke="#a04028" stroke-width="0.8"/>
    <path d="M18,28 C16,32 14,34 12,32 C13,30 15,29 18,28" fill="#d06040"/>
    <path d="M18,28 C20,32 22,34 24,32 C23,30 21,29 18,28" fill="#d06040"/>
    <path d="M18,20 C11,17  9,12 11,8  C13,10 16,15 18,20" fill="#d06040" stroke="#a04028" stroke-width="0.7"/>
    <path d="M18,20 C25,17 27,12 25,8  C23,10 20,15 18,20" fill="#c05030" stroke="#a04028" stroke-width="0.7"/>
    <path d="M15,8 C15,4 17,3 18,3 C19,3 21,4 21,8 C20,10 16,10 15,8 Z" fill="#e07050" stroke="#a04028" stroke-width="0.7"/>`),

  morning_glory: _svg(_SR, `
    <path d="M18,26 C8,22  4,14  6,8  C8,5  12,4 16,6  C14,8 12,14 18,26 Z" fill="#7060c0" stroke="#5040a0" stroke-width="0.8"/>
    <path d="M18,26 C28,22 32,14 30,8 C28,5 24,4 20,6 C22,8 24,14 18,26 Z" fill="#6050b0" stroke="#5040a0" stroke-width="0.8"/>
    <path d="M18,26 C12,28  6,26  4,22 C6,20  12,22 18,26 Z" fill="#7060c0" stroke="#5040a0" stroke-width="0.7"/>
    <path d="M18,26 C24,28 30,26 32,22 C30,20 24,22 18,26 Z" fill="#6050b0" stroke="#5040a0" stroke-width="0.7"/>
    <path d="M18,26 C16,30 14,32 12,30 C13,28 15,27 18,26" fill="#7868c8" stroke="#5040a0" stroke-width="0.5"/>
    <path d="M18,26 C17,20 16,14 17,8  C18,12 18,20 18,26" fill="white" opacity="0.3"/>
    <path d="M18,26 C14,22 10,18  8,14 C11,16 15,20 18,26" fill="white" opacity="0.2"/>
    <path d="M18,26 C22,22 26,18 28,14 C25,16 21,20 18,26" fill="white" opacity="0.2"/>
    <circle cx="18" cy="24" r="3.5" fill="white" opacity="0.85"/>`),

  aster: _svg(_SL, `
    <ellipse cx="18"   cy="7.5"  rx="2" ry="5.5" fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="20.9" cy="8.3"  rx="2" ry="5.5" transform="rotate(25.7,20.9,8.3)"   fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="23.3" cy="10.5" rx="2" ry="5.5" transform="rotate(51.4,23.3,10.5)"  fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="24.5" cy="13.7" rx="2" ry="5.5" transform="rotate(77.1,24.5,13.7)"  fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="24.3" cy="17.2" rx="2" ry="5.5" transform="rotate(102.9,24.3,17.2)" fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="22.6" cy="20.4" rx="2" ry="5.5" transform="rotate(128.6,22.6,20.4)" fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="20"   cy="22.6" rx="2" ry="5.5" transform="rotate(154.3,20,22.6)"   fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="18"   cy="24.5" rx="2" ry="5.5" fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="16"   cy="22.6" rx="2" ry="5.5" transform="rotate(205.7,16,22.6)"   fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="13.4" cy="20.4" rx="2" ry="5.5" transform="rotate(231.4,13.4,20.4)" fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="11.7" cy="17.2" rx="2" ry="5.5" transform="rotate(257.1,11.7,17.2)" fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="11.5" cy="13.7" rx="2" ry="5.5" transform="rotate(282.9,11.5,13.7)" fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="12.7" cy="10.5" rx="2" ry="5.5" transform="rotate(308.6,12.7,10.5)" fill="#9080d0" stroke="#7060b0" stroke-width="0.5"/>
    <ellipse cx="15.1" cy="8.3"  rx="2" ry="5.5" transform="rotate(334.3,15.1,8.3)"  fill="#8878c8" stroke="#7060b0" stroke-width="0.5"/>
    <circle cx="18" cy="16" r="4.5" fill="#f5cc20" stroke="#c8a010" stroke-width="0.8"/>`),

  cosmos: _svg(_SL, `
    <ellipse cx="18"   cy="8"    rx="3" ry="6" fill="#e888b8" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="23.7" cy="10.3" rx="3" ry="6" transform="rotate(45,23.7,10.3)"  fill="#e080b0" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="26"   cy="16"   rx="3" ry="6" transform="rotate(90,26,16)"       fill="#e888b8" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="23.7" cy="21.7" rx="3" ry="6" transform="rotate(135,23.7,21.7)" fill="#e080b0" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="18"   cy="24"   rx="3" ry="6" fill="#e888b8" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="12.3" cy="21.7" rx="3" ry="6" transform="rotate(225,12.3,21.7)" fill="#e080b0" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="10"   cy="16"   rx="3" ry="6" transform="rotate(270,10,16)"      fill="#e888b8" stroke="#c06090" stroke-width="0.6"/>
    <ellipse cx="12.3" cy="10.3" rx="3" ry="6" transform="rotate(315,12.3,10.3)" fill="#e080b0" stroke="#c06090" stroke-width="0.6"/>
    <circle cx="18" cy="16" r="4" fill="#f5cc20" stroke="#c8a010" stroke-width="0.8"/>`),

  marigold: _svg(_SL, `
    <ellipse cx="18"   cy="7"    rx="3.2" ry="5.5" fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="22.8" cy="8.5"  rx="3.2" ry="5.5" transform="rotate(36,22.8,8.5)"   fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="25.7" cy="12.5" rx="3.2" ry="5.5" transform="rotate(72,25.7,12.5)"  fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="25.7" cy="17.5" rx="3.2" ry="5.5" transform="rotate(108,25.7,17.5)" fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="22.8" cy="21.5" rx="3.2" ry="5.5" transform="rotate(144,22.8,21.5)" fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="18"   cy="23"   rx="3.2" ry="5.5" fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="13.2" cy="21.5" rx="3.2" ry="5.5" transform="rotate(216,13.2,21.5)" fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="10.3" cy="17.5" rx="3.2" ry="5.5" transform="rotate(252,10.3,17.5)" fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="10.3" cy="12.5" rx="3.2" ry="5.5" transform="rotate(288,10.3,12.5)" fill="#e88030" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="13.2" cy="8.5"  rx="3.2" ry="5.5" transform="rotate(324,13.2,8.5)"  fill="#f09040" stroke="#b85820" stroke-width="0.6"/>
    <ellipse cx="18"   cy="9"    rx="2.5" ry="4"   fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="21"   cy="10.5" rx="2.5" ry="4"   transform="rotate(36,21,10.5)"    fill="#e88030" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="23"   cy="14"   rx="2.5" ry="4"   transform="rotate(72,23,14)"      fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="23"   cy="18"   rx="2.5" ry="4"   transform="rotate(108,23,18)"     fill="#e88030" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="21"   cy="21.5" rx="2.5" ry="4"   transform="rotate(144,21,21.5)"   fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="15"   cy="21.5" rx="2.5" ry="4"   transform="rotate(216,15,21.5)"   fill="#e88030" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="13"   cy="18"   rx="2.5" ry="4"   transform="rotate(252,13,18)"     fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="13"   cy="14"   rx="2.5" ry="4"   transform="rotate(288,13,14)"     fill="#e88030" stroke="#b85820" stroke-width="0.5"/>
    <ellipse cx="15"   cy="10.5" rx="2.5" ry="4"   transform="rotate(324,15,10.5)"   fill="#f09040" stroke="#b85820" stroke-width="0.5"/>
    <circle cx="18" cy="16" r="4" fill="#f5c020" stroke="#c89010" stroke-width="0.7"/>`),

  chrysanthemum: _svg(_SL, `
    <ellipse cx="18"   cy="6"    rx="1.8" ry="7" fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="21.1" cy="6.7"  rx="1.8" ry="7" transform="rotate(20,21.1,6.7)"   fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="23.8" cy="8.6"  rx="1.8" ry="7" transform="rotate(40,23.8,8.6)"   fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="25.6" cy="11.6" rx="1.8" ry="7" transform="rotate(60,25.6,11.6)"  fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="26.3" cy="15"   rx="1.8" ry="7" transform="rotate(80,26.3,15)"    fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="25.8" cy="18.4" rx="1.8" ry="7" transform="rotate(100,25.8,18.4)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="24.1" cy="21.5" rx="1.8" ry="7" transform="rotate(120,24.1,21.5)" fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="21.4" cy="23.9" rx="1.8" ry="7" transform="rotate(140,21.4,23.9)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="18"   cy="25"   rx="1.8" ry="7" fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="14.6" cy="23.9" rx="1.8" ry="7" transform="rotate(220,14.6,23.9)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="11.9" cy="21.5" rx="1.8" ry="7" transform="rotate(240,11.9,21.5)" fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="10.2" cy="18.4" rx="1.8" ry="7" transform="rotate(260,10.2,18.4)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="9.7"  cy="15"   rx="1.8" ry="7" transform="rotate(280,9.7,15)"    fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="10.4" cy="11.6" rx="1.8" ry="7" transform="rotate(300,10.4,11.6)" fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="12.2" cy="8.6"  rx="1.8" ry="7" transform="rotate(320,12.2,8.6)"  fill="#e01878" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="14.9" cy="6.7"  rx="1.8" ry="7" transform="rotate(340,14.9,6.7)"  fill="#f02088" stroke="#a01058" stroke-width="0.5"/>
    <ellipse cx="18"   cy="9"    rx="1.5" ry="6" fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="21.4" cy="9.9"  rx="1.5" ry="6" transform="rotate(30,21.4,9.9)"   fill="#e01878" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="23.8" cy="13"   rx="1.5" ry="6" transform="rotate(60,23.8,13)"    fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="23.8" cy="17"   rx="1.5" ry="6" transform="rotate(90,23.8,17)"    fill="#e01878" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="21.4" cy="21"   rx="1.5" ry="6" transform="rotate(120,21.4,21)"   fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="18"   cy="23"   rx="1.5" ry="6" fill="#e01878" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="14.6" cy="21"   rx="1.5" ry="6" transform="rotate(240,14.6,21)"   fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="12.2" cy="17"   rx="1.5" ry="6" transform="rotate(270,12.2,17)"   fill="#e01878" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="12.2" cy="13"   rx="1.5" ry="6" transform="rotate(300,12.2,13)"   fill="#f02888" stroke="#a01058" stroke-width="0.4"/>
    <ellipse cx="14.6" cy="9.9"  rx="1.5" ry="6" transform="rotate(330,14.6,9.9)"  fill="#e01878" stroke="#a01058" stroke-width="0.4"/>`),

  peony: _svg(_SL, `
    <path d="M9,28  C9,22 12,17 18,14 C24,17 27,22 27,28" fill="#d88098" stroke="#c06080" stroke-width="0.6"/>
    <path d="M18,26 C10,24 7,18 9,12 C12,8 15,7 18,8 C21,7 24,8 27,12 C29,18 26,24 18,26 Z" fill="#e8a8b8" stroke="#c07090" stroke-width="0.8"/>
    <path d="M18,23 C12,21 10,17 12,12 C14,9 16,8 18,9 C20,8 22,9 24,12 C26,17 24,21 18,23 Z" fill="#f0b8c8" stroke="#c07090" stroke-width="0.7"/>
    <path d="M18,20 C14,19 12,16 13,12 C14,10 16,9 18,10 C20,9 22,10 23,12 C24,16 22,19 18,20 Z" fill="#f8c8d4" stroke="#c07090" stroke-width="0.6"/>
    <path d="M18,18 C15,17 14,15 15,12 C16,10 17,10 18,11 C19,10 20,10 21,12 C22,15 21,17 18,18 Z" fill="#fcd8e0" stroke="#c07090" stroke-width="0.5"/>
    <path d="M18,16 C16,15 17,13 18,12 C19,13 20,15 18,16 Z" fill="#ffe8f0"/>`),

  narcissus: _svg(_SL, `
    <ellipse cx="18"   cy="7"    rx="2.8" ry="5.5" fill="white"   stroke="#c0b890" stroke-width="0.6"/>
    <ellipse cx="25.8" cy="11.5" rx="2.8" ry="5.5" transform="rotate(60,25.8,11.5)"  fill="#f5f0e0" stroke="#c0b890" stroke-width="0.6"/>
    <ellipse cx="25.8" cy="20.5" rx="2.8" ry="5.5" transform="rotate(120,25.8,20.5)" fill="white"   stroke="#c0b890" stroke-width="0.6"/>
    <ellipse cx="18"   cy="25"   rx="2.8" ry="5.5" fill="#f5f0e0" stroke="#c0b890" stroke-width="0.6"/>
    <ellipse cx="10.2" cy="20.5" rx="2.8" ry="5.5" transform="rotate(240,10.2,20.5)" fill="white"   stroke="#c0b890" stroke-width="0.6"/>
    <ellipse cx="10.2" cy="11.5" rx="2.8" ry="5.5" transform="rotate(300,10.2,11.5)" fill="#f5f0e0" stroke="#c0b890" stroke-width="0.6"/>
    <circle cx="18" cy="16" r="5.5" fill="#f0a820" stroke="#c07810" stroke-width="1.2"/>
    <circle cx="18" cy="16" r="4"   fill="#f5c030"/>
    <circle cx="18" cy="16" r="2.5" fill="#f8d050"/>`),

  holly: `<svg viewBox="0 0 36 60" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="58" x2="18" y2="36" stroke="#3d6e3a" stroke-width="1.4"/>
    <path d="M18,36 C14,29 10,23 8,16"  stroke="#3d6e3a" stroke-width="1.2" fill="none"/>
    <path d="M18,36 C22,29 26,23 28,16" stroke="#3d6e3a" stroke-width="1"   fill="none"/>
    <path d="M8,16  C4,14  3,10  5,7  C7,8  8,10 8,13 C9,10  11,8  13,9  C13,12 11,14 8,16  Z" fill="#2a7828" stroke="#1a5020" stroke-width="0.7"/>
    <path d="M8,16  C5,19  4,23  6,25 C8,23  9,20 8,16  Z" fill="#2a7828" stroke="#1a5020" stroke-width="0.6"/>
    <path d="M28,15 C32,13 33,9  31,6 C29,7 28,9 28,12 C27,9  25,7  23,8  C23,11 25,13 28,15 Z" fill="#348030" stroke="#1a5020" stroke-width="0.7"/>
    <path d="M28,15 C31,18 32,22 30,24 C28,22 27,19 28,15 Z" fill="#348030" stroke="#1a5020" stroke-width="0.6"/>
    <circle cx="16" cy="26" r="4"   fill="#d03030" stroke="#901818" stroke-width="0.8"/>
    <circle cx="21" cy="24" r="4"   fill="#c82828" stroke="#901818" stroke-width="0.8"/>
    <circle cx="18" cy="30" r="3.5" fill="#d83030" stroke="#901818" stroke-width="0.8"/>
    <circle cx="16" cy="26" r="1.2" fill="#e84040" opacity="0.5"/>
    <circle cx="21" cy="24" r="1.2" fill="#e84040" opacity="0.5"/>
    <circle cx="18" cy="30" r="1"   fill="#e84040" opacity="0.5"/>
  </svg>`,
};

const FLOWER_LIST = [
  'carnation','snowdrop','iris','violet','jonquil','daffodil',
  'daisy','sweet_pea','hawthorn','lily_valley','rose','honeysuckle',
  'larkspur','water_lily','poppy','gladiolus','morning_glory','aster',
  'cosmos','marigold','chrysanthemum','peony','narcissus','holly',
];

const FLOWER_MINI_COLOR = {
  carnation:'#e8907a', snowdrop:'#eef7ee', iris:'#8272be', violet:'#7868b0',
  jonquil:'#f5f0e0', daffodil:'#f5d040', daisy:'#f0f0e8', sweet_pea:'#c080b8',
  hawthorn:'#d04848', lily_valley:'#f0f5f0', rose:'#c84040', honeysuckle:'#f0d0b0',
  larkspur:'#6080c8', water_lily:'#a090d0', poppy:'#d03830', gladiolus:'#d06040',
  morning_glory:'#7060c0', aster:'#9080d0', cosmos:'#e080b8', marigold:'#e88030',
  chrysanthemum:'#e01878', peony:'#e8a8b8', narcissus:'#f5f0e0', holly:'#2a7828',
};

function render_vase_flowers(vase_flowers) {
  if (!vase_flowers || vase_flowers.length === 0) return '';
  const n = vase_flowers.length;
  const max_h = 68;
  return vase_flowers.map((id, i) => {
    const x   = (24 + (i + 1) * 32 / (n + 1)).toFixed(1);
    const h   = Math.round(max_h * Math.sin(Math.PI * (i + 1) / (n + 1)));
    const ty  = 4 - h;
    const col = FLOWER_MINI_COLOR[id] || '#e0a0b0';
    return `<line x1="${x}" y1="4" x2="${x}" y2="${ty + 4}" stroke="#4a7c4e" stroke-width="1.2"/>
<circle cx="${x}" cy="${ty}" r="4.2" fill="${col}" stroke="rgba(0,0,0,0.18)" stroke-width="0.7"/>`;
  }).join('\n');
}

function render_flower_picker(user_id, wish_balance, vase_flowers) {
  const count = (vase_flowers || []).length;
  const locked = wish_balance === 0 || count >= wish_balance;
  return `<div class="flower_picker" data-user-id="${user_id}">
    ${FLOWER_LIST.map(id => `<button class="flower_btn${locked ? ' flower_btn_locked' : ''}"
      data-action="pick_flower" data-user-id="${user_id}" data-flower-id="${id}"
      ${locked ? 'disabled' : ''}>${FLOWER_SVG[id]}</button>`).join('')}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════

function render_crystal_glass(user_id, wish_balance, vase_flowers) {
  const water_pct = Math.min(100, (wish_balance / total_wishes) * 100);
  // Interior fills from y=4 (rim) to y=100 (base), height=96
  const water_y = Math.round(4 + 96 * (1 - water_pct / 100));
  const cid = `vc_${user_id}`;
  const wg  = `wg_${user_id}`;
  const bg  = `bg_${user_id}`;
  const rg  = `rg_${user_id}`;
  // Stepped cylinder: narrow neck (x=24-56) on top of wide body (x=8-72), flat shoulder ledge at y=45
  const vp = "M 24,4 L 56,4 L 56,45 L 72,45 L 72,97 C 72,101 8,101 8,97 L 8,45 L 24,45 Z";

  // 15 uniform vertical ribs — clip-path auto hides those outside the narrow neck
  const rib_xs  = [4,9,14,19,24,29,34,39,44,49,54,59,64,69,74,76];
  const val_xs  = [6.5,11.5,16.5,21.5,26.5,31.5,36.5,41.5,46.5,51.5,56.5,61.5,66.5,71.5,75];
  const ribs    = rib_xs.map(x => `<line x1="${x}" y1="0" x2="${x}" y2="104" stroke="rgba(255,255,255,0.07)" stroke-width="1.5"/>`).join("");
  const valleys = val_xs.map(x  => `<line x1="${x}" y1="0" x2="${x}" y2="104" stroke="rgba(15,45,80,0.04)"  stroke-width="1"/>`).join("");

  return `
    <div class="crystal_vase" aria-hidden="true">
      <svg class="vase_svg" viewBox="0 -80 80 184" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="${cid}"><path d="${vp}"/></clipPath>
          <linearGradient id="${wg}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="rgba(155,218,245,0.64)"/>
            <stop offset="100%" stop-color="rgba(80,155,208,0.84)"/>
          </linearGradient>
          <linearGradient id="${bg}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stop-color="rgba(255,255,255,0.60)"/>
            <stop offset="14%"  stop-color="rgba(255,255,255,0.14)"/>
            <stop offset="48%"  stop-color="rgba(255,255,255,0.01)"/>
            <stop offset="82%"  stop-color="rgba(10,40,75,0.08)"/>
            <stop offset="100%" stop-color="rgba(10,40,75,0.24)"/>
          </linearGradient>
          <radialGradient id="${rg}" cx="28%" cy="15%" r="65%">
            <stop offset="0%"   stop-color="rgba(255,255,255,0.24)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
          </radialGradient>
        </defs>
        <!-- Water fill -->
        <rect clip-path="url(#${cid})" x="0" y="${water_y}" width="80" height="104" fill="url(#${wg})"/>
        <!-- Water shimmer -->
        <rect clip-path="url(#${cid})" x="-22" y="${water_y}" width="18" height="104" fill="rgba(255,255,255,0.24)">
          <animateTransform attributeName="transform" type="translate" from="0 0" to="106 0" dur="3.2s" repeatCount="indefinite"/>
        </rect>
        <!-- Glass body -->
        <path d="${vp}" fill="rgba(140,178,216,0.26)" stroke="rgba(255,255,255,0.42)" stroke-width="1.4"/>
        <!-- Vertical ribs -->
        <g clip-path="url(#${cid})" fill="none">${ribs}${valleys}</g>
        <!-- 3D depth gradient -->
        <rect clip-path="url(#${cid})" x="0" y="0" width="80" height="104" fill="url(#${bg})"/>
        <!-- Radial light source — upper-left highlight -->
        <rect clip-path="url(#${cid})" x="0" y="0" width="80" height="104" fill="url(#${rg})"/>
        <!-- Shoulder ring — top rim of the wide body cylinder -->
        <ellipse cx="40" cy="45" rx="32" ry="5"
          fill="rgba(195,222,242,0.25)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"/>
        <!-- Inner ledge — neck base visible inside body -->
        <ellipse clip-path="url(#${cid})" cx="40" cy="45" rx="16" ry="2.5"
          fill="rgba(195,222,242,0.18)" stroke="rgba(255,255,255,0.32)" stroke-width="1.0"/>
        <!-- Neck opening rim -->
        <ellipse cx="40" cy="4" rx="16" ry="3"
          fill="rgba(195,222,242,0.38)" stroke="rgba(255,255,255,0.60)" stroke-width="1.4"/>
        <!-- Left edge highlights -->
        <polygon clip-path="url(#${cid})" points="24,4 30,4 30,45 24,45"   fill="rgba(255,255,255,0.42)"/>
        <polygon clip-path="url(#${cid})" points="8,45 14,45 14,97 8,97"   fill="rgba(255,255,255,0.38)"/>
        <!-- Right edge shadows -->
        <polygon clip-path="url(#${cid})" points="50,4 56,4 56,45 50,45"   fill="rgba(10,40,75,0.18)"/>
        <polygon clip-path="url(#${cid})" points="66,45 72,45 72,97 66,97" fill="rgba(10,40,75,0.20)"/>
        <!-- Flowers emerging from vase neck -->
        ${render_vase_flowers(vase_flowers || [])}
      </svg>
    </div>
  `;
}

function render_pool_card(state) {
  const max_pool = 30;
  const water_level = Math.min(100, (state.pool_balance / max_pool) * 100);

  return `
    <article class="summary_card summary_card_pool">
      <p class="summary_label">Wish Pool</p>
      <div class="decanter" aria-hidden="true">
        <div class="stopper_wrap">
          <span class="cap_flake cf1">✦</span>
          <span class="cap_flake cf3">✦</span>
          <span class="cap_flake cf5">✦</span>
          <div class="stopper_diamond"></div>
          <svg class='stopper_snowflake' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'>
            <g stroke-linecap='round' fill='none'>
              <g id='snw_arm'>
                <line x1='30' y1='30' x2='30' y2='4'  stroke='rgba(255,255,255,0.92)' stroke-width='2.2'/>
                <line x1='30' y1='9'  x2='21' y2='3'  stroke='rgba(215,235,255,0.85)' stroke-width='1.5'/>
                <line x1='30' y1='9'  x2='39' y2='3'  stroke='rgba(215,235,255,0.85)' stroke-width='1.5'/>
                <line x1='30' y1='15' x2='23' y2='9'  stroke='rgba(210,232,255,0.82)' stroke-width='1.4'/>
                <line x1='30' y1='15' x2='37' y2='9'  stroke='rgba(210,232,255,0.82)' stroke-width='1.4'/>
                <line x1='30' y1='21' x2='24' y2='16' stroke='rgba(205,228,255,0.78)' stroke-width='1.2'/>
                <line x1='30' y1='21' x2='36' y2='16' stroke='rgba(205,228,255,0.78)' stroke-width='1.2'/>
              </g>
              <use href='#snw_arm' transform='rotate(60, 30, 30)'/>
              <use href='#snw_arm' transform='rotate(120, 30, 30)'/>
              <use href='#snw_arm' transform='rotate(180, 30, 30)'/>
              <use href='#snw_arm' transform='rotate(240, 30, 30)'/>
              <use href='#snw_arm' transform='rotate(300, 30, 30)'/>
              <circle cx='30' cy='30' r='3.2' fill='rgba(220,240,255,0.90)' stroke='rgba(255,255,255,0.95)' stroke-width='1.5'/>
            </g>
          </svg>
        </div>
        <div class="stopper_base"></div>
        <div class="decanter_neck"></div>
        <div class="decanter_body_wrap">
          <div class="decanter_body_inner">
            <div class="decanter_water" style="height: ${water_level}%;"></div>
            <div class="decanter_snowflakes">
              <span class="ds1">❄</span>
              <span class="ds2">✦</span>
              <span class="ds3">❄</span>
              <span class="ds4">✦</span>
              <span class="ds5">❄</span>
            </div>
            <div class="decanter_shine"></div>
          </div>
        </div>
        <div class="decanter_base"></div>
        <div class="pool_sparkles">
          <span class="sparkle s1">✨</span>
          <span class="sparkle s2">✨</span>
          <span class="sparkle s3">✨</span>
          <span class="sparkle s4">✨</span>
          <span class="sparkle s5">✨</span>
        </div>
      </div>
      <div class="summary_value">${state.pool_balance}</div>
    </article>
  `;
}

function render_balance_actions(current_user, other_user, state) {
  const show_message = state.message_user_id === current_user.user_id && state.ui_message;

  return `
    <div class="balance_actions">
      <button
        class="mini_action_button"
        type="button"
        data-action="wish_action"
        data-action-type="return_to_pool"
        data-user-id="${current_user.user_id}"
        data-target-id="pool"
      >
        Return to Pool
      </button>
      <button
        class="mini_action_button"
        type="button"
        data-action="wish_action"
        data-action-type="give_to_other"
        data-user-id="${current_user.user_id}"
        data-other-user-id="${other_user.user_id}"
        data-target-id="${other_user.user_id}"
      >
        Give to Other
      </button>
      <button
        class="mini_action_button mini_action_button_secondary"
        type="button"
        data-action="wish_action"
        data-action-type="undo_last_action"
        data-user-id="${current_user.user_id}"
      >
        Undo Last Action
      </button>
    </div>
    ${show_message ? `<p class="balance_message">${state.ui_message}</p>` : ""}
  `;
}

function render_week_label(week_start_date) {
  const week_dates = get_week_dates(week_start_date);
  const start_date = format_display_date(week_dates[0]);
  const end_date = format_display_date(week_dates[6]);

  document.getElementById("week_label").textContent = `Current week: ${start_date} to ${end_date}`;
}

function render_trackers(state) {
  const tracker_container = document.getElementById("tracker_container");
  const week_dates = get_week_dates(state.week_start_date);

  tracker_container.innerHTML = state.users
    .map((user) => `
      <article class="tracker_card">
        <div class="tracker_header">
          <div>
            <h3 class="tracker_title">${user.name}</h3>
            <p class="tracker_meta">Auto-earns 1 wish per habit when the weekly target is reached.</p>
          </div>
          <p class="table_hint">Week starts on Monday: ${format_display_date(state.week_start_date)}</p>
        </div>
        <div class="table_wrap">
          <table>
            <thead>
              <tr>
                <th>habit_name</th>
                ${week_dates.map((date_value) => `<th>${format_day_header(date_value)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${user.habits.map((habit) => render_habit_row(user.user_id, habit, week_dates)).join("")}
            </tbody>
          </table>
        </div>
      </article>
    `)
    .join("");
}

function render_habit_row(user_id, habit, week_dates) {
  const progress_symbols = Array.from({ length: habit.target_per_week }, (_, index) => (
    index < habit.done_count ? habit.icon : "○"
  )).join(" ");

  const day_cells = week_dates
    .map((date_value) => {
      const is_done = Boolean(habit.daily_status[date_value]);

      return `
        <td>
          <button
            class="day_toggle ${is_done ? "is_done" : ""}"
            type="button"
            data_action="toggle_day"
            data-user-id="${user_id}"
            data-habit-id="${habit.habit_id}"
            data-date-value="${date_value}"
            aria-pressed="${is_done}"
            aria-label="Toggle ${habit.display_name} for ${date_value}"
          ></button>
        </td>
      `;
    })
    .join("");

  return `
    <tr>
      <td class="habit_name">
        <span class="habit_title">${habit.display_name}</span>
        <span class="habit_progress">${progress_symbols}</span>
      </td>
      ${day_cells}
    </tr>
  `;
}

function render_actions(state) {
  const actions_container = document.getElementById("actions_container");

  if (actions_container) {
    actions_container.innerHTML = "";
  }
}

async function toggle_habit_day(user_id, habit_id, date_value) {
  console.log("toggle_habit_day called", user_id, habit_id, date_value);
  const state = get_state();
  const user = state.users.find((item) => item.user_id === user_id);

  if (!user) {
    return;
  }

  const habit = user.habits.find((item) => item.habit_id === habit_id);

  if (!habit || !Object.prototype.hasOwnProperty.call(habit.daily_status, date_value)) {
    return;
  }

  habit.daily_status[date_value] = !habit.daily_status[date_value];
  habit.done_count = count_done_days(habit.daily_status);
  const was_claimed = habit.is_reward_claimed;
  sync_reward_status(state, user, habit, state.week_start_date);
  const just_earned = !was_claimed && habit.is_reward_claimed;
  console.log("before save", habit.daily_status, habit.done_count);
  save_state(state);
  render_app();
  if (just_earned) {
    confetti({ particleCount: 80, spread: 75, origin: { y: 0.65 }, colors: ["#cf7b58", "#e8a87c", "#f5d5c0", "#b85c38"] });
  }
  await saveBalancesToFirebase(state, user_id);
  await saveWeeklySnapshot(state);
}

function sync_reward_status(state, user, habit, current_week_start) {
  if (habit.done_count >= habit.target_per_week && habit.is_reward_claimed === false) {
    if (state.pool_balance < habit.reward_value) {
      return;
    }

    habit.is_reward_claimed = true;
    habit.earned_at = get_today_date_string();
    state.pool_balance -= habit.reward_value;
    user.wish_balance += habit.reward_value;
    user.total_earned += habit.reward_value;
    return;
  }

  // Reversal is only allowed for the active week and does not recalculate older data.
  if (
    habit.week_start_date === current_week_start &&
    habit.done_count < habit.target_per_week &&
    habit.is_reward_claimed === true
  ) {
    habit.is_reward_claimed = false;
    habit.earned_at = null;
    user.wish_balance = Math.max(0, user.wish_balance - habit.reward_value);
    user.total_earned = Math.max(0, user.total_earned - habit.reward_value);
    state.pool_balance += habit.reward_value;
  }
}

async function perform_balance_action(action_type, action_button) {
  const state = await getLatestStateFromFirebase();
  const current_user_id = action_button?.dataset.userId;
  const other_user_id = action_button?.dataset.otherUserId;
  const current_user = state.users.find((user) => user.user_id === current_user_id);
  const other_user = state.users.find((user) => user.user_id === other_user_id);

  state.ui_message = "";
  state.message_user_id = null;
  console.log("perform_balance_action", action_type, current_user_id, other_user_id);

  switch (action_type) {
    case "give_to_other":
      give_to_other(current_user, other_user, state);
      break;
    case "return_to_pool":
      return_to_pool(current_user, state);
      break;
    case "undo_last_action":
      undo_last_action(state);
      break;
    default:
      return;
  }

save_state(state);
await saveBalancesToFirebase(state);
render_app();
}

function give_to_other(from_user, to_user, state) {
  if (!from_user || !to_user) {
    return;
  }

  if (from_user.wish_balance < 1) {
    show_no_wishes_message(state, from_user.user_id);
    return;
  }

  from_user.wish_balance -= 1;
  to_user.wish_balance += 1;
  const transfer_icon = from_user.user_id === "s" ? "👸" : "🐷";

  to_user.weekly_transfer_icons.push(transfer_icon);
  state.last_action = {
    type: "give_to_other",
    from_user_id: from_user.user_id,
    to_user_id: to_user.user_id,
    transfer_icon
  };
}

function return_to_pool(user, state) {
  if (!user) {
    return;
  }

  if (user.wish_balance < 1) {
    show_no_wishes_message(state, user.user_id);
    return;
  }

  user.wish_balance -= 1;
  state.pool_balance += 1;
  state.pool_added_this_week += 1;
  state.last_action = {
    type: "return_to_pool",
    user_id: user.user_id
  };
}

function undo_last_action(state) {
  if (!state.last_action) {
    return;
  }

  if (state.last_action.type === "return_to_pool") {
    const user = state.users.find((item) => item.user_id === state.last_action.user_id);

    if (user && state.pool_balance > 0) {
      user.wish_balance += 1;
      state.pool_balance -= 1;
      state.pool_added_this_week = Math.max(0, state.pool_added_this_week - 1);
    }
  }

  if (state.last_action.type === "give_to_other") {
    const from_user = state.users.find((item) => item.user_id === state.last_action.from_user_id);
    const to_user = state.users.find((item) => item.user_id === state.last_action.to_user_id);

    if (from_user && to_user && to_user.wish_balance > 0) {
      from_user.wish_balance += 1;
      to_user.wish_balance -= 1;
      const icon_index = to_user.weekly_transfer_icons.lastIndexOf(state.last_action.transfer_icon);

      if (icon_index > -1) {
        to_user.weekly_transfer_icons.splice(icon_index, 1);
      }
    }
  }

  state.last_action = null;
}

function show_no_wishes_message(state, user_id) {
  state.ui_message = "No wishes available";
  state.message_user_id = user_id;
}

function count_done_days(daily_status) {
  return Object.values(daily_status).filter(Boolean).length;
}

function get_week_start_date(date_input) {
  const date_value = new Date(date_input);
  const day_of_week = date_value.getDay();
  const monday_offset = day_of_week === 0 ? -6 : 1 - day_of_week;

  // Use a midday timestamp to avoid local timezone edge cases around midnight.
  date_value.setHours(12, 0, 0, 0);
  date_value.setDate(date_value.getDate() + monday_offset);
  return format_storage_date(date_value);
}

function get_week_dates(week_start_date) {
  const week_dates = [];
  const start_date = new Date(`${week_start_date}T12:00:00`);

  for (let index = 0; index < 7; index += 1) {
    const next_date = new Date(start_date);
    next_date.setDate(start_date.getDate() + index);
    week_dates.push(format_storage_date(next_date));
  }

  return week_dates;
}

function format_storage_date(date_input) {
  const year = date_input.getFullYear();
  const month = String(date_input.getMonth() + 1).padStart(2, "0");
  const day = String(date_input.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function get_today_date_string() {
  return format_storage_date(new Date());
}

function format_day_header(date_value) {
  const date_object = new Date(`${date_value}T12:00:00`);
  const weekday = date_object.toLocaleDateString("en-US", { weekday: "short" });
  const month = date_object.getMonth() + 1;
  const day = date_object.getDate();

  return `${weekday} (${month}/${day})`;
}

function format_display_date(date_value) {
  const date_object = new Date(`${date_value}T12:00:00`);
  const month = date_object.getMonth() + 1;
  const day = date_object.getDate();
  const year = date_object.getFullYear();

  return `${month}/${day}/${year}`;
}

loadFromFirebase();
subscribeToFirebaseBalances();